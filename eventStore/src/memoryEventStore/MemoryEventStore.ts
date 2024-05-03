import {
    EsEventEnvelope,
    EventStore,
    AppendCondition,
    EsQuery,
    EsEvent,
    AnyCondition,
    EsReadOptions
} from "../EventStore"
import * as R from "ramda"
import { SequenceNumber } from "../SequenceNumber"
import { Timestamp } from "../TimeStamp"
import { getNextMatchingEvent } from "./getNextMatchingEvent"

export const ensureIsArray = (events: EsEvent | EsEvent[]) => (R.is(Array, events) ? events : [events])

const maxSeqNo = R.pipe<unknown[], EsEventEnvelope, number, number>(
    R.last,
    R.path(["sequenceNumber", "value"]),
    R.defaultTo(0)
)

export class MemoryEventStore implements EventStore {
    private events: Array<EsEventEnvelope> = []

    constructor(initialEvents: Array<EsEventEnvelope> = []) {
        this.events = [...initialEvents]
    }

    async *readAll(options?: EsReadOptions): AsyncGenerator<EsEventEnvelope> {
        yield* this.#read({ query: null, options: options })
    }

    async *read(query: EsQuery, options?: EsReadOptions): AsyncGenerator<EsEventEnvelope> {
        yield* this.#read({ query, options })
    }

    async *#read({ query, options }: { query?: EsQuery; options?: EsReadOptions }): AsyncGenerator<EsEventEnvelope> {
        const backwards = options?.backwards
        const maxSequenceNumber = maxSeqNo(this.events)
        const defaultSeqNumber = backwards ? maxSequenceNumber : SequenceNumber.zero().value
        let currentSequenceNumberValue = options?.fromSequenceNumber?.value ?? defaultSeqNumber

        while (currentSequenceNumberValue <= maxSeqNo(this.events)) {
            const resultEvent = getNextMatchingEvent(this.events, {
                direction: options?.backwards ? "backwards" : "forwards",
                query,
                fromSequenceNumber: SequenceNumber.create(currentSequenceNumberValue)
            })
            if (resultEvent) {
                yield resultEvent
            }
            currentSequenceNumberValue = resultEvent?.sequenceNumber?.value + (options?.backwards ? -1 : 1)
        }
    }

    async reset() {
        this.events = []
    }

    async append(
        events: EsEvent | EsEvent[],
        appendCondition: AppendCondition | AnyCondition
    ): Promise<{
        lastSequenceNumber: SequenceNumber
    }> {
        const nextSequenceNumberValue = maxSeqNo(this.events) + 1
        const eventEnvelopes: Array<EsEventEnvelope> = ensureIsArray(events).map((ev, i) => ({
            event: ev,
            timestamp: Timestamp.now(),
            sequenceNumber: SequenceNumber.create(nextSequenceNumberValue + i)
        }))

        if (!appendCondition) throw new Error("No append condition provided. Use AppendCondition.None if not required.")
        if (appendCondition !== "Any") {
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
