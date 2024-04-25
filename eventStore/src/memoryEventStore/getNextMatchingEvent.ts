import R = require("ramda")
import { EsEventEnvelope, EsQuery, EsQueryCriterion } from "../EventStore"
import { SequenceNumber } from "../SequenceNumber"

const makeArray = (str: string | string[]) => (R.is(Array, str) ? str : [str])

export const getNextMatchingEvent = (
    eventEnvelopes: EsEventEnvelope[],
    {
        direction,
        query,
        fromSequenceNumber
    }: { direction: "forwards" | "backwards"; query: EsQuery; fromSequenceNumber?: SequenceNumber }
): EsEventEnvelope => {
    const filtered = eventEnvelopes.filter(event => {
        const { sequenceNumber } = event
        const seqNoOutOfRange =
            fromSequenceNumber &&
            ((direction === "forwards" && sequenceNumber < fromSequenceNumber) ||
                (direction === "backwards" && sequenceNumber > fromSequenceNumber))

        const noQueryCriteria = !query.criteria || query.criteria.length === 0

        if (seqNoOutOfRange) return false
        if (noQueryCriteria) return true

        for (const criterion of query.criteria) {
            if (matchesCriterion(criterion, event)) return true
        }
        return false
    })

    const ordered = direction === "forwards" ? filtered : R.reverse(filtered)
    return R.head(ordered)
}

const matchesCriterion = ({ eventTypes, tags }: EsQueryCriterion, { event }: EsEventEnvelope) => {
    const hasEventTypesNotOnEvent = eventTypes.length > 0 && !R.includes(event.type, eventTypes)
    if (hasEventTypesNotOnEvent) return false

    const tagKeys = R.keys(tags)

    const hasTagKeyNotOnEvent = tagKeys.length > 0 && R.difference(tagKeys, R.keys(event.tags)).length > 0
    if (hasTagKeyNotOnEvent) return false

    for (const tagKey of tagKeys) {
        const queryTagValues = makeArray(tags[tagKey])
        const eventTagValues = makeArray(event.tags[tagKey])

        const noTagValuesMatch = R.intersection(queryTagValues, eventTagValues).length === 0
        if (noTagValuesMatch) return false
    }
    return true
}
