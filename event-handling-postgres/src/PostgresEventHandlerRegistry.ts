import { SequenceNumber } from "@dcb-es/event-store"
import { PostgresTransactionManager } from "../src/PostgresTransactionManager"

const POSTGRES_TABLE_NAME = "_event_handler_bookmarks"

export type PostgresHandlerClassConstructor = new (transactionManager: PostgresTransactionManager) => EventHandler
export type PostgresHandlerFunctionConstructor = (transactionManager: PostgresTransactionManager) => EventHandler

export class PostgresEventHandlerRegistry implements EventHandlerRegistry {
    #handlerIds: string[]

    constructor(
        private readonly transactionManager: PostgresTransactionManager,
        public readonly handlers: Record<string, EventHandler>
    ) {
        this.#handlerIds = Object.keys(this.handlers)
    }

    async install() {
        await this.transactionManager.pool.query(
            `CREATE TABLE IF NOT EXISTS "${POSTGRES_TABLE_NAME}" (handler_id text PRIMARY KEY, last_sequence_number bigint)`
        )

        const insertQuery = `
            INSERT INTO ${POSTGRES_TABLE_NAME} (handler_id, last_sequence_number) 
            VALUES ${this.#handlerIds.map((_, index) => `($${index + 1}, 0)`).join(", ")} 
            ON CONFLICT (handler_id) DO NOTHING;`

        await this.transactionManager.pool.query(insertQuery, this.#handlerIds)
    }

    async lockHandlers(): Promise<HandlerCheckPoints> {
        try {
            await this.transactionManager.startTransaction()
            const selectResult = await this.transactionManager.client.query(
                `SELECT handler_id, last_sequence_number FROM ${POSTGRES_TABLE_NAME} WHERE handler_id = ANY($1::text[]) FOR UPDATE NOWAIT;`,
                [Object.keys(this.handlers)]
            )

            const result = this.#handlerIds.reduce((acc, handlerId) => {
                const sequenceNumber = selectResult.rows.find(row => row.handler_id === handlerId)?.last_sequence_number
                if (sequenceNumber !== undefined) {
                    return {
                        ...acc,
                        [handlerId]: SequenceNumber.create(parseInt(sequenceNumber))
                    }
                } else {
                    throw new Error(`Failed to retrieve sequence number for handler ${handlerId}`)
                }
            }, {})

            return result
        } catch (error) {
            await this.rollbackAndRelease()
            if (error.code === "55P03") {
                throw new Error("Could not obtain lock as it is already locked by another process")
            }
            throw error
        }
    }

    async commitAndRelease(locks: HandlerCheckPoints): Promise<void> {
        if (Object.values(locks).some(lock => !lock)) throw new Error("Sequence number is required to commit")
        if (!this.transactionManager.transactionInProgress) throw new Error("No lock obtained, cannot commit")

        try {
            const updateValues = Object.keys(locks)
                .map((_, index) => `($${index * 2 + 1}::text, $${index * 2 + 2}::bigint)`)
                .join(", ")

            const updateParams = Object.entries(locks).flatMap(([handlerId, sequenceNumber]) => [
                handlerId,
                sequenceNumber.value
            ])

            const updateQuery = `
                UPDATE ${POSTGRES_TABLE_NAME} SET last_sequence_number = v.last_sequence_number
                FROM (VALUES ${updateValues}) AS v(handler_id, last_sequence_number)
                WHERE ${POSTGRES_TABLE_NAME}.handler_id = v.handler_id;`

            await this.transactionManager.client.query(updateQuery, updateParams)
            await this.transactionManager.commit()
        } catch (error) {
            await this.rollbackAndRelease()
            throw error
        }
    }

    async rollbackAndRelease() {
        if (this.transactionManager.transactionInProgress) await this.transactionManager.rollback()
    }
}
