import { expect } from "chai"
import { MemoryEventStore } from "./MemoryEventStore"
import { AppendConditions, EsEvent } from "../EventStore"
import { SequenceNumber } from "../SequenceNumber"
import { streamAllEventsToArray } from "../utils/streamAllEventsToArray"

class EventType1 implements EsEvent {
    type: "testEvent1" = "testEvent1"
    tags: { testTagKey?: string }
    data: Record<string, never>

    constructor(tagValue?: string) {
        this.tags = tagValue ? { testTagKey: tagValue } : {}
        this.data = {}
    }
}

class EventType2 implements EsEvent {
    type: "testEvent2" = "testEvent2"
    tags: { testTagKey?: string }
    data: Record<string, never>

    constructor(tagValue?: string) {
        this.tags = tagValue ? { testTagKey: tagValue } : {}
        this.data = {}
    }
}

describe("memoryEventStore.query", () => {
    let eventStore: MemoryEventStore

    describe("when event store is empty", () => {
        beforeEach(async () => {
            eventStore = new MemoryEventStore()
        })

        it("should return no events when read forward", async () => {
            const events = await streamAllEventsToArray(eventStore.read({ criteria: [] }))
            expect(events.length).to.equal(0)
        })

        it("should return no events when read backward", async () => {
            const events = await streamAllEventsToArray(eventStore.read({ criteria: [] }))
            expect(events.length).to.equal(0)
        })
    })

    describe("when event store contains exactly one event", () => {
        beforeEach(async () => {
            eventStore = new MemoryEventStore()
            await eventStore.append(new EventType1("tag-key-1"), AppendConditions.Any)
        })

        it("should return a single event when read forward", async () => {
            const events = await streamAllEventsToArray(eventStore.read({ criteria: [] }))
            expect(events.length).to.equal(1)
        })

        it("should return a single event when read backward", async () => {
            const events = await streamAllEventsToArray(eventStore.readBackward({ criteria: [] }))
            expect(events.length).to.equal(1)
        })
    })

    describe("when event store contains two events", () => {
        beforeEach(async () => {
            eventStore = new MemoryEventStore()
            await eventStore.append(new EventType1("tag-key-1"), AppendConditions.Any)
            await eventStore.append(new EventType2("tag-key-2"), AppendConditions.Any)
        })

        describe("with a fromSequenceNumber filter applied", () => {
            it("should return the second event when read forward from sequence number 2", async () => {
                const events = await streamAllEventsToArray(eventStore.read({ criteria: [] }, SequenceNumber.create(2)))
                expect(events.length).to.equal(1)
                expect(events[0].sequenceNumber.value).to.equal(2)
            })

            it("should return the first event when read backward from sequence number 1", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.readBackward({ criteria: [] }, SequenceNumber.create(1))
                )
                expect(events.length).to.equal(1)
                expect(events[0].sequenceNumber.value).to.equal(1)
            })
        })

        describe("when filtered by event types", () => {
            it("should return the event of type 'testEvent1' when read forward with event type filter", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.read({ criteria: [{ eventTypes: ["testEvent1"], tags: {} }] })
                )
                expect(events.length).to.equal(1)
                expect(events[0].event.type).to.equal("testEvent1")
            })
        })

        describe("when filtered by tags", () => {
            it("should return no events when tag keys do not match", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.read({ criteria: [{ eventTypes: [], tags: { unmatchedId: "tag-key-1" } }] })
                )
                expect(events.length).to.equal(0)
            })

            it("should return the event matching specific tag key when read forward", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.read({ criteria: [{ eventTypes: [], tags: { testTagKey: "tag-key-1" } }] })
                )
                expect(events.length).to.equal(1)
                expect(events[0].event.tags.testTagKey).to.equal("tag-key-1")
            })
        })
    })

    describe("when event store contains three events", () => {
        beforeEach(async () => {
            eventStore = new MemoryEventStore()
            await eventStore.append(new EventType1("tag-key-1"), AppendConditions.Any)
            await eventStore.append(new EventType2("tag-key-2"), AppendConditions.Any)
            await eventStore.append(new EventType2("ev-3"), AppendConditions.Any)
        })

        it("should return two events of type 'testEvent2' when read forward with event type filter", async () => {
            const events = await streamAllEventsToArray(
                eventStore.read({ criteria: [{ eventTypes: ["testEvent2"], tags: {} }] })
            )
            expect(events.length).to.equal(2)
            expect(events[0].event.type).to.equal("testEvent2")
            expect(events[1].event.type).to.equal("testEvent2")
        })

        it("should treat multiple criteria as OR and return all events when read forward with multiple filters", async () => {
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
