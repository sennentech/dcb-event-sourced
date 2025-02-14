import { EventEnvelope, QueryItem } from "../EventStore"
import { SequencePosition } from "../../SequencePosition"
import { matchTags } from "../../eventHandling/matchTags"

export const isSeqOutOfRange = (
    sequencePosition: SequencePosition,
    fromSequencePosition: SequencePosition,
    backwards: boolean | undefined
) => (backwards ? sequencePosition > fromSequencePosition : sequencePosition < fromSequencePosition)

export const deduplicateEvents = (events: EventEnvelope[]): EventEnvelope[] => {
    const uniqueEventsMap = new Map<number, EventEnvelope>()

    for (const event of events) {
        if (!uniqueEventsMap.has(event.sequencePosition.value)) {
            uniqueEventsMap.set(event.sequencePosition.value, event)
        }
    }

    return Array.from(uniqueEventsMap.values())
}

export const matchesQueryItem = (queryItem: QueryItem, { event }: EventEnvelope) => {
    //query item does not contain relevant event type
    if (queryItem.eventTypes && queryItem.eventTypes.length > 0 && !queryItem.eventTypes.includes(event.type))
        return false

    return matchTags({ tagFilter: queryItem.tags, tags: event.tags })
}
