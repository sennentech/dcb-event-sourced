import { SequenceNumber } from "./SequenceNumber"
import { Timestamp } from "./TimeStamp"

export type Tags = Record<string, string | string[]>

export interface EsEvent {
    type: string
    tags: Tags
    data: unknown
}

export interface EsEventEnvelope<T extends EsEvent = EsEvent> {
    event: T
    timestamp: Timestamp
    sequenceNumber: SequenceNumber
}

export interface EsQueryCriterion {
    tags: Tags
    eventTypes: string[]
}

export interface EsQuery {
    criteria: EsQueryCriterion[]
}

export type AnyCondition = "Any"

export const AppendConditions: Record<AnyCondition, AnyCondition> = {
    Any: "Any"
}
export type AppendCondition = {
    query: EsQuery
    maxSequenceNumber: SequenceNumber
}

export interface EventStore {
    append: (
        events: EsEvent | EsEvent[],
        condition: AppendCondition | AnyCondition
    ) => Promise<{ lastSequenceNumber: SequenceNumber }>
    read: (query?: EsQuery, fromSequenceNumber?: SequenceNumber) => AsyncGenerator<EsEventEnvelope>
    readBackward: (query: EsQuery, fromSequenceNumber?: SequenceNumber) => AsyncGenerator<EsEventEnvelope>
}
