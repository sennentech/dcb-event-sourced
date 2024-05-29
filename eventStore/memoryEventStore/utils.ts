import { EsEventEnvelope, EsQueryCriterion } from "../EventStore"
import { SequenceNumber } from "../SequenceNumber"

export const isSeqOutOfRange = (
    sequenceNumber: SequenceNumber,
    fromSequenceNumber: SequenceNumber,
    backwards: boolean
) => (backwards ? sequenceNumber > fromSequenceNumber : sequenceNumber < fromSequenceNumber)

export const deduplicateEvents = (events: EsEventEnvelope[]): EsEventEnvelope[] => {
    const uniqueEventsMap = new Map<number, EsEventEnvelope>()

    for (const event of events) {
        if (uniqueEventsMap.has(event.sequenceNumber.value)) {
            uniqueEventsMap.get(event.sequenceNumber.value).matchedCriteria.push(...event.matchedCriteria)
        } else {
            uniqueEventsMap.set(event.sequenceNumber.value, event)
        }
    }

    return Array.from(uniqueEventsMap.values())
}

const makeArray = (str: string | string[]) => (Array.isArray(str) ? str : [str])

export const matchesCriterion = ({ eventTypes, tags }: EsQueryCriterion, { event }: EsEventEnvelope) => {
    if (eventTypes.length > 0 && !eventTypes.includes(event.type)) return false

    const tagKeys = Object.keys(tags ?? {})
    if (tagKeys.length > 0 && tagKeys.some(tagKey => !(tagKey in event.tags))) return false

    return tagKeys.every(tagKey =>
        makeArray(tags[tagKey]).some(tagValue => makeArray(event.tags[tagKey]).includes(tagValue))
    )
}
