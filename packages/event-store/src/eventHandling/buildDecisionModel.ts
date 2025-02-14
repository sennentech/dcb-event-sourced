import { AppendCondition, EventEnvelope, EventStore, Query } from "../eventStore/EventStore"
import { SequencePosition } from "../SequencePosition"
import { Tags } from "../Tags"
import { EventHandlerWithState } from "./EventHandlerWithState"
import { matchTags } from "./matchTags"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventHandlers = Record<string, EventHandlerWithState<any, any>>
type EventHandlerStates<T extends EventHandlers> = {
    [K in keyof T]: T[K]["init"]
}

export async function buildDecisionModel<T extends EventHandlers>(
    eventStore: EventStore,
    eventHandlers: T
): Promise<{ state: EventHandlerStates<T>; appendCondition: AppendCondition }> {
    const defaultHandler = (_: EventEnvelope, state: EventHandlerStates<T>) => state
    const states = Object.fromEntries(Object.entries(eventHandlers).map(([key, value]) => [key, value.init]))

    const query: Query = Object.values(eventHandlers).map(proj => ({
        tags: proj.tagFilter as Tags,
        eventTypes: Object.keys(proj.when) as string[]
    }))

    let expectedCeiling = SequencePosition.zero()
    for await (const eventEnvelope of eventStore.read(query)) {
        const { event, sequencePosition } = eventEnvelope

        for (const [handlerId, eventHandler] of Object.entries(eventHandlers)) {
            const handlerIsRelevant =
                eventHandler.when[event.type] &&
                matchTags({ tags: event.tags, tagFilter: eventHandler.tagFilter as Tags })

            const handler = handlerIsRelevant ? eventHandler.when[event.type] : defaultHandler
            states[handlerId] = await handler(eventEnvelope, states[handlerId] as EventHandlerStates<T>)
        }
        if (sequencePosition > expectedCeiling) expectedCeiling = sequencePosition
    }

    return { state: states as EventHandlerStates<T>, appendCondition: { query, expectedCeiling } }
}
