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
import { createReadEventsFnSql } from "./createReadEventsFnSql"
import { createAppendEventsFnSql } from "./createAppendEventsFnSql"
import { last } from "ramda"

type DbTags = {
    key: string
    value: string
}[]

type DbEvent = {
    type: string
    data: string
    tags: string
}

const tagConverter = {
    fromDb: (dbTags: DbTags): Tags =>
        dbTags.reduce<Tags>((acc, { key, value }) => {
            if (acc[key]) {
                const currentValue = acc[key]
                if (Array.isArray(currentValue)) {
                    return { ...acc, [key]: [...currentValue, value] } // Append to existing array
                } else {
                    return { ...acc, [key]: [currentValue, value] } // Convert existing string to array and append
                }
            } else {
                return { ...acc, [key]: value } // Set as string if first occurrence
            }
        }, {}),

    toDb: (tags: Tags): DbTags =>
        Object.entries(tags).reduce<DbTags>((acc, [key, value]) => {
            if (Array.isArray(value)) {
                return acc.concat(value.map(v => ({ key, value: v })))
            } else {
                return acc.concat([{ key, value }])
            }
        }, [])
}

const dbEventConverter = {
    toDb: (esEvent: EsEvent): DbEvent => ({
        type: esEvent.type,
        data: JSON.stringify(esEvent.data),
        tags: JSON.stringify(tagConverter.toDb(esEvent.tags))
    })
}
const paramManager = () => {
    const params: string[] = []
    return {
        add: (paramValue): string => {
            params.push(paramValue)
            return `$${params.length}`
        },
        params
    }
}

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
        const p = paramManager()

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
                        SELECT 1 FROM events WHERE type IN (${p.add(c.eventTypes)}) 
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
        const p = paramManager()
        const sql = `
            SELECT 
                e.sequence_number,
                type,
                data,
                tags,
                "timestamp",
                hashes
            FROM events e
            INNER JOIN (
                SELECT sequence_number, ARRAY_AGG(hash) hashes FROM (
                    ${query.criteria.map(
                        (c, i) => ` 
                        SELECT sequence_number, ${p.add(i)} hash FROM events 
                        WHERE type IN (${c.eventTypes.map(t => p.add(t)).join(", ")})
                        ${c.tags ? `AND tags @> ${p.add(JSON.stringify(tagConverter.toDb(c.tags)))}::jsonb` : ""}
                        ${options?.fromSequenceNumber ? `AND sequence_number > ${p.add(options?.fromSequenceNumber.value)}` : ""}
                        `
                    ).join(`
                        UNION ALL
                    `)}
                ) h
                GROUP BY h.sequence_number
            ) eh
            ON eh.sequence_number = e.sequence_number
            ORDER BY e.sequence_number;
        `

        const { rows } = await this.pool.query(sql, p.params)
        if (!rows.length) console.log("NO ROWS!!")
        for (const ev of rows) {
            yield {
                sequenceNumber: ev.sequence_number,
                timestamp: ev.timestamp,
                event: {
                    type: ev.type,
                    data: ev.data,
                    tags: tagConverter.fromDb(ev.tags)
                }
            }
        }
    }

    async install() {
        await this.pool.query(createEventsTableSql)
    }
}
