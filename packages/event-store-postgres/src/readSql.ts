import { Query, QueryItem, ReadOptions, Tags } from "@dcb-es/event-store"
import { ParamManager, tagConverter } from "./utils"

export const readSqlWithCursor = (query: Query, options?: ReadOptions) => {
    const { sql, params } = readSql(query, options)

    const cursorName = `event_cursor_${Math.random().toString(36).substring(7)}`
    return {
        sql: ` DECLARE ${cursorName} CURSOR FOR ${sql}`,
        params,
        cursorName: cursorName
    }
}

export const readSql = (query: Query, options?: ReadOptions) => {
    const pm = new ParamManager()

    const sql = `
        SELECT 
            e.sequence_number,
            type,
            data,
            metadata,
            tags,
            to_char("timestamp" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') "timestamp"
        FROM events e
        ${query?.length ? readCriteriaJoin(query, pm, options) : ""}
        ${whereClause([fromSeqNoFilter(pm, "e", options)])}

        ORDER BY e.sequence_number ${options?.backwards ? "DESC" : ""}
        ${options?.limit ? `LIMIT ${options.limit}` : ""};`
    return { sql, params: pm.params }
}

const notEmpty = (s: string) => s && s !== ""

const hasTags = (c: QueryItem) => c.tags && Object.keys(c.tags).length > 0

const tagFilterSnip = (pm: ParamManager, c: QueryItem) =>
    hasTags(c) ? `tags @> ${pm.add(JSON.stringify(tagConverter.toDb(<Tags>c.tags)))}::jsonb` : ""

const fromSeqNoFilter = (pm: ParamManager, tableAlias: string, options?: ReadOptions) =>
    options?.fromSequenceNumber
        ? `${tableAlias ? `${tableAlias}.` : ""}sequence_number ${options?.backwards ? "<=" : ">="} ${pm.add(options?.fromSequenceNumber?.value)}`
        : ""

const typesFilter = (c: QueryItem, pm: ParamManager) =>
    c.eventTypes?.length ? `type IN (${c.eventTypes.map(t => pm.add(t)).join(", ")})` : ""

const getFilterString = (c: QueryItem, pm: ParamManager, options?: ReadOptions) => {
    const filters = [typesFilter(c, pm), tagFilterSnip(pm, c), fromSeqNoFilter(pm, "", options)]
    return whereClause(filters)
}

export const readCriteriaJoin = (query: Query, pm: ParamManager, options?: ReadOptions): string => {
    if (query === "All") return ""
    const criteriaQueries = query.map((c) => `
        SELECT 
            ${c.onlyLastEvent ? `max(sequence_number)` : `sequence_number`} sequence_number
        FROM events
        ${getFilterString(c, pm, options)}`
    )
    return `
        INNER JOIN (
            SELECT ec.sequence_number FROM (
                ${criteriaQueries.join(`
                    UNION ALL
                `)}
            ) ec
            GROUP BY ec.sequence_number
        ) ec
        ON ec.sequence_number = e.sequence_number`
}

const whereClause = (queryParts: string[]) => {
    if (!queryParts?.length) return ``
    const withoutEmpty = queryParts.filter(notEmpty)
    if (!withoutEmpty.length) return ``

    return `WHERE ${withoutEmpty.join(" AND ")}`
}
