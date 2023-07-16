import { SequenceNumber } from "./valueObjects/SequenceNumber"
import { Timestamp } from "./valueObjects/TimeStamp"

export interface EsEvent {
    type: string
    domainIds: Array<Record<string, string>>
    data: any
}

export interface StoredEvent {
    event: EsEvent
    timestamp: Timestamp
    sequenceNumber: SequenceNumber
}

export interface EsQueryCriterion {
    domainIds: Array<Record<string, string>>
    eventTypes: Array<string>
}

export interface EsQuery {
    criteria: Array<EsQueryCriterion>
}

export class AppendCondition {
    static get None(): "None" {
        return "None"
    }
    query: EsQuery
    maxSequenceNumber: SequenceNumber
}

export type ReadOptions = { limit?: number; fromSequenceNumber?: SequenceNumber }
export interface EventStore {
    append: (
        events: EsEvent | Array<EsEvent>,
        appendCondition: AppendCondition | "None"
    ) => Promise<{ lastSequenceNumber: SequenceNumber }>

    readForward: (query: EsQuery, readOptions?: ReadOptions) => Promise<StoredEvent[]>
    readBackward: (query: EsQuery, readOptions?: ReadOptions) => Promise<StoredEvent[]>
}
