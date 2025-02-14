import { PoolClient, QueryResult } from "pg"
import { dbEventConverter, getTableName } from "./utils"
import { readSqlWithCursor } from "./readSql"
import { appendSql as appendCommand } from "./appendCommand"
import { EventStore, DcbEvent, AppendCondition, EventEnvelope, ReadOptions, Query } from "@dcb-es/event-store"

const BATCH_SIZE = 100

export const PostgresEventStore = (client: PoolClient, tablePrefixOverride?: string): EventStore => {
    const append = async (events: DcbEvent | DcbEvent[], appendCondition?: AppendCondition): Promise<void> => {
        /*  To be completely safe, we need to ensure append with transaction isolation level set to serializable */
        const isolation = (await client.query("SELECT current_setting('transaction_isolation') as iso")).rows[0].iso
        if (isolation.toLowerCase() !== "serializable") throw new Error("Transaction is not serializable")

        const evts = Array.isArray(events) ? events : [events]
        const query = appendCondition?.query
        const maxSeqNumber = appendCondition?.maxSequenceNumber
        const { statement, params } = appendCommand(evts, query, maxSeqNumber, getTableName(tablePrefixOverride))
        const result = await client.query(statement, params)

        const EVentEnvelopes = result.rows.map(dbEventConverter.fromDb)
        if (!EVentEnvelopes.length) throw new Error("Expected Version fail: New events matching appendCondition found.")
    }

    const read = async function* (query: Query, options?: ReadOptions): AsyncGenerator<EventEnvelope> {
        yield* readInternal({ query, options })
    }

    const readInternal = async function* ({
        query,
        options
    }: {
        query: Query
        options?: ReadOptions
    }): AsyncGenerator<EventEnvelope> {
        const { sql, params, cursorName } = readSqlWithCursor(query, getTableName(tablePrefixOverride), options)
        await client.query(sql, params)

        let result: QueryResult
        while ((result = await client.query(`FETCH ${BATCH_SIZE} FROM ${cursorName}`))?.rows?.length) {
            for (const ev of result.rows) {
                yield dbEventConverter.fromDb(ev)
            }
        }
    }

    return {
        append,
        read
    }
}
