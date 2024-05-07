import * as R from "ramda"
import { AppendCondition, EsEventEnvelope, EsQuery, EventStore } from "../../eventStore/src/EventStore"
import { SequenceNumber } from "../../eventStore/src/SequenceNumber"
import { EventHandlerWithState } from "./EventHandlerWithState"
import { matchTags } from "./matchTags"

type EventHandlers = Record<string, EventHandlerWithState>
type EventHandlerStates<T extends EventHandlers> = {
    [K in keyof T]: T[K]["init"]
}

export async function reconstitute<T extends EventHandlers>(
    eventStore: EventStore,
    eventHandlers: T
): Promise<{ states: EventHandlerStates<T>; appendCondition: AppendCondition }> {
    const defaultHandler = (_event: EsEventEnvelope, state: EventHandlerStates<T>) => state
    const states = R.map(R.prop("init"), eventHandlers) as EventHandlerStates<T>

    const query: EsQuery = {
        criteria: R.values(
            R.map(proj => ({ tags: proj.tagFilter, eventTypes: R.keys(proj.when) as string[] }), eventHandlers)
        )
    }

    let maxSequenceNumber = SequenceNumber.zero()
    for await (const eventEnvelope of eventStore.read(query)) {
        for (const [handlerId, eventHandler] of R.toPairs(eventHandlers)) {
            const { event, sequenceNumber } = eventEnvelope

            const handlerIsRelevant =
                R.has(event.type, eventHandler.when) &&
                matchTags({ tags: event.tags, tagFilter: eventHandler.tagFilter })

            const handler = handlerIsRelevant ? eventHandler.when[event.type] : defaultHandler

            states[handlerId] = await handler(eventEnvelope, states[handlerId])
            if (sequenceNumber > maxSequenceNumber) maxSequenceNumber = sequenceNumber
        }
    }

    return { states, appendCondition: { query, maxSequenceNumber } }
}
