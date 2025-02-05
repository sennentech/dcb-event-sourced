import { SequenceNumber } from "./SequenceNumber"
import { Timestamp } from "./Timestamp"

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
    matchedCriteria?: string[]
}

export interface EsQueryCriterion {
    tags?: Tags
    eventTypes?: string[]
    onlyLastEvent?: boolean
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

export interface EsReadOptions {
    backwards?: boolean
    fromSequenceNumber?: SequenceNumber
    limit?: number
}
export interface EventStore {
    append: (events: EsEvent | EsEvent[], condition: AppendCondition | AnyCondition) => Promise<EsEventEnvelope[]>

    read: (query: EsQuery, options?: EsReadOptions) => AsyncGenerator<EsEventEnvelope>
    readAll: (options?: EsReadOptions) => AsyncGenerator<EsEventEnvelope>
}
