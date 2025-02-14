import { SequencePosition } from "../SequencePosition"
import { Tags } from "../Tags"
import { Timestamp } from "../Timestamp"

export interface DcbEvent<Tpe extends string = string, Tgs = Tags, Dta = unknown, Mtdta = unknown> {
    type: Tpe
    tags: Tgs
    data: Dta
    metadata: Mtdta
}

export interface EventEnvelope<T extends DcbEvent = DcbEvent> {
    event: T
    timestamp: Timestamp
    sequencePosition: SequencePosition
}

export interface QueryItem {
    tags?: Tags
    eventTypes?: string[]
    onlyLastEvent?: boolean
}

/* helper to enable eventStore.query(Queries.all) */
export const Queries: { all: All } = { all: "All" }
export type All = "All"
export type Query = QueryItem[] | All

export type AppendCondition = {
    query: Query
    expectedCeiling: SequencePosition
}

export interface ReadOptions {
    backwards?: boolean
    fromSequencePosition?: SequencePosition
    limit?: number
}

export interface EventStore {
    append: (events: DcbEvent | DcbEvent[], condition?: AppendCondition) => Promise<void>
    read: (query: Query, options?: ReadOptions) => AsyncGenerator<EventEnvelope>
}
