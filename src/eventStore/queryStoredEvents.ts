import R = require("ramda")
import { EsQuery, StoredEvent } from "../EventStore"
import { SequenceNumber } from "../valueObjects/SequenceNumber"

export const queryStoredEvents = (
    storedEvents: StoredEvent[],
    {
        direction,
        query,
        limit,
        fromSequenceNumber
    }: { direction: "forwards" | "backwards"; query: EsQuery; limit?: number; fromSequenceNumber?: SequenceNumber }
): StoredEvent[] => {
    const filtered = storedEvents.filter(({ sequenceNumber, event }) => {
        if (
            fromSequenceNumber &&
            ((direction === "forwards" && sequenceNumber.lessThan(fromSequenceNumber)) ||
                (direction === "backwards" && sequenceNumber.greaterThan(fromSequenceNumber)))
        ) {
            return false
        }

        if (!query.criteria || query.criteria.length === 0) return true

        return R.any(({ domainIds, eventTypes }) => {
            if (eventTypes.length > 0 && !R.includes(event.type, eventTypes)) return false

            return true
        }, query.criteria)
    })

    const ordered = direction === "forwards" ? filtered : R.reverse(filtered)
    const paged = limit && limit > 0 ? R.take(limit, ordered) : ordered
    return paged
}
