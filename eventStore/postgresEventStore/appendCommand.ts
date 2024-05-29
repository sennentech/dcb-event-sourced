import { EsEvent, EsQueryCriterion } from "../EventStore"
import { SequenceNumber } from "../SequenceNumber"
import { ParamManager, dbEventConverter, tagConverter } from "./utils"

export const appendSql = (
    events: EsEvent[],
    criteria: EsQueryCriterion[],
    maxSeqNumber: SequenceNumber
): { query: string; params: unknown[] } => {
    const params = new ParamManager()

    const maxSeqNoParam = maxSeqNumber ? params.add(maxSeqNumber?.value) : null
    const formattedEvents = events.map(dbEventConverter.toDb)

    //prettier-ignore
    const query = `
        WITH new_events (type, data, tags) AS ( 
            VALUES ${formattedEvents
                .map(e => `(${params.add(e.type)},${params.add(e.data)}::JSONB, ${params.add(e.tags)}::JSONB)`)
                .join(", ")}
        ),
        inserted AS (
            INSERT INTO events (type, data, tags)
            SELECT type, data, tags
            FROM new_events
            ${criteria.length > 0 ? `
                WHERE NOT EXISTS (
                    ${criteria.map(
                        c => ` 
                        SELECT 1 FROM events WHERE type IN (${c.eventTypes.map(t => params.add(t)).join(", ")})
                        AND tags @> ${params.add(JSON.stringify(tagConverter.toDb(c.tags)))}::jsonb
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
    return { query, params: params.params }
}
