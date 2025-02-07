import { EventStore, Queries, Query, SequenceNumber } from "@dcb-es/event-store"
import { EventHandler } from "@dcb-es/event-handling"
import { PoolClient } from "pg"
export type HandlerCheckPoints = Record<string, SequenceNumber>

export const POSTGRES_TABLE_NAME = "_event_handler_bookmarks"

export const catchupHandlers = async (
    client: PoolClient,
    eventStore: EventStore,
    handlers: Record<string, EventHandler>
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
    await updateBookmarksAndReleaseLocks(client, currentCheckPoints)
}

const lockHandlers = async (
    client: PoolClient,
    handlers: Record<string, EventHandler>
): Promise<HandlerCheckPoints> => {
    try {
        const selectResult = await client.query(
            `
            SELECT handler_id, last_sequence_number
            FROM ${POSTGRES_TABLE_NAME}
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
        if (error.code === "55P03") {
            throw new Error("Could not obtain lock as it is already locked by another process")
        }
        throw error
    }
}

const updateBookmarksAndReleaseLocks = async (client: PoolClient, locks: HandlerCheckPoints): Promise<void> => {
    if (Object.values(locks).some(lock => !lock)) throw new Error("Sequence number is required to commit")

    const updateValues = Object.keys(locks)
        .map((_, index) => `($${index * 2 + 1}::text, $${index * 2 + 2}::bigint)`)
        .join(", ")

    const updateParams = Object.entries(locks).flatMap(([handlerId, sequenceNumber]) => [
        handlerId,
        sequenceNumber.value
    ])

    const updateQuery = `
        UPDATE ${POSTGRES_TABLE_NAME} SET last_sequence_number = v.last_sequence_number
        FROM (VALUES ${updateValues}) AS v(handler_id, last_sequence_number)
        WHERE ${POSTGRES_TABLE_NAME}.handler_id = v.handler_id;`

    await client.query(updateQuery, updateParams)
}

export const catchupHandler = async (
    handler: EventHandler,
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
        if (event.sequenceNumber.value > toSequenceNumber.value) {
            break
        }
        if (handler.when[event.event.type]) await handler.when[event.event.type](event)

        currentSeqNumber = event.sequenceNumber
    }
    return currentSeqNumber
}
