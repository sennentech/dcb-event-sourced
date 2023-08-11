import { EsEvent, EventEnvelope, EventStore, AppendCondition, EsQuery } from "../EventStore"
import * as R from "ramda"
import { SequenceNumber } from "../valueObjects/SequenceNumber"
import { Timestamp } from "../valueObjects/TimeStamp"
import { getNextMatchingEvent } from "./getNextMatchingEvent"

export const ensureArray = (domainEvents: EsEvent | EsEvent[]) =>
    R.is(Array, domainEvents) ? <EsEvent[]>domainEvents : [<EsEvent>domainEvents]

const maxSeqNo = R.pipe<any[], EventEnvelope, number, number>(
    R.last,
    R.path(["sequenceNumber", "value"]),
    R.defaultTo(0)
)

export class MemoryEventStore implements EventStore {
    private events: Array<EventEnvelope> = []

    async *read(query: EsQuery, fromSequenceNumber?: SequenceNumber): AsyncGenerator<EventEnvelope> {
        let currentSequenceNumberValue = fromSequenceNumber?.value ?? 1

        while (currentSequenceNumberValue <= maxSeqNo(this.events)) {
            const resultEvent = getNextMatchingEvent(this.events, {
                direction: "forwards",
                query,
                fromSequenceNumber: SequenceNumber.create(currentSequenceNumberValue)
            })
            if (resultEvent) {
                yield resultEvent
            }
            currentSequenceNumberValue = resultEvent?.sequenceNumber?.value + 1
        }
    }

    async *readBackward(query: EsQuery, fromSequenceNumber?: SequenceNumber): AsyncGenerator<EventEnvelope> {
        let currentSequenceNumberValue = fromSequenceNumber?.value ?? maxSeqNo(this.events)
        while (currentSequenceNumberValue > 0) {
            const resultEvent = getNextMatchingEvent(this.events, {
                direction: "backwards",
                query,
                fromSequenceNumber: SequenceNumber.create(currentSequenceNumberValue)
            })
            if (resultEvent) {
                yield resultEvent
            }

            currentSequenceNumberValue = resultEvent?.sequenceNumber?.value - 1 ?? 0
        }
    }

    async append(
        events: EsEvent | EsEvent[],
        appendCondition: AppendCondition | "None"
    ): Promise<{
        lastSequenceNumber: SequenceNumber
    }> {
        const nextSequenceNumberValue = maxSeqNo(this.events) + 1
        const storedEvents: Array<EventEnvelope> = ensureArray(events).map((ev, i) => ({
            event: ev,
            timestamp: Timestamp.now(),
            sequenceNumber: SequenceNumber.create(nextSequenceNumberValue + i)
        }))

        if (!appendCondition) throw new Error("No append condition provided. Use AppendCondition.None if not required.")
        if (appendCondition !== "None") {
            const { query, maxSequenceNumber } = appendCondition
            const newEvent = getNextMatchingEvent(this.events, {
                direction: "forwards",
                query,
                fromSequenceNumber: SequenceNumber.create(maxSequenceNumber.value + 1)
            })
            if (newEvent) throw new Error("Expected Version fail: New events matching appendCondition found.")
        }

        this.events.push(...storedEvents)
        return {
            lastSequenceNumber: SequenceNumber.create(maxSeqNo(this.events))
        }
    }
}
