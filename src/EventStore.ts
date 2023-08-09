import { SequenceNumber } from "./valueObjects/SequenceNumber"
import { Timestamp } from "./valueObjects/TimeStamp"

export type Tags = Record<string, string | string[]>

export interface EsEvent {
    type: string
    tags: Tags
    data: any
}

export interface EventEnvelope {
    event: EsEvent
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

export class AppendCondition {
    static get None(): "None" {
        return "None"
    }
    query: EsQuery
    maxSequenceNumber: SequenceNumber
}

export interface EventStore {
    append: (
        events: EsEvent | EsEvent[],
        condition: AppendCondition | "None"
    ) => Promise<{ lastSequenceNumber: SequenceNumber }>

    read: (query: EsQuery, fromSequenceNumber?: SequenceNumber) => AsyncGenerator<EventEnvelope>
    readBackward: (query: EsQuery, fromSequenceNumber?: SequenceNumber) => AsyncGenerator<EventEnvelope>
}
