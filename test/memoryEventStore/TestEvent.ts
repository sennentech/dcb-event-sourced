export class TestEvent1 {
    type: "testEvent1" = "testEvent1"
    tags: { testId: string }
    data: Record<string, never>

    constructor(id: string) {
        this.tags = { testId: id }
        this.data = {}
    }
}

export class TestEvent2 {
    type: "testEvent2" = "testEvent2"
    tags: { testId: string }
    data: Record<string, never>

    constructor(id: string) {
        this.tags = { testId: id }
        this.data = {}
    }
}
