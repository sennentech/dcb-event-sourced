import { EventEnvelope, EventStore, AppendCondition, Query, DcbEvent, ReadOptions, Queries } from "../EventStore"
import { SequencePosition } from "../../SequencePosition"
import { Timestamp } from "../../Timestamp"
import { isSeqOutOfRange, matchesCriterion as matchesQueryItem, deduplicateEvents } from "./utils"

export const ensureIsArray = (events: DcbEvent | DcbEvent[]) => (Array.isArray(events) ? events : [events])

const maxSeqNo = (events: EventEnvelope[]) =>
    events
        .map(event => event.sequencePosition)
        .filter(seqNum => seqNum !== undefined)
        .pop() || SequencePosition.zero()

export class MemoryEventStore implements EventStore {
    private testListenerRegistry: { read: () => void; append: () => void } = {
        read: () => null,
        append: () => null
    }

    private events: Array<EventEnvelope> = []

    constructor(initialEvents: Array<EventEnvelope> = []) {
        this.events = [...initialEvents]
    }

    public on(ev: "read" | "append", fn: () => void) {
        this.testListenerRegistry[ev] = fn
    }

    async *read(query: Query, options?: ReadOptions): AsyncGenerator<EventEnvelope> {
        yield* this.#read({ query, options })
    }
    async *#read({ query, options }: { query: Query; options?: ReadOptions }): AsyncGenerator<EventEnvelope> {
        if (this.testListenerRegistry.read) this.testListenerRegistry.read()

        const step = options?.backwards ? -1 : 1
        const maxSequencePosition = maxSeqNo(this.events)
        const defaultSequencePosition = options?.backwards ? maxSequencePosition : SequencePosition.zero()
        let currentSequencePosition = options?.fromSequencePosition ?? defaultSequencePosition
        let yieldedCount = 0

        const allMatchedEvents =
            query !== Queries.all
                ? query.flatMap((criterion, index) => {
                      const matchedEvents = this.events
                          .filter(
                              event =>
                                  !isSeqOutOfRange(
                                      event.sequencePosition,
                                      currentSequencePosition,
                                      options?.backwards
                                  ) && matchesQueryItem(criterion, event)
                          )
                          .map(event => ({ ...event, matchedCriteria: [index.toString()] }))
                          .sort((a, b) => a.sequencePosition.value - b.sequencePosition.value)

                      return criterion.onlyLastEvent ? matchedEvents.slice(-1) : matchedEvents
                  })
                : this.events.filter(
                      ev => !isSeqOutOfRange(ev.sequencePosition, currentSequencePosition, options?.backwards)
                  )

        const uniqueEvents = deduplicateEvents(allMatchedEvents)
            .sort((a, b) => a.sequencePosition.value - b.sequencePosition.value)
            .sort((a, b) =>
                options?.backwards
                    ? b.sequencePosition.value - a.sequencePosition.value
                    : a.sequencePosition.value - b.sequencePosition.value
            )

        for (const event of uniqueEvents) {
            yield event
            yieldedCount++
            if (options?.limit && yieldedCount >= options.limit) {
                break
            }
            currentSequencePosition = event.sequencePosition.plus(step)
        }
    }

    async append(events: DcbEvent | DcbEvent[], appendCondition?: AppendCondition): Promise<void> {
        if (this.testListenerRegistry.append) this.testListenerRegistry.append()
        const nextSequencePosisition = maxSeqNo(this.events).inc()
        const eventEnvelopes: Array<EventEnvelope> = ensureIsArray(events).map((ev, i) => ({
            event: ev,
            timestamp: Timestamp.now(),
            sequencePosition: nextSequencePosisition.plus(i)
        }))

        if (appendCondition) {
            const { query, expectedCeiling: maxSequencePosition } = appendCondition

            const matchingEvents = getMatchingEvents(query, maxSequencePosition, this.events)

            if (matchingEvents.length > 0)
                throw new Error("Expected Version fail: New events matching appendCondition found.")
        }

        this.events.push(...eventEnvelopes)
    }
}

const getMatchingEvents = (query: Query, maxSeqNo: SequencePosition, events: EventEnvelope[]) => {
    if (query === Queries.all)
        return events.filter(event => !isSeqOutOfRange(event.sequencePosition, maxSeqNo.plus(1), false))

    return (query ?? []).flatMap(queryItem =>
        events.filter(
            event =>
                !isSeqOutOfRange(event.sequencePosition, maxSeqNo.plus(1), false) && matchesQueryItem(queryItem, event)
        )
    )
}
