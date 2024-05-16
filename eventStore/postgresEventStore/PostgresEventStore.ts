import { Pool } from "pg"
import {
    AnyCondition,
    AppendCondition,
    EsEvent,
    EsEventEnvelope,
    EsQuery,
    EsReadOptions,
    EventStore
} from "../EventStore"
import { SequenceNumber } from "../SequenceNumber"
import { createEventsTableSql } from "./createEventsTableSql"
import { tagConverter } from "./utils"
import { readSql as readQuery } from "./readSql"
import { appendSql as appendCommand } from "./appendCommand"

const BATCH_SIZE = 100

export class PostgresEventStore implements EventStore {
    constructor(private pool: Pool) {}

    async append(
        events: EsEvent | EsEvent[],
        appendCondition: AppendCondition | AnyCondition
    ): Promise<{
        lastSequenceNumber: SequenceNumber
    }> {
        events = Array.isArray(events) ? events : [events]

        const maxSeqNumber = appendCondition === "Any" ? null : appendCondition.maxSequenceNumber
        const criteria = appendCondition !== "Any" ? appendCondition.query.criteria ?? [] : []
        const { query, params } = appendCommand(events, criteria, maxSeqNumber)

        const client = await this.pool.connect()
        try {
            await client.query(`BEGIN ISOLATION LEVEL SERIALIZABLE;`)
            const result = await client.query(query, params)
            await client.query("COMMIT")
            const lastSequenceNumber = parseInt(result.rows[0].last_sequence_number, 10)
            return { lastSequenceNumber: SequenceNumber.create(lastSequenceNumber) }
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
            while (true) {
                const result = await client.query(`FETCH ${BATCH_SIZE} FROM event_cursor`)
                if (!result.rows.length) {
                    break
                }
                for (const ev of result.rows) {
                    yield {
                        sequenceNumber: SequenceNumber.create(parseInt(ev.sequence_number)),
                        timestamp: ev.timestamp,
                        event: {
                            type: ev.type,
                            data: ev.data,
                            tags: tagConverter.fromDb(ev.tags)
                        }
                    }
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
