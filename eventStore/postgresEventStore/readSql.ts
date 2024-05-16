import { EsQueryCriterion, EsReadOptions } from "../EventStore"
import { ParamManager, tagConverter } from "./utils"

export const readSql = (criteria: EsQueryCriterion[], options?: EsReadOptions) => {
    const pm = new ParamManager()
    const sql = `
        DECLARE event_cursor CURSOR FOR
        SELECT 
            e.sequence_number,
            type,
            data,
            tags,
            "timestamp"
            ${criteria?.length ? `,hashes` : ""}
        FROM events e
        ${criteria?.length ? readCriteriaJoin(criteria, pm, options) : ""}
        ORDER BY e.sequence_number;`
    return { sql, params: pm.params }
}

const notEmpty = (s: string) => s && s !== ""

const hasTags = (c: EsQueryCriterion) => c.tags && Object.keys(c.tags).length > 0

const tagFilterSnip = (pm: ParamManager, c: EsQueryCriterion) =>
    hasTags(c) ? `tags @> ${pm.add(JSON.stringify(tagConverter.toDb(c.tags)))}::jsonb` : ""

const fromSeqNoFilter = (pm: ParamManager, options?: EsReadOptions) =>
    options?.fromSequenceNumber ? `sequence_number >= ${pm.add(options?.fromSequenceNumber?.value)}` : ""

const typesFilter = (c: EsQueryCriterion, pm: ParamManager) =>
    c.eventTypes?.length ? `type IN (${c.eventTypes.map(t => pm.add(t)).join(", ")})` : ""

const getFilterString = (c: EsQueryCriterion, pm: ParamManager, options?: EsReadOptions) => {
    const filters = [typesFilter(c, pm), tagFilterSnip(pm, c), fromSeqNoFilter(pm, options)].filter(notEmpty)
    return filters.length ? `WHERE ${filters.join(" AND ")}` : ""
}

export const readCriteriaJoin = (criteria: EsQueryCriterion[], pm: ParamManager, options?: EsReadOptions): string => `
    INNER JOIN (
        SELECT sequence_number, ARRAY_AGG(hash) hashes FROM (
            ${criteria.map(
                (c, i) => `
                    SELECT 
                        sequence_number, 
                        ${pm.add(i.toString())} hash 
                    FROM events 
                    ${getFilterString(c, pm, options)}`
            ).join(`
                UNION ALL
            `)}
        ) h
        GROUP BY h.sequence_number
    ) eh
    ON eh.sequence_number = e.sequence_number
`
