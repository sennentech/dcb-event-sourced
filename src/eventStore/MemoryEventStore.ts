import { EsEvent, StoredEvent, EventStore, AppendCondition, EsQuery, ReadOptions } from "../EventStore"
import * as R from "ramda"
import { SequenceNumber } from "../valueObjects/SequenceNumber"
import { Timestamp } from "../valueObjects/TimeStamp"
import { queryStoredEvents } from "./queryStoredEvents"

export const ensureArray = (domainEvents: EsEvent | EsEvent[]) =>
    R.is(Array, domainEvents) ? <EsEvent[]>domainEvents : [<EsEvent>domainEvents]

const getLastSequenceNumberValue = R.pipe<any[], StoredEvent, number, number>(
    R.last,
    R.path(["sequenceNumber", "value"]),
    R.defaultTo(0)
)

export class MemoryEventStore implements EventStore {
    private storedEvents: Array<StoredEvent> = []

    async append(
        events: EsEvent | EsEvent[],
        appendCondition: AppendCondition | "None"
    ): Promise<{
        lastSequenceNumber: SequenceNumber
    }> {
        const nextSequenceNumberValue = getLastSequenceNumberValue(this.storedEvents) + 1
        const storedEvents: Array<StoredEvent> = ensureArray(events).map((ev, i) => ({
            event: ev,
            timestamp: Timestamp.now(),
            sequenceNumber: SequenceNumber.create(nextSequenceNumberValue + i)
        }))

        if (!appendCondition) throw new Error("No append condition provided. Use AppendCondition.None if not required.")
        if (appendCondition !== "None") {
            const { query, maxSequenceNumber } = appendCondition
            const newEvents = queryStoredEvents(this.storedEvents, {
                direction: "forwards",
                query,
                fromSequenceNumber: SequenceNumber.create(maxSequenceNumber.value + 1)
            })
            if (newEvents) throw new Error("Expected Version fail: New events matching appendCondition found.")
        }

        this.storedEvents.push(...storedEvents)
        return {
            lastSequenceNumber: SequenceNumber.create(getLastSequenceNumberValue(this.storedEvents))
        }
    }

    async readForward(query: EsQuery, readOptions?: ReadOptions): Promise<StoredEvent[]> {
        const { limit, fromSequenceNumber } = readOptions ?? {}
        return queryStoredEvents(this.storedEvents, {
            direction: "forwards",
            query,
            limit,
            fromSequenceNumber
        })
    }
    async readBackward(query: EsQuery, readOptions?: ReadOptions): Promise<StoredEvent[]> {
        const { limit, fromSequenceNumber } = readOptions ?? {}
        return queryStoredEvents(this.storedEvents, {
            direction: "backwards",
            query,
            limit,
            fromSequenceNumber
        })
    }
}
