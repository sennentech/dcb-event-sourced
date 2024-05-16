import { EsQueryCriterion, EsReadOptions } from "../EventStore"
import { ParamManager, tagConverter } from "./utils"

const hasTags = (c: EsQueryCriterion) => c.tags && Object.keys(c.tags).length > 0
const tagFilterSnip = (p: ParamManager, c: EsQueryCriterion) =>
    hasTags(c) ? `tags @> ${p.add(JSON.stringify(tagConverter.toDb(c.tags)))}::jsonb` : ""

const fromSeqNoFilter = (p: ParamManager, options?: EsReadOptions) =>
    options?.fromSequenceNumber ? `sequence_number >= ${p.add(options?.fromSequenceNumber?.value)}` : ""

const typesFilter = (c: EsQueryCriterion, p: ParamManager) =>
    c.eventTypes?.length ? `type IN (${c.eventTypes.map(t => p.add(t)).join(", ")})` : ""

export const readSql = (criteria: EsQueryCriterion[], p: ParamManager, options?: EsReadOptions) => `
    DECLARE event_cursor CURSOR FOR
    SELECT 
        e.sequence_number,
        ,type
        ,data
        ,tags
        ,"timestamp"
        ${criteria.length ? `,hashes` : ""}
    FROM events e
    ${criteria?.length ? readCriteriaJoin(criteria, p, options) : ""}
    ORDER BY e.sequence_number;
`

export const readCriteriaJoin = (criteria: EsQueryCriterion[], p: ParamManager, options?: EsReadOptions): string => `
    INNER JOIN (
        SELECT sequence_number, ARRAY_AGG(hash) hashes FROM (
            ${criteria.map((c, i) => {
                const filters = [typesFilter(c, p), tagFilterSnip(p, c), fromSeqNoFilter(p, options)].filter(
                    f => f !== ""
                )
                const filterString = filters.length ? `WHERE ${filters.join(" AND ")}` : ""
                return `
                    SELECT sequence_number, ${p.add(i)} hash FROM events 
                    ${filterString}
                `
            }).join(`
                UNION ALL
            `)}
        ) h
        GROUP BY h.sequence_number
    ) eh
    ON eh.sequence_number = e.sequence_number
`
