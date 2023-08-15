import { EsQuery, EventStore } from "../eventStore/EventStore"
import { SequenceNumber } from "../eventStore/SequenceNumber"
import { Projection } from "./Projection"
import * as R from "ramda"

export async function handleNewEvents<T extends Projection>(
    eventStore: EventStore,
    projection: T,
    lastSequenceNumberSeen = SequenceNumber.first()
): Promise<{ state: T["init"]; lastSequenceNumberSeen: SequenceNumber }> {
    const query: EsQuery = {
        criteria: [{ tags: projection.tagFilter, eventTypes: R.keys(projection.when) as string[] }]
    }

    let state = projection.init
    for await (const eventEnvelope of eventStore.read(query, lastSequenceNumberSeen)) {
        const { event, sequenceNumber } = eventEnvelope
        const handler = R.has(event.type, projection.when) ? projection.when[event.type] : R.identity

        state = await handler(eventEnvelope, state)
        lastSequenceNumberSeen = sequenceNumber
    }

    return { state, lastSequenceNumberSeen }
}
