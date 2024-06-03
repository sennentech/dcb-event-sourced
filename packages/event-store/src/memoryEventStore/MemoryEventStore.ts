import {
    EsEventEnvelope,
    EventStore,
    AppendCondition,
    EsQuery,
    EsEvent,
    AnyCondition,
    EsReadOptions
} from "../EventStore"
import { SequenceNumber } from "../SequenceNumber"
import { Timestamp } from "../Timestamp"
import { isSeqOutOfRange, matchesCriterion, deduplicateEvents } from "./utils"

export const ensureIsArray = (events: EsEvent | EsEvent[]) =>
    Array.isArray(events) ? events : [events]

const maxSeqNo = (events: EsEventEnvelope[]) => 
    events
      .map(event => event.sequenceNumber)
      .filter(seqNum => seqNum !== undefined)
      .pop() || SequenceNumber.zero();

export class MemoryEventStore implements EventStore {
    private testListenerRegistry = {
        read: () => null,
        append: () => null
    }

    private events: Array<EsEventEnvelope> = []

    constructor(initialEvents: Array<EsEventEnvelope> = []) {
        this.events = [...initialEvents]
    }

    public on(ev: "read" | "append", fn: () => void) {
        this.testListenerRegistry[ev] = fn
    }
    async *readAll(options?: EsReadOptions): AsyncGenerator<EsEventEnvelope> {
        yield* this.#read({ query: null, options: options })
    }

    async *read(query: EsQuery, options?: EsReadOptions): AsyncGenerator<EsEventEnvelope> {
        yield* this.#read({ query, options })
    }
    async *#read({ query, options }: { query?: EsQuery; options?: EsReadOptions }): AsyncGenerator<EsEventEnvelope> {
        if (this.testListenerRegistry.read) this.testListenerRegistry.read()

        const step = options?.backwards ? -1 : 1
        const maxSequenceNumber = maxSeqNo(this.events)
        const defaultSeqNumber = options?.backwards ? maxSequenceNumber : SequenceNumber.zero()
        let currentSequenceNumber = options?.fromSequenceNumber ?? defaultSeqNumber
        let yieldedCount = 0

        const allMatchedEvents = query?.criteria
            ? query.criteria.flatMap((criterion, index) => {
                  const matchedEvents = this.events
                      .filter(
                          event =>
                              !isSeqOutOfRange(event.sequenceNumber, currentSequenceNumber, options?.backwards) &&
                              matchesCriterion(criterion, event)
                      )
                      .map(event => ({ ...event, matchedCriteria: [index.toString()] }))
                      .sort((a, b) => a.sequenceNumber.value - b.sequenceNumber.value)

                  return criterion.onlyLastEvent ? matchedEvents.slice(-1) : matchedEvents
              })
            : this.events.filter(ev => !isSeqOutOfRange(ev.sequenceNumber, currentSequenceNumber, options?.backwards))

        const uniqueEvents = deduplicateEvents(allMatchedEvents)
            .sort((a, b) => a.sequenceNumber.value - b.sequenceNumber.value)
            .sort((a, b) =>
                options?.backwards
                    ? b.sequenceNumber.value - a.sequenceNumber.value
                    : a.sequenceNumber.value - b.sequenceNumber.value
            )

        for (const event of uniqueEvents) {
            yield event
            yieldedCount++
            if (options?.limit && yieldedCount >= options.limit) {
                break
            }
            currentSequenceNumber = event.sequenceNumber.plus(step)
        }
    }

    async append(
        events: EsEvent | EsEvent[],
        appendCondition: AppendCondition | AnyCondition
    ): Promise<EsEventEnvelope[]> {
        if (this.testListenerRegistry.append) this.testListenerRegistry.append()
        const nextSequenceNumber = maxSeqNo(this.events).inc()
        const eventEnvelopes: Array<EsEventEnvelope> = ensureIsArray(events).map((ev, i) => ({
            event: ev,
            timestamp: Timestamp.now(),
            sequenceNumber: nextSequenceNumber.plus(i)
        }))

        if (!appendCondition) throw new Error("No append condition provided. Use AppendCondition.None if not required.")

        if (appendCondition !== "Any") {
            const { query, maxSequenceNumber } = appendCondition

            const matchingEvents = (query?.criteria ?? []).flatMap(criterion =>
                this.events.filter(
                    event =>
                        !isSeqOutOfRange(event.sequenceNumber, maxSequenceNumber.plus(1), false) &&
                        matchesCriterion(criterion, event)
                )
            )

            if (matchingEvents.length > 0)
                throw new Error("Expected Version fail: New events matching appendCondition found.")
        }

        this.events.push(...eventEnvelopes)
        return eventEnvelopes
    }
}
