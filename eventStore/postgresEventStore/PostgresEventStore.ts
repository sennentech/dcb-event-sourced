import { Pool } from "pg"
import {
    AnyCondition,
    AppendCondition,
    EsEvent,
    EsEventEnvelope,
    EsQuery,
    EsReadOptions,
    EventStore,
    Tags
} from "../EventStore"
import { SequenceNumber } from "../SequenceNumber"
import { createEventsTableSql } from "./createEventsTableSql"
import { ParamManager, dbEventConverter, tagConverter } from "./utils"
import { readSql } from "./readSql"

const BATCH_SIZE = 2

export class PostgresEventStore implements EventStore {
    constructor(private pool: Pool) {}

    async append(
        events: EsEvent | EsEvent[],
        appendCondition: AppendCondition | AnyCondition
    ): Promise<{
        lastSequenceNumber: SequenceNumber
    }> {
        events = Array.isArray(events) ? events : [events]
        const formattedEvents = events.map(dbEventConverter.toDb)

        const maxSeqNumber = appendCondition === "Any" ? null : appendCondition.maxSequenceNumber.value
        const p = new ParamManager()

        const criteria = appendCondition !== "Any" ? appendCondition.query.criteria ?? [] : []
        const maxSeqNumberParam = p.add(maxSeqNumber)

        const sql = `
            WITH new_events (type, data, tags) AS ( 
                VALUES ${formattedEvents.map(e => `(${p.add(e.type)}, ${p.add(e.data)}::JSONB, ${p.add(e.tags)}::JSONB)`).join(", ")}
            ),
            inserted AS (
                INSERT INTO events (type, data, tags)
                SELECT type, data, tags
                FROM new_events
                WHERE NOT EXISTS (
                    ${criteria.map(
                        c => ` 
                        SELECT 1 FROM events WHERE type IN (${c.eventTypes.map(t => p.add(t)).join(", ")})
                        AND tags @> ${p.add(JSON.stringify(tagConverter.toDb(c.tags)))}::jsonb
                        AND sequence_number > ${maxSeqNumberParam}
                        `
                    ).join(`
                        UNION ALL
                    `)}
                )
                RETURNING sequence_number
            ) 
            SELECT max(sequence_number) as last_sequence_number FROM inserted;
            ;
        `

        const client = await this.pool.connect()

        try {
            await client.query(`BEGIN ISOLATION LEVEL SERIALIZABLE;`)
            const result = await client.query(sql, p.params)
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
            const p = new ParamManager()
            const sql = readSql(query?.criteria, p, options)
            console.log(sql, p.params)
            await client.query(sql, p.params)
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
            console.error("Error during streaming read:", err)
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
