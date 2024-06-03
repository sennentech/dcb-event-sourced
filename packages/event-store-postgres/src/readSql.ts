import { EsQueryCriterion, EsReadOptions } from "@dcb-es/event-store"
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
            to_char("timestamp" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') "timestamp"
            ${criteria?.length ? `,hashes` : ""}
        FROM events e
        ${criteria?.length ? readCriteriaJoin(criteria, pm, options) : ""}
        ${whereClause([fromSeqNoFilter(pm, "e", options)])}

        ORDER BY e.sequence_number ${options?.backwards ? "DESC" : ""}
        ${options?.limit ? `LIMIT ${options.limit}` : ""};`
    return { sql, params: pm.params }
}

const notEmpty = (s: string) => s && s !== ""

const hasTags = (c: EsQueryCriterion) => c.tags && Object.keys(c.tags).length > 0

const tagFilterSnip = (pm: ParamManager, c: EsQueryCriterion) =>
    hasTags(c) ? `tags @> ${pm.add(JSON.stringify(tagConverter.toDb(c.tags)))}::jsonb` : ""

const fromSeqNoFilter = (pm: ParamManager, tableAlias: string, options?: EsReadOptions) =>
    options?.fromSequenceNumber
        ? `${tableAlias ? `${tableAlias}.` : ""}sequence_number ${options?.backwards ? "<=" : ">="} ${pm.add(options?.fromSequenceNumber?.value)}`
        : ""

const typesFilter = (c: EsQueryCriterion, pm: ParamManager) =>
    c.eventTypes?.length ? `type IN (${c.eventTypes.map(t => pm.add(t)).join(", ")})` : ""

const getFilterString = (c: EsQueryCriterion, pm: ParamManager, options?: EsReadOptions) => {
    const filters = [typesFilter(c, pm), tagFilterSnip(pm, c), fromSeqNoFilter(pm, "", options)]
    return whereClause(filters)
}

export const readCriteriaJoin = (criteria: EsQueryCriterion[], pm: ParamManager, options?: EsReadOptions): string => `
    INNER JOIN (
        SELECT ec.sequence_number, ARRAY_AGG(hash) hashes FROM (
            ${criteria.map(
                (c, i) => `
                    SELECT 
                        ${c.onlyLastEvent ? `max(sequence_number)` : `sequence_number`} sequence_number, 
                        ${pm.add(i.toString())} hash 
                    FROM events
                    ${getFilterString(c, pm, options)}`
            ).join(`
                UNION ALL
            `)}
        ) ec
        GROUP BY ec.sequence_number
    ) ec
    ON ec.sequence_number = e.sequence_number
`

const whereClause = (queryParts: string[]) => {
    if (!queryParts?.length) return ``
    const withoutEmpty = queryParts.filter(notEmpty)
    if (!withoutEmpty.length) return ``

    return `WHERE ${withoutEmpty.join(" AND ")}`
}
