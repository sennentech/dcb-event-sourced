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

const maxSeqNo = R.pipe<unknown[], EsEventEnvelope, SequenceNumber, SequenceNumber>(
    R.last,
    R.prop("sequenceNumber"),
    R.defaultTo(SequenceNumber.zero())
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
        const step = options?.backwards ? -1 : 1
        const backwards = options?.backwards
        const maxSequenceNumber = maxSeqNo(this.events)
        const defaultSeqNumber = backwards ? maxSequenceNumber : SequenceNumber.zero()

        let currentSequenceNumber = options?.fromSequenceNumber ?? defaultSeqNumber

        while (currentSequenceNumber <= maxSequenceNumber) {
            console.log(SequenceNumber.create(5) >= SequenceNumber.create(5))
            const resultEvent = getNextMatchingEvent(this.events, {
                direction: options?.backwards ? "backwards" : "forwards",
                query,
                fromSequenceNumber: currentSequenceNumber
            })
            if (resultEvent) {
                yield resultEvent
                currentSequenceNumber = resultEvent.sequenceNumber.plus(step)
            } else {
                break
            }
        }
    }

    async append(
        events: EsEvent | EsEvent[],
        appendCondition: AppendCondition | AnyCondition
    ): Promise<{
        lastSequenceNumber: SequenceNumber
    }> {
        const nextSequenceNumber = maxSeqNo(this.events).inc()
        const eventEnvelopes: Array<EsEventEnvelope> = ensureIsArray(events).map((ev, i) => ({
            event: ev,
            timestamp: Timestamp.now(),
            sequenceNumber: nextSequenceNumber.plus(i)
        }))

        if (!appendCondition) throw new Error("No append condition provided. Use AppendCondition.None if not required.")
        if (appendCondition !== "Any") {
            const { query, maxSequenceNumber } = appendCondition
            const newEvent = getNextMatchingEvent(this.events, {
                direction: "forwards",
                query,
                fromSequenceNumber: maxSequenceNumber.plus(1)
            })
            if (newEvent) throw new Error("Expected Version fail: New events matching appendCondition found.")
        }

        this.events.push(...eventEnvelopes)
        return {
            lastSequenceNumber: maxSeqNo(this.events)
        }
    }
}
