import * as R from "ramda"
import { AppendCondition, EsEventEnvelope, EsQuery, EventStore } from "../../eventStore/src/EventStore"
import { EventHandler } from "./EventHandler"
import { SequenceNumber } from "../../eventStore/src/SequenceNumber"

type EventHandlers = Record<string, EventHandler>
type EventHandlerStates<T extends EventHandlers> = {
    [K in keyof T]: T[K]["init"]
}

export async function reconstitute<T extends EventHandlers>(
    eventStore: EventStore,
    eventHandlers: T
): Promise<{ states: EventHandlerStates<T>; appendCondition: AppendCondition }> {
    const states = R.map(R.prop("init"), eventHandlers) as EventHandlerStates<T>

    const query: EsQuery = {
        criteria: R.values(
            R.map(proj => ({ tags: proj.tagFilter, eventTypes: R.keys(proj.when) as string[] }), eventHandlers)
        )
    }

    let maxSequenceNumber = SequenceNumber.zero()
    for await (const eventEnvelope of eventStore.read(query)) {
        for (const [stateKey, eventHandler] of R.toPairs(eventHandlers)) {
            const { event, sequenceNumber } = eventEnvelope
            const defaultHandler = (_event: EsEventEnvelope, state: EventHandlerStates<T>) => state
            const handler = R.has(event.type, eventHandler.when) ? eventHandler.when[event.type] : defaultHandler

            states[stateKey] = await handler(eventEnvelope, states[stateKey])
            if (sequenceNumber > maxSequenceNumber) maxSequenceNumber = sequenceNumber
        }
    }

    return { states, appendCondition: { query, maxSequenceNumber } }
}
