import { EsEvent } from "../../eventStore/src/EventStore"

export class TestEvent1 implements EsEvent {
    type: "testEvent1" = "testEvent1"
    tags: { testId: string }
    data: Record<string, never>

    constructor(id: string) {
        this.tags = { testId: id }
        this.data = {}
    }
}

export class TestEvent2 implements EsEvent {
    type: "testEvent2" = "testEvent2"
    tags: { testId: string }
    data: Record<string, never>

    constructor(id: string) {
        this.tags = { testId: id }
        this.data = {}
    }
}
