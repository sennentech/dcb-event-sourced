import { EventStore, AppendCondition, EsEventEnvelope, EsQuery, SequenceNumber } from "@dcb-es/event-store"
import { EventHandlerWithState } from "../EventHandlerWithState"
import { matchTags } from "./matchTags"
type EventHandlers = Record<string, EventHandlerWithState>
type EventHandlerStates<T extends EventHandlers> = {
    [K in keyof T]: T[K]["init"]
}

export async function reconstitute<T extends EventHandlers>(
    eventStore: EventStore,
    eventHandlers: T
): Promise<{ state: EventHandlerStates<T>; appendCondition: AppendCondition }> {
    const defaultHandler = (_event: EsEventEnvelope, state: EventHandlerStates<T>) => state
    const states = Object.fromEntries(Object.entries(eventHandlers).map(([key, value]) => [key, value.init]))

    const query: EsQuery = {
        criteria: Object.values(eventHandlers).map(proj => ({
            tags: proj.tagFilter,
            eventTypes: Object.keys(proj.when) as string[]
        }))
    }

    let maxSequenceNumber = SequenceNumber.zero()
    for await (const eventEnvelope of eventStore.read(query)) {
        const { event, sequenceNumber } = eventEnvelope

        for (const [handlerId, eventHandler] of Object.entries(eventHandlers)) {
            const handlerIsRelevant =
                eventHandler.when[event.type] && matchTags({ tags: event.tags, tagFilter: eventHandler.tagFilter })

            const handler = handlerIsRelevant ? eventHandler.when[event.type] : defaultHandler
            states[handlerId] = await handler(eventEnvelope, states[handlerId])
        }
        if (sequenceNumber > maxSequenceNumber) maxSequenceNumber = sequenceNumber
    }

    return { state: states as EventHandlerStates<T>, appendCondition: { query, maxSequenceNumber } }
}
