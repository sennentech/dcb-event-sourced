import { EsQuery, EventStore } from "../eventStore/EventStore"
import { SequenceNumber } from "../eventStore/SequenceNumber"
import { PersistentStateEventListener, PartitionedStateEventListener, EsEventListener } from "./EsEventListener"
import * as R from "ramda"

const buildQuery = (eventListener: EsEventListener): EsQuery => ({
    criteria: [{ tags: eventListener.tagFilter, eventTypes: R.keys(eventListener.when) as string[] }]
})

export async function applyEventsToListener<
    TEventListener extends PersistentStateEventListener | PartitionedStateEventListener
>(
    eventStore: EventStore,
    eventListener: TEventListener,
    lastSequenceNumberSeen?: SequenceNumber
): Promise<{ lastSequenceNumberSeen: SequenceNumber }> {
    type State = TEventListener["init"]

    const query = buildQuery(eventListener)
    const { stateManager: unpartitionedStateManager } = eventListener as PersistentStateEventListener
    const { partitionByTags, stateManager: partitionedStateManager } = eventListener as PartitionedStateEventListener

    const stateCache: Record<string, State> = {}
    for await (const eventEnvelope of eventStore.read(query, lastSequenceNumberSeen)) {
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
            stateCache[partitionKey] = (await readState()) ?? eventListener.init
        }
        const eventHandler = R.has(event.type, eventListener.when) ? eventListener.when[event.type] : R.identity
        const newState = await eventHandler(eventEnvelope, stateCache[partitionKey])
        await writeState(newState)
        lastSequenceNumberSeen = sequenceNumber
    }
    return { lastSequenceNumberSeen }
}
