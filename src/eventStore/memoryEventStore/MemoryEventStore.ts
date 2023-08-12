import { EsEventEnvelope, EventStore, AppendCondition, EsQuery, EsEvent } from "../EventStore"
import * as R from "ramda"
import { SequenceNumber } from "../SequenceNumber"
import { Timestamp } from "../TimeStamp"
import { getNextMatchingEvent } from "./getNextMatchingEvent"

export const ensureArray = (events: EsEvent | EsEvent[]) =>
    R.is(Array, events) ? <EsEvent[]>events : [<EsEvent>events]

const maxSeqNo = R.pipe<unknown[], EsEventEnvelope, number, number>(
    R.last,
    R.path(["sequenceNumber", "value"]),
    R.defaultTo(0)
)

export class MemoryEventStore implements EventStore {
    private events: Array<EsEventEnvelope> = []

    async *read(query: EsQuery, fromSequenceNumber?: SequenceNumber): AsyncGenerator<EsEventEnvelope> {
        let currentSequenceNumberValue = fromSequenceNumber?.value ?? SequenceNumber.first().value

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

    async *readBackward(query: EsQuery, fromSequenceNumber?: SequenceNumber): AsyncGenerator<EsEventEnvelope> {
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
        const eventEnvelopes: Array<EsEventEnvelope> = ensureArray(events).map((ev, i) => ({
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

        this.events.push(...eventEnvelopes)
        return {
            lastSequenceNumber: SequenceNumber.create(maxSeqNo(this.events))
        }
    }
}
