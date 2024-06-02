import { Pool, QueryResult } from "pg"
import { dbEventConverter } from "./utils"
import { readSql as readQuery } from "./readSql"
import { appendSql as appendCommand } from "./appendCommand"
import {
    EventStore,
    EsEvent,
    AppendCondition,
    AnyCondition,
    EsEventEnvelope,
    EsReadOptions,
    EsQuery
} from "@dcb-es/event-store"
import { createEventsTableSql } from "./createEventsTableSql"

const BATCH_SIZE = 100

export class PostgresEventStore implements EventStore {
    constructor(private pool: Pool) {}

    async append(
        events: EsEvent | EsEvent[],
        appendCondition: AppendCondition | AnyCondition
    ): Promise<EsEventEnvelope[]> {
        events = Array.isArray(events) ? events : [events]

        const maxSeqNumber = appendCondition === "Any" ? null : appendCondition.maxSequenceNumber
        const criteria = appendCondition !== "Any" ? appendCondition.query.criteria ?? [] : []
        const { query, params } = appendCommand(events, criteria, maxSeqNumber)

        const client = await this.pool.connect()
        try {
            await client.query(`BEGIN ISOLATION LEVEL SERIALIZABLE;`)
            const result = await client.query(query, params)
            await client.query("COMMIT")
            const esEVentEnvelopes = result.rows.map(dbEventConverter.fromDb)
            if (!esEVentEnvelopes.length)
                throw new Error(`Expected Version fail: New events matching appendCondition found.`)

            return esEVentEnvelopes
        } catch (err) {
            await client.query("ROLLBACK")
            throw err
        } finally {
            client.release()
        }
    }

    async *readAll(options?: EsReadOptions): AsyncGenerator<EsEventEnvelope> {
        yield* this.#read({ query: null, options: options })
    }

    async *read(query: EsQuery, options?: EsReadOptions): AsyncGenerator<EsEventEnvelope> {
        yield* this.#read({ query, options })
    }

    async *#read({ query, options }: { query?: EsQuery; options?: EsReadOptions }): AsyncGenerator<EsEventEnvelope> {
        const client = await this.pool.connect()
        try {
            await client.query("BEGIN")
            const { sql, params } = readQuery(query?.criteria, options)

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
