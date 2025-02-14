import { PoolClient, QueryResult } from "pg"
import { dbEventConverter } from "./utils"
import { readSqlWithCursor } from "./readSql"
import { appendSql as appendCommand } from "./appendCommand"
import { EventStore, DcbEvent, AppendCondition, EventEnvelope, ReadOptions, Query } from "@dcb-es/event-store"

const BATCH_SIZE = 100

export class PostgresEventStore implements EventStore {
    constructor(private client: PoolClient) {}

    async append(events: DcbEvent | DcbEvent[], appendCondition?: AppendCondition): Promise<void> {
        /*  To be completely safe, we need to ensure append with transaction isolation level set to serializable */
        const isolation = (await this.client.query("SELECT current_setting('transaction_isolation') as iso")).rows[0]
            .iso
        if (isolation.toLowerCase() !== "serializable") throw new Error("Transaction is not serializable")

        const evts = Array.isArray(events) ? events : [events]
        const { query, expectedCeiling } = appendCondition ?? {}
        const { statement, params } = appendCommand(evts, query, expectedCeiling)
        const result = await this.client.query(statement, params)
        if (result.rowCount === 0) throw new Error("Expected Version fail: New events matching appendCondition found.")
    }

    async *read(query: Query, options?: ReadOptions): AsyncGenerator<EventEnvelope> {
        yield* this.readInternal({ query, options })
    }

    private async *readInternal({
        query,
        options
    }: {
        query: Query
        options?: ReadOptions
    }): AsyncGenerator<EventEnvelope> {
        const { sql, params, cursorName } = readSqlWithCursor(query, options)
        await this.client.query(sql, params)

        let result: QueryResult
        while ((result = await this.client.query(`FETCH ${BATCH_SIZE} FROM ${cursorName}`))?.rows?.length) {
            for (const ev of result.rows) {
                yield dbEventConverter.fromDb(ev)
            }
        }
    }
}
