import { EsQuery, EventStore } from "../../eventStore/src/EventStore"
import { SequenceNumber } from "../../eventStore/src/SequenceNumber"
import { PersistentStateEventHandler, PartitionedStateEventHandler, EventHandler as EventHandler } from "./EventHandler"
import * as R from "ramda"

const buildQuery = (eventHandler: EventHandler): EsQuery => ({
    criteria: [{ tags: eventHandler.tagFilter, eventTypes: R.keys(eventHandler.when) as string[] }]
})

export async function handleEvents<TEventHandler extends PersistentStateEventHandler | PartitionedStateEventHandler>(
    eventStore: EventStore,
    eventHandler: TEventHandler,
    lastSequenceNumberSeen?: SequenceNumber
): Promise<{ lastSequenceNumberSeen: SequenceNumber }> {
    type State = TEventHandler["init"]

    const query = buildQuery(eventHandler)
    const { stateManager: unpartitionedStateManager } = eventHandler as PersistentStateEventHandler
    const { partitionByTags, stateManager: partitionedStateManager } = eventHandler as PartitionedStateEventHandler

    const stateCache: Record<string, State> = {}
    for await (const eventEnvelope of eventStore.read(query, { fromSequenceNumber: lastSequenceNumberSeen })) {
        const { event, sequenceNumber } = eventEnvelope

        const partititionedHandler = {
            partitionKey: partitionByTags(event.tags),
            readState: async (): Promise<State> => partitionedStateManager.read(partitionKey),
            writeState: async (state: State): Promise<void> => partitionedStateManager.save(partitionKey, state)
        }
        const unpartitionedHandler = {
            partitionKey: "unpartitioned",
            readState: async (): Promise<State> => unpartitionedStateManager.read(),
            writeState: async (state: State): Promise<void> => unpartitionedStateManager.save(state)
        }
        const { partitionKey, readState, writeState } = partitionByTags ? partititionedHandler : unpartitionedHandler

        if (!stateCache[partitionKey]) {
            stateCache[partitionKey] = (await readState()) ?? eventHandler.init
        }
        const handlerFn = R.has(event.type, eventHandler.when) ? eventHandler.when[event.type] : R.identity
        const newState = await handlerFn(eventEnvelope, stateCache[partitionKey])
        await writeState(newState)
        lastSequenceNumberSeen = sequenceNumber
    }
    return { lastSequenceNumberSeen }
}
