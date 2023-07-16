export class TestEvent {
    type: "testEvent" = "testEvent"
    domainIds: Array<{ testId: string }>
    data: Record<string, never>

    constructor(id: string) {
        this.domainIds = [{ testId: id }]
        this.data = {}
    }
}

export class TestEvent2 {
    type: "testEvent2" = "testEvent2"
    domainIds: Array<{ testId: string }>
    data: Record<string, never>

    constructor(id: string) {
        this.domainIds = [{ testId: id }]
        this.data = {}
    }
}
