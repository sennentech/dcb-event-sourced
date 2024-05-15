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
import { createReadEventsFnSql } from "./createReadEventsFnSql"
import { createAppendEventsFnSql } from "./createAppendEventsFnSql"

export class PostgresEventStore implements EventStore {
    constructor(private client: Pool) {}

    async append(
        events: EsEvent | EsEvent[],
        appendCondition: AppendCondition | AnyCondition
    ): Promise<{
        lastSequenceNumber: SequenceNumber
    }> {
        events = Array.isArray(events) ? events : [events]

        let conditionTypes = []
        let conditionTags = {}
        let maxSeqNo = 0

        if (appendCondition !== "Any") {
            conditionTypes = appendCondition.query.criteria.flatMap(c => c.eventTypes)
            conditionTags = appendCondition.query.criteria.reduce((acc, c) => ({ ...acc, ...c.tags }), {})
            maxSeqNo = appendCondition.maxSequenceNumber.value
        }

        const eventsData = events.map(event => ({
            type: event.type,
            data: event.data,
            tags: event.tags
        }))

        const result = await this.client.query(
            `SELECT append_events_jsonb($1::jsonb, $2::text[], $3::jsonb, $4::bigint) AS last_seq_no;`,
            [JSON.stringify(eventsData), conditionTypes, JSON.stringify(conditionTags), maxSeqNo]
        )

        return { lastSequenceNumber: SequenceNumber.create(parseInt(result.rows[0].last_seq_no, 10)) }
    }

    async *readAll(options?: EsReadOptions): AsyncGenerator<EsEventEnvelope> {
        yield* this.#read({ query: null, options: options })
    }

    async *read(query: EsQuery, options?: EsReadOptions): AsyncGenerator<EsEventEnvelope> {
        yield* this.#read({ query, options })
    }

    async *#read({ query, options }: { query?: EsQuery; options?: EsReadOptions }): AsyncGenerator<EsEventEnvelope> {
        const fromSeqNo = options?.fromSequenceNumber ? options.fromSequenceNumber.value : 0
        const readBackwards = options?.backwards || false

        // Convert EsQuery into a JSONB object expected by the PostgreSQL function
        const criteria = {
            eventTypes: query.criteria.map(c => c.eventTypes).flat(),
            tags: query.criteria.map(c => c.tags).reduce((acc, tags) => ({ ...acc, ...tags }), {})
        }

        const res = await this.client.query("SELECT * FROM read_events($1, $2, $3)", [
            JSON.stringify(criteria),
            fromSeqNo,
            readBackwards
        ])

        for (const row of res.rows) {
            yield {
                event: {
                    type: row.type,
                    tags: row.tags,
                    data: row.data
                },
                timestamp: row.timestamp,
                sequenceNumber: SequenceNumber.create(parseInt(row.sequence_number))
            }
        }
    }

    async install() {
        await this.client.query(`
            
            ${createEventsTableSql}
            ${createAppendEventsFnSql}
            ${createReadEventsFnSql}

        `)
    }
}
