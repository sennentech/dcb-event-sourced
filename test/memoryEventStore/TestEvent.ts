import { StoredEsEvent } from "../../src/eventStore/EventStore"
import { SequenceNumber } from "../../src/eventStore/SequenceNumber"
import { Timestamp } from "../../src/eventStore/TimeStamp"

export class TestEvent1 implements StoredEsEvent {
    type: "testEvent1" = "testEvent1"
    tags: { testId: string }
    data: Record<string, never>

    sequenceNumber: SequenceNumber
    timestamp: Timestamp

    constructor(id: string) {
        this.tags = { testId: id }
        this.data = {}
    }
}

export class TestEvent2 implements StoredEsEvent {
    type: "testEvent2" = "testEvent2"
    tags: { testId: string }
    data: Record<string, never>

    sequenceNumber: SequenceNumber
    timestamp: Timestamp

    constructor(id: string) {
        this.tags = { testId: id }
        this.data = {}
    }
}
