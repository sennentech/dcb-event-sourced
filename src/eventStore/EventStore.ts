import { SequenceNumber } from "./SequenceNumber"
import { Timestamp } from "./TimeStamp"

export type Tags = Record<string, string | string[]>

export interface EsEvent {
    type: string
    tags: Tags
    data: any
}

export interface StoredEsEvent extends EsEvent {
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

type NoCondition = "None"
export const AppendConditions: Record<NoCondition, NoCondition> = {
    None: "None"
}
export interface AppendCondition {
    query: EsQuery
    maxSequenceNumber: SequenceNumber
}

export interface EventStore {
    append: (
        events: StoredEsEvent | StoredEsEvent[],
        condition: AppendCondition | NoCondition
    ) => Promise<{ lastSequenceNumber: SequenceNumber }>

    read: (query: EsQuery, fromSequenceNumber?: SequenceNumber) => AsyncGenerator<StoredEsEvent>
    readBackward: (query: EsQuery, fromSequenceNumber?: SequenceNumber) => AsyncGenerator<StoredEsEvent>
}
