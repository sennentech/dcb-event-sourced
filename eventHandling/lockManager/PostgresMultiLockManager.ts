import { PoolClient, Pool } from "pg"
import { SequenceNumber } from "../../eventStore/SequenceNumber"
import { MultiEventHandlerLockManager, LockResult } from "./LockManager"

const POSTGRES_TABLE_NAME = "_event_handler_bookmarks"

export class PostgresMultiLockManager implements MultiEventHandlerLockManager {
    #client: PoolClient

    get postgresClient(): PoolClient {
        if (!this.#client) {
            throw new Error("Postgres client not initialized, you need to obtain a lock first")
        }
        return this.#client
    }

    constructor(
        private readonly pool: Pool,
        private readonly handlers: string[]
    ) {}

    async install() {
        await this.pool.query(
            `CREATE TABLE IF NOT EXISTS "${POSTGRES_TABLE_NAME}" (handler_id text PRIMARY KEY, last_sequence_number bigint)`
        )

        const insertQuery = `
            INSERT INTO ${POSTGRES_TABLE_NAME} (handler_id, last_sequence_number) 
            VALUES ${this.handlers.map((_, index) => `($${index + 1}, 0)`).join(", ")} 
            ON CONFLICT (handler_id) DO NOTHING;`

        await this.pool.query(insertQuery, this.handlers)
    }

    async obtainLock(): Promise<LockResult> {
        try {
            this.#client = await this.pool.connect()
            await this.#client.query("BEGIN")

            const selectResult = await this.#client.query(
                `SELECT handler_id, last_sequence_number FROM ${POSTGRES_TABLE_NAME} WHERE handler_id = ANY($1::text[]) FOR UPDATE NOWAIT;`,
                [this.handlers]
            )

            const result = this.handlers.map(handlerId => {
                const sequenceNumber = selectResult.rows.find(row => row.handler_id === handlerId)?.last_sequence_number
                if (sequenceNumber !== undefined) {
                    return {
                        handler: handlerId,
                        sequenceNumber: SequenceNumber.create(parseInt(sequenceNumber))
                    }
                } else {
                    throw new Error(`Failed to retrieve sequence number for handler ${handlerId}`)
                }
            })

            return result
        } catch (error) {
            await this.rollbackAndRelease()
            if (error.code === "55P03") {
                throw new Error("Could not obtain lock as it is already locked by another process")
            }
            throw error
        }
    }

    async commitAndRelease(locks: LockResult): Promise<LockResult> {
        if (locks.some(lock => !lock.sequenceNumber)) throw new Error("Sequence number is required to commit")
        try {
            if (!this.#client) throw new Error("No lock obtained, cannot commit")

            const updateValues = locks
                .map((lock, index) => `($${index * 2 + 1}::text, $${index * 2 + 2}::bigint)`)
                .join(", ")
            const updateParams = locks.flatMap(lock => [lock.handler, lock.sequenceNumber.value])

            const updateQuery = `
                UPDATE ${POSTGRES_TABLE_NAME} SET last_sequence_number = v.last_sequence_number
                FROM (VALUES ${updateValues}) AS v(handler_id, last_sequence_number)
                WHERE ${POSTGRES_TABLE_NAME}.handler_id = v.handler_id;`

            await this.#client.query(updateQuery, updateParams)
            await this.#client.query("COMMIT")

            return locks
        } catch (error) {
            await this.rollbackAndRelease()
            throw error
        } finally {
            if (this.#client) {
                this.#client.release()
                this.#client = null
            }
        }
    }

    async rollbackAndRelease() {
        try {
            if (this.#client) await this.#client.query("ROLLBACK")
        } catch (error) {
            console.error("Error during rollback:", error)
        } finally {
            if (this.#client) {
                this.#client.release()
                this.#client = null
            }
        }
    }
}
