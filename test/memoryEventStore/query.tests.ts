import { expect } from "chai"
import { MemoryEventStore } from "../../src/eventStore/memoryEventStore/MemoryEventStore"
import { AppendConditions } from "../../src/eventStore/EventStore"
import { SequenceNumber } from "../../src/eventStore/SequenceNumber"
import { TestEvent1, TestEvent2 } from "./TestEvent"
import { streamAllEventsToArray } from "../../src/eventStore/utils/streamAllEventsToArray"

describe("memoryEventStore.query", () => {
    describe("when event store empty", () => {
        const eventStore = new MemoryEventStore()

        it("read forward returns no events", async () => {
            const events = await streamAllEventsToArray(eventStore.read({ criteria: [] }))
            expect(events.length).to.equal(0)
        })

        it("read backwards returns no events", async () => {
            const events = await streamAllEventsToArray(eventStore.read({ criteria: [] }))

            expect(events.length).to.equal(0)
        })
    })

    describe("when no criteria provided", async () => {
        const eventStore = new MemoryEventStore()
        await eventStore.append(new TestEvent1("ev-1"), AppendConditions.None)

        it("read forwards returns single event in store", async () => {
            const events = await streamAllEventsToArray(eventStore.read({ criteria: [] }))
            expect(events.length).to.equal(1)
        })

        it("read backwards returns single event in store", async () => {
            const events = await streamAllEventsToArray(eventStore.readBackward({ criteria: [] }))
            expect(events.length).to.equal(1)
        })
    })

    describe("when event store starts with 2 events", async () => {
        const eventStore = new MemoryEventStore()
        await eventStore.append(new TestEvent1("ev-1"), AppendConditions.None)
        await eventStore.append(new TestEvent2("ev-2"), AppendConditions.None)

        describe("when fromSequenceNumber provided", () => {
            it("read forwards returns correct 1 of 2 events in store", async () => {
                const events = await streamAllEventsToArray(eventStore.read({ criteria: [] }, SequenceNumber.create(2)))

                expect(events.length).to.equal(1)
                expect(events[0].sequenceNumber.value).to.equal(2)
            })

            it("read backwards returns correct 1 of 2 events in store", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.readBackward({ criteria: [] }, SequenceNumber.create(1))
                )

                expect(events.length).to.equal(1)
                expect(events[0].sequenceNumber.value).to.equal(1)
            })
        })

        describe("when eventTypes provided", () => {
            it("read forwards returns correct 1 of 2 events in store", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.read({ criteria: [{ eventTypes: ["testEvent1"], tags: {} }] })
                )

                expect(events.length).to.equal(1)
                expect(events[0].type).to.equal("testEvent1")
            })
        })

        describe("when tags provided", () => {
            it("read forwards returns no events if they don't match tag keys", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.read({
                        criteria: [{ eventTypes: [], tags: { unmatchedId: "ev-1" } }]
                    })
                )

                expect(events.length).to.equal(0)
            })

            it("read forwards returns correct 1 of 2 events in store", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.read({
                        criteria: [{ eventTypes: [], tags: { testId: "ev-1" } }]
                    })
                )

                expect(events.length).to.equal(1)
                expect(events[0].tags.testId).to.equal("ev-1")
            })
        })
    })

    describe("when event store starts with 3 events", async () => {
        const eventStore = new MemoryEventStore()
        await eventStore.append(new TestEvent1("ev-1"), AppendConditions.None)
        await eventStore.append(new TestEvent2("ev-2"), AppendConditions.None)
        await eventStore.append(new TestEvent2("ev-3"), AppendConditions.None)

        it("read forwards returns correct 2 of 3 events in store", async () => {
            const events = await streamAllEventsToArray(
                eventStore.read({ criteria: [{ eventTypes: ["testEvent2"], tags: {} }] })
            )

            expect(events.length).to.equal(2)
            expect(events[0].type).to.equal("testEvent2")
            expect(events[1].type).to.equal("testEvent2")
        })

        it("multiple criteria treated as OR correctly", async () => {
            const events = await streamAllEventsToArray(
                eventStore.read({
                    criteria: [
                        { eventTypes: ["testEvent2"], tags: {} },
                        { eventTypes: ["testEvent1"], tags: {} }
                    ]
                })
            )

            expect(events.length).to.equal(3)
        })
    })
})
