import * as R from "ramda"
import { AppendCondition, EsEventEnvelope, EsQuery, EventStore } from "../eventStore/EventStore"
import { EsEventListener } from "./EsEventListener"
import { SequenceNumber } from "../eventStore/SequenceNumber"

type EventListeners = Record<string, EsEventListener>
type EventListenerStates<T extends EventListeners> = {
    [K in keyof T]: T[K]["init"]
}

export async function reconstitute<T extends EventListeners>(
    eventStore: EventStore,
    eventListeners: T
): Promise<{ states: EventListenerStates<T>; appendCondition: AppendCondition }> {
    const states = R.map(R.prop("init"), eventListeners) as EventListenerStates<T>

    const query: EsQuery = {
        criteria: R.values(
            R.map(proj => ({ tags: proj.tagFilter, eventTypes: R.keys(proj.when) as string[] }), eventListeners)
        )
    }
    const fromSequenceNumber = SequenceNumber.first()

    let maxSequenceNumber = SequenceNumber.first()
    for await (const eventEnvelope of eventStore.read(query, fromSequenceNumber)) {
        for (const [stateKey, eventListener] of R.toPairs(eventListeners)) {
            const { event, sequenceNumber } = eventEnvelope
            const defaultHandler = (_event: EsEventEnvelope, state: EventListenerStates<T>) => state
            const handler = R.has(event.type, eventListener.when) ? eventListener.when[event.type] : defaultHandler

            states[stateKey] = await handler(eventEnvelope, states[stateKey])
            if (sequenceNumber > maxSequenceNumber) maxSequenceNumber = sequenceNumber
        }
    }

    return { states, appendCondition: { query, maxSequenceNumber } }
}
