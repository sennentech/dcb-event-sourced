import { PoolClient, Pool } from "pg"
import { SequenceNumber } from "../../eventStore/SequenceNumber"
import { EventHandlerLockManager } from "./LockManager"

const POSTGRES_TABLE_NAME = "_event_handler_bookmarks"

export class PostgresLockManager implements EventHandlerLockManager {
    #client: PoolClient

    get postgresClient(): PoolClient {
        if (!this.#client) {
            throw new Error("Postgres client not initialized, you need to obtain a lock first")
        }
        return this.#client
    }

    constructor(
        private readonly pool: Pool,
        private readonly handlerId: string
    ) {}

    async install() {
        await this.pool.query(
            `CREATE TABLE IF NOT EXISTS "${POSTGRES_TABLE_NAME}"(handler_id text PRIMARY KEY, last_sequence_number int)`
        )
    }

    async obtainLock(): Promise<SequenceNumber> {
        try {
            this.#client = await this.pool.connect()
            await this.#client.query("BEGIN")

            const getLastSequenceNumber = async (): Promise<number | null> => {
                const { rows } = await this.#client.query(
                    `SELECT last_sequence_number FROM _event_handler_bookmarks WHERE handler_id = $1 FOR UPDATE NOWAIT;`,
                    [this.handlerId]
                )
                return rows.length ? rows[0].last_sequence_number : null
            }

            let lastSequenceNumber = await getLastSequenceNumber()

            if (lastSequenceNumber === null) {
                await this.pool.query(
                    `INSERT INTO _event_handler_bookmarks(handler_id, last_sequence_number)
                     VALUES ($1, 0)
                     ON CONFLICT (handler_id) DO NOTHING;`,
                    [this.handlerId]
                )
                lastSequenceNumber = await getLastSequenceNumber()
            }

            if (lastSequenceNumber === null) {
                throw new Error("Failed to retrieve or initialize sequence number")
            }

            return SequenceNumber.create(lastSequenceNumber)
        } catch (error) {
            await this.rollbackAndRelease()
            if (error.code === "55P03") {
                throw new Error("Could not obtain lock as it is already locked by another process")
            }
            throw error
        }
    }

    async commitAndRelease(sequenceNumber: SequenceNumber) {
        try {
            if (!this.#client) throw new Error("No lock obtained, cannot commit")
            if (!sequenceNumber) throw new Error(`Sequence number is required to commit`)
            await this.#client.query(
                `INSERT INTO _event_handler_bookmarks(handler_id, last_sequence_number) 
                 VALUES ($1, $2)
                 ON CONFLICT (handler_id) DO UPDATE SET last_sequence_number = $2`,
                [this.handlerId, sequenceNumber.value]
            )
            await this.#client.query("COMMIT")
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
