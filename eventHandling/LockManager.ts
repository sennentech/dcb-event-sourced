import { PoolClient, Pool } from "pg"
import { SequenceNumber } from "../eventStore/SequenceNumber"

export interface EventHandlerLockManager {
    obtainLock(): Promise<void>
    getLastSequenceNumberSeen(): Promise<SequenceNumber>
    commitAndRelease(sequenceNumber: SequenceNumber): Promise<void>
    rollbackAndRelease(): Promise<void>
}

const POSTGRES_TABLE_NAME = "_event_handler_bookmarks"
export class PostgresLockManager implements EventHandlerLockManager {
    public postgresClient: PoolClient

    constructor(
        private readonly pool: Pool,
        private readonly handlerId: string
    ) {}

    async install() {
        await this.pool.query(
            `CREATE TABLE IF NOT EXISTS "${POSTGRES_TABLE_NAME}"(handler_id text PRIMARY KEY, last_sequence_number text) `
        )
    }

    async obtainLock() {
        this.postgresClient = await this.pool.connect()
        await this.postgresClient.query("BEGIN")
        const result = await this.postgresClient.query("SELECT pg_try_advisory_lock($1)", [this.handlerId])
        if (!result?.rows[0]?.pg_try_advisory_lock) {
            throw new Error("Lock is held by another client")
        }
    }

    async getLastSequenceNumberSeen(): Promise<SequenceNumber> {
        const { rows } = await this.postgresClient.query(
            "SELECT last_sequence_number FROM _event_handler_bookmarks WHERE handler_id = $1",
            [this.handlerId]
        )
        const sequenceNumber =
            rows.length === 0 ? SequenceNumber.create(0) : SequenceNumber.create(rows[0]?.last_sequence_number)

        return sequenceNumber
    }

    async commitAndRelease(sequenceNumber: SequenceNumber) {
        await this.postgresClient.query(
            `INSERT INTO _event_handler_bookmarks(handler_id, last_sequence_number) 
             VALUES ($1, $2)
             ON CONFLICT (handler_id) DO UPDATE SET last_sequence_number = $2`,
            [this.handlerId, sequenceNumber.value]
        )
        await this.postgresClient.query("COMMIT")
        this.postgresClient.release()
        this.postgresClient = null
    }

    async rollbackAndRelease(): Promise<void> {
        await this.postgresClient.query("ROLLBACK;")
        this.postgresClient.release()
        this.postgresClient = null
    }
}
