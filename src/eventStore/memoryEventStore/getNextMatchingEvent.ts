import R = require("ramda")
import { StoredEsEvent, EsQuery, EsQueryCriterion } from "../EventStore"
import { SequenceNumber } from "../SequenceNumber"

const makeArray = (str: string | string[]) => (R.is(Array, str) ? str : [str])

export const getNextMatchingEvent = (
    storedEvents: StoredEsEvent[],
    {
        direction,
        query,
        fromSequenceNumber
    }: { direction: "forwards" | "backwards"; query: EsQuery; fromSequenceNumber?: SequenceNumber }
): StoredEsEvent => {
    const filtered = storedEvents.filter(event => {
        if (
            fromSequenceNumber &&
            ((direction === "forwards" && event.sequenceNumber.lessThan(fromSequenceNumber)) ||
                (direction === "backwards" && event.sequenceNumber.greaterThan(fromSequenceNumber)))
        ) {
            return false
        }

        if (!query.criteria || query.criteria.length === 0) return true

        for (const criterion of query.criteria) {
            if (matchesCriterion(criterion, event)) return true
        }
        return false
    })

    const ordered = direction === "forwards" ? filtered : R.reverse(filtered)
    return R.head(ordered)
}

const matchesCriterion = ({ eventTypes, tags }: EsQueryCriterion, event: StoredEsEvent) => {
    if (eventTypes.length > 0 && !R.includes(event.type, eventTypes)) return false

    const tagKeys = R.keys(tags)

    //query contains tag key that is not on event
    if (tagKeys.length > 0 && R.difference(tagKeys, R.keys(event.tags)).length > 0) return false

    for (const tagKey of tagKeys) {
        const queryTagValues = makeArray(tags[tagKey])
        const eventTagValues = makeArray(event.tags[tagKey])

        //no matching tag values
        if (R.intersection(queryTagValues, eventTagValues).length === 0) return false
    }
    return true
}
