import { DcbEvent, Query, SequenceNumber } from "@dcb-es/event-store"
import { ParamManager, dbEventConverter, tagConverter } from "./utils"

export const appendSql = (
    events: DcbEvent[],
    query: Query | undefined,
    maxSeqNumber: SequenceNumber | undefined
): { statement: string; params: unknown[] } => {
    const params = new ParamManager()

    const maxSeqNoParam = maxSeqNumber ? params.add(maxSeqNumber?.value) : null
    const formattedEvents = events.map(dbEventConverter.toDb)

    //prettier-ignore
    const statement = `
        WITH new_events (type, data, metadata, tags) AS ( 
            VALUES ${formattedEvents
            .map(e => `(${params.add(e.type)},${params.add(e.data)}::JSONB,${params.add(e.metadata)}::JSONB, ${params.add(e.tags)}::JSONB)`)
            .join(", ")}
        ),
        inserted AS (
            INSERT INTO events (type, data, metadata, tags)
            SELECT type, data, metadata, tags
            FROM new_events
            ${query && query.length > 0 && query !== "All" ? `
                WHERE NOT EXISTS (
                    ${query.map(
                c => ` 
                        SELECT 1 FROM events WHERE type IN (${(c.eventTypes ?? []).map(t => params.add(t)).join(", ")})
                        AND tags @> ${params.add(JSON.stringify(tagConverter.toDb(c.tags ?? {})))}::jsonb
                        AND sequence_number > ${maxSeqNoParam}::bigint
                        `
            ).join(`
                        UNION ALL
                    `)}
                )
            ` : ""}
            RETURNING sequence_number,type,data,tags,"timestamp"
        ) 
        SELECT  
            sequence_number,
            type,
            data,
            tags,
            to_char("timestamp" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') "timestamp" 
        FROM inserted;
        ;
    `
    return { statement, params: params.params }
}
