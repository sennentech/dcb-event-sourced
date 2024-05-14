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
        private readonly handlerId: string,
        private readonly opts?: { disableRowLock?: boolean }
    ) {}

    async install() {
        await this.pool.query(
            `CREATE TABLE IF NOT EXISTS "${POSTGRES_TABLE_NAME}"(handler_id text PRIMARY KEY, last_sequence_number int) `
        )
        await this.pool.query(`TRUNCATE TABLE "${POSTGRES_TABLE_NAME}"`)
    }

    async obtainLock(): Promise<SequenceNumber> {
        this.#client = await this.pool.connect()
        await this.#client.query("BEGIN")

        const lockRowSnippet = this.opts?.disableRowLock ? "" : "FOR UPDATE NOWAIT"
        const { rows } = await this.#client.query(
            `SELECT last_sequence_number FROM _event_handler_bookmarks WHERE handler_id = $1 ${lockRowSnippet};`,
            [this.handlerId]
        )
        const sequenceNumber =
            rows.length === 0 ? SequenceNumber.create(0) : SequenceNumber.create(rows[0]?.last_sequence_number)

        return sequenceNumber
    }

    async commitAndRelease(sequenceNumber: SequenceNumber) {
        try {
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
            await this.#client.query("ROLLBACK")
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
