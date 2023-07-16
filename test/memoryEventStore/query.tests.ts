import { expect } from "chai"
import { MemoryEventStore } from "../../src/eventStore/MemoryEventStore"
import { AppendCondition, EsEvent } from "../../src/EventStore"
import { SequenceNumber } from "../../src/valueObjects/SequenceNumber"
import { TestEvent2 } from "./TestEvent"

class TestEvent implements EsEvent {
    type: "testEvent1" = "testEvent1"
    domainIds: Array<{ testId: string }>
    data: Record<string, never>

    constructor(id: string) {
        this.domainIds = [{ testId: id }]
        this.data = {}
    }
}

describe("memoryEventStore.query", () => {
    describe("when event store empty", () => {
        it("read forward returns no events", async () => {
            const eventStore = new MemoryEventStore()
            const events = await eventStore.readForward({ criteria: [] })

            expect(events.length).to.equal(0)
        })

        it("read backwards returns no events", async () => {
            const eventStore = new MemoryEventStore()
            const events = await eventStore.readBackward({ criteria: [] })

            expect(events.length).to.equal(0)
        })
    })

    describe("when no criteria provided", () => {
        it("read forwards returns single event in store", async () => {
            const eventStore = new MemoryEventStore()
            await eventStore.append(new TestEvent("ev-1"), AppendCondition.None)

            const events = await eventStore.readForward({ criteria: [] })

            expect(events.length).to.equal(1)
        })

        it("read backwards returns single event in store", async () => {
            const eventStore = new MemoryEventStore()
            await eventStore.append(new TestEvent("ev-1"), AppendCondition.None)

            const events = await eventStore.readBackward({ criteria: [] })

            expect(events.length).to.equal(1)
        })
    })

    describe("when fromSequenceNumber provided", () => {
        it("read forwards returns correct 1 of 2 events in store", async () => {
            const eventStore = new MemoryEventStore()
            await eventStore.append(new TestEvent("ev-1"), AppendCondition.None)
            await eventStore.append(new TestEvent("ev-2"), AppendCondition.None)

            const events = await eventStore.readForward(
                { criteria: [] },
                { fromSequenceNumber: SequenceNumber.create(2) }
            )

            expect(events.length).to.equal(1)
            expect(events[0].sequenceNumber.value).to.equal(2)
        })

        it("read backwards returns correct 1 of 2 events in store", async () => {
            const eventStore = new MemoryEventStore()
            await eventStore.append(new TestEvent("ev-1"), AppendCondition.None)
            await eventStore.append(new TestEvent("ev-2"), AppendCondition.None)

            const events = await eventStore.readBackward(
                { criteria: [] },
                { fromSequenceNumber: SequenceNumber.create(1) }
            )

            expect(events.length).to.equal(1)
            expect(events[0].sequenceNumber.value).to.equal(1)
        })
    })

    describe("when eventTypes provided", () => {
        it("read forwards returns correct 1 of 2 events in store", async () => {
            const eventStore = new MemoryEventStore()
            await eventStore.append(new TestEvent("ev-1"), AppendCondition.None)
            await eventStore.append(new TestEvent2("ev-2"), AppendCondition.None)

            const events = await eventStore.readForward({ criteria: [{ eventTypes: ["testEvent1"], domainIds: [] }] })

            expect(events.length).to.equal(1)
            expect(events[0].sequenceNumber.value).to.equal(1)
        })
    })
})
