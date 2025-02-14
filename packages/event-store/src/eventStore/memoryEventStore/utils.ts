import { EventEnvelope, QueryItem } from "../EventStore"
import { SequencePosition } from "../../SequencePosition"

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

const makeArray = (str: string | string[]) => (Array.isArray(str) ? str : [str])

export const matchesCriterion = ({ eventTypes, tags }: QueryItem, { event }: EventEnvelope) => {
    if (eventTypes && eventTypes.length > 0 && !eventTypes.includes(event.type)) return false

    const tagKeys = Object.keys(tags ?? {})
    if (tagKeys.length > 0 && tagKeys.some(tagKey => !(tagKey in event.tags))) return false

    return tagKeys.every(tagKey =>
        makeArray((tags ?? {})[tagKey]).some(tagValue => makeArray(event.tags[tagKey]).includes(tagValue))
    )
}
