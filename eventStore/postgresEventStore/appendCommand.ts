import { EsEvent, EsQueryCriterion } from "../EventStore"
import { SequenceNumber } from "../SequenceNumber"
import { ParamManager, dbEventConverter, tagConverter } from "./utils"

export const appendSql = (
    events: EsEvent[],
    criteria: EsQueryCriterion[],
    maxSeqNumber: SequenceNumber
): { query: string; params: any[] } => {
    const params = new ParamManager()
    const maxSeqNoParam = params.add(maxSeqNumber.value)
    const formattedEvents = events.map(dbEventConverter.toDb)

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
            WHERE NOT EXISTS (
                ${criteria.map(
                    c => ` 
                    SELECT 1 FROM events WHERE type IN (${c.eventTypes.map(t => params.add(t)).join(", ")})
                    AND tags @> ${params.add(JSON.stringify(tagConverter.toDb(c.tags)))}::jsonb
                    AND sequence_number > ${maxSeqNoParam}
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
    return { query, params: params.params }
}
