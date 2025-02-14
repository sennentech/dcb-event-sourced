import { EventStore, Queries, Query, SequenceNumber } from "@dcb-es/event-store"
import { EventHandler } from "@dcb-es/event-handling"
import { PoolClient } from "pg"
export type HandlerCheckPoints = Record<string, SequenceNumber>

export const getTableName = (tablePrefixOverride?: string) =>
    tablePrefixOverride ? `${tablePrefixOverride}_event_handler_bookmarks` : "_event_handler_bookmarks"

export const catchupHandlers = async (
    client: PoolClient,
    eventStore: EventStore,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handlers: Record<string, EventHandler<any, any>>,
    tablePrefixOverride?: string
) => {
    const currentCheckPoints = await lockHandlers(client, handlers)

    await Promise.all(
        Object.entries(handlers).map(
            async ([handlerId, handler]) =>
                (currentCheckPoints[handlerId] = await catchupHandler(
                    handler,
                    eventStore,
                    currentCheckPoints[handlerId]
                ))
        )
    )
    await updateBookmarksAndReleaseLocks(client, currentCheckPoints, tablePrefixOverride)
}

const lockHandlers = async (
    client: PoolClient,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handlers: Record<string, EventHandler<any, any>>,
    tablePrefixOverride?: string
): Promise<HandlerCheckPoints> => {
    try {
        const selectResult = await client.query(
            `
            SELECT handler_id, last_sequence_number
            FROM ${getTableName(tablePrefixOverride)}
            WHERE handler_id = ANY($1::text[])
            FOR UPDATE NOWAIT;`,
            [Object.keys(handlers)]
        )

        const result = Object.keys(handlers).reduce((acc, handlerId) => {
            const sequenceNumber = selectResult.rows.find(row => row.handler_id === handlerId)?.last_sequence_number
            if (sequenceNumber !== undefined) {
                return {
                    ...acc,
                    [handlerId]: SequenceNumber.create(parseInt(sequenceNumber))
                }
            } else {
                throw new Error(`Failed to retrieve sequence number for handler ${handlerId}`)
            }
        }, {})

        return result
    } catch (error) {
        const err = error as { code?: string }
        if (err.code === "55P03") {
            throw new Error("Could not obtain lock as it is already locked by another process")
        }
        throw error
    }
}

const updateBookmarksAndReleaseLocks = async (
    client: PoolClient,
    locks: HandlerCheckPoints,
    tablePrefixOverride?: string
): Promise<void> => {
    if (Object.values(locks).some(lock => !lock)) throw new Error("Sequence number is required to commit")

    const updateValues = Object.keys(locks)
        .map((_, index) => `($${index * 2 + 1}::text, $${index * 2 + 2}::bigint)`)
        .join(", ")

    const updateParams = Object.entries(locks).flatMap(([handlerId, sequenceNumber]) => [
        handlerId,
        sequenceNumber.value
    ])

    const updateQuery = `
        UPDATE ${getTableName(tablePrefixOverride)} SET last_sequence_number = v.last_sequence_number
        FROM (VALUES ${updateValues}) AS v(handler_id, last_sequence_number)
        WHERE ${getTableName(tablePrefixOverride)}.handler_id = v.handler_id;`

    await client.query(updateQuery, updateParams)
}

export const catchupHandler = async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: EventHandler<any, any>,
    eventStore: EventStore,
    currentSeqNumber: SequenceNumber,
    toSequenceNumber?: SequenceNumber
) => {
    if (!toSequenceNumber) {
        const lastEventInStore = (await eventStore.read(Queries.all, { backwards: true, limit: 1 }).next()).value
        toSequenceNumber = lastEventInStore?.sequenceNumber ?? SequenceNumber.zero()
    }

    const query: Query = [{ eventTypes: Object.keys(handler.when) as string[], tags: {} }]
    for await (const event of eventStore.read(query, { fromSequenceNumber: currentSeqNumber.inc() })) {
        if (toSequenceNumber && event.sequenceNumber.value > toSequenceNumber.value) {
            break
        }
        if (handler.when[event.event.type]) await handler.when[event.event.type](event)

        currentSeqNumber = event.sequenceNumber
    }
    return currentSeqNumber
}
