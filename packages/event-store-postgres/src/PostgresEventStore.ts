import { Pool, QueryResult } from "pg"
import { dbEventConverter } from "./utils"
import { readSqlWithCursor } from "./readSql"
import { appendSql as appendCommand } from "./appendCommand"
import {
    EventStore,
    DcbEvent,
    AppendCondition,
    EventEnvelope,
    ReadOptions,
    Query
} from "@dcb-es/event-store"
import { createEventsTableSql } from "./createEventsTableSql"

const BATCH_SIZE = 100

export class PostgresEventStore implements EventStore {
    constructor(private pool: Pool) { }

    async append(
        events: DcbEvent | DcbEvent[],
        appendCondition?: AppendCondition
    ): Promise<void> {
        events = Array.isArray(events) ? events : [events]

        const query = !appendCondition ? undefined : appendCondition.query
        const maxSeqNumber = !appendCondition ? undefined : appendCondition.maxSequenceNumber
        const { statement, params } = appendCommand(events, query, maxSeqNumber)

        const client = await this.pool.connect()
        try {
            await client.query(`BEGIN ISOLATION LEVEL SERIALIZABLE;`)
            const result = await client.query(statement, params)
            await client.query("COMMIT")
            const EVentEnvelopes = result.rows.map(dbEventConverter.fromDb)
            if (!EVentEnvelopes.length)
                throw new Error(`Expected Version fail: New events matching appendCondition found.`)

        } catch (err) {
            await client.query("ROLLBACK")
            throw err
        } finally {
            client.release()
        }
    }

    async *read(query: Query, options?: ReadOptions): AsyncGenerator<EventEnvelope> {
        yield* this.#read({ query, options })
    }

    async *#read({ query, options }: { query: Query; options?: ReadOptions }): AsyncGenerator<EventEnvelope> {
        const client = await this.pool.connect()
        try {
            await client.query("BEGIN")
            const { sql, params } = readSqlWithCursor(query, options)

            await client.query(sql, params)

            let result: QueryResult
            while ((result = await client.query(`FETCH ${BATCH_SIZE} FROM event_cursor`))?.rows?.length) {
                for (const ev of result.rows) {
                    yield dbEventConverter.fromDb(ev)
                }
            }
            await client.query("COMMIT")
        } catch (err) {
            await client.query("ROLLBACK")
            throw err
        } finally {
            client.release()
        }
    }

    async install() {
        await this.pool.query(createEventsTableSql)
    }
}
