import { expect } from "chai"
import { MemoryEventStore } from "../../src/eventStore/MemoryEventStore"
import { AppendCondition } from "../../src/EventStore"
import { SequenceNumber } from "../../src/valueObjects/SequenceNumber"
import { TestEvent1, TestEvent2 } from "./TestEvent"
import { toArray } from "../../src/toArray"

describe("memoryEventStore.query", () => {
    describe("when event store empty", () => {
        it("read forward returns no events", async () => {
            const eventStore = new MemoryEventStore()

            const events = await toArray(eventStore.read({ criteria: [] }))
            expect(events.length).to.equal(0)
        })

        it("read backwards returns no events", async () => {
            const eventStore = new MemoryEventStore()
            const events = await toArray(eventStore.read({ criteria: [] }))

            expect(events.length).to.equal(0)
        })
    })

    describe("when no criteria provided", () => {
        it("read forwards returns single event in store", async () => {
            const eventStore = new MemoryEventStore()
            await eventStore.append(new TestEvent1("ev-1"), AppendCondition.None)

            const events = await toArray(eventStore.read({ criteria: [] }))

            expect(events.length).to.equal(1)
        })

        it("read backwards returns single event in store", async () => {
            const eventStore = new MemoryEventStore()
            await eventStore.append(new TestEvent1("ev-1"), AppendCondition.None)
            const events = await toArray(eventStore.readBackward({ criteria: [] }))

            expect(events.length).to.equal(1)
        })
    })

    describe("when fromSequenceNumber provided", () => {
        it("read forwards returns correct 1 of 2 events in store", async () => {
            const eventStore = new MemoryEventStore()
            await eventStore.append(new TestEvent1("ev-1"), AppendCondition.None)
            await eventStore.append(new TestEvent1("ev-2"), AppendCondition.None)

            const events = await toArray(eventStore.read({ criteria: [] }, SequenceNumber.create(2)))

            expect(events.length).to.equal(1)
            expect(events[0].sequenceNumber.value).to.equal(2)
        })

        it("read backwards returns correct 1 of 2 events in store", async () => {
            const eventStore = new MemoryEventStore()
            await eventStore.append(new TestEvent1("ev-1"), AppendCondition.None)
            await eventStore.append(new TestEvent1("ev-2"), AppendCondition.None)

            const events = await toArray(eventStore.readBackward({ criteria: [] }, SequenceNumber.create(1)))

            expect(events.length).to.equal(1)
            expect(events[0].sequenceNumber.value).to.equal(1)
        })
    })

    describe("when eventTypes provided", () => {
        it("read forwards returns correct 1 of 2 events in store", async () => {
            const eventStore = new MemoryEventStore()
            await eventStore.append(new TestEvent1("ev-1"), AppendCondition.None)
            await eventStore.append(new TestEvent2("ev-2"), AppendCondition.None)

            const events = await toArray(eventStore.read({ criteria: [{ eventTypes: ["testEvent1"], tags: {} }] }))

            expect(events.length).to.equal(1)
            expect(events[0].event.type).to.equal("testEvent1")
        })

        it("read forwards returns correct 2 of 3 events in store", async () => {
            const eventStore = new MemoryEventStore()
            await eventStore.append(new TestEvent1("ev-1"), AppendCondition.None)
            await eventStore.append(new TestEvent2("ev-2"), AppendCondition.None)
            await eventStore.append(new TestEvent2("ev-3"), AppendCondition.None)

            const events = await toArray(eventStore.read({ criteria: [{ eventTypes: ["testEvent2"], tags: {} }] }))

            expect(events.length).to.equal(2)
            expect(events[0].event.type).to.equal("testEvent2")
            expect(events[1].event.type).to.equal("testEvent2")
        })
    })

    describe("when tags provided", () => {
        it("read forwards returns no events if they don't match tag keys", async () => {
            const eventStore = new MemoryEventStore()
            await eventStore.append(new TestEvent1("ev-1"), AppendCondition.None)
            await eventStore.append(new TestEvent2("ev-2"), AppendCondition.None)

            const events = await toArray(
                eventStore.read({
                    criteria: [{ eventTypes: [], tags: { unmatchedId: "ev-1" } }]
                })
            )

            expect(events.length).to.equal(0)
        })

        it("read forwards returns correct 1 of 2 events in store", async () => {
            const eventStore = new MemoryEventStore()
            await eventStore.append(new TestEvent1("ev-1"), AppendCondition.None)
            await eventStore.append(new TestEvent2("ev-2"), AppendCondition.None)

            const events = await toArray(
                eventStore.read({
                    criteria: [{ eventTypes: [], tags: { testId: "ev-1" } }]
                })
            )

            expect(events.length).to.equal(1)
            expect(events[0].event.tags.testId).to.equal("ev-1")
        })
    })
})
