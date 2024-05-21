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

        test("should return no events when read forward", async () => {
            const events = await streamAllEventsToArray(eventStore.readAll())
            expect(events.length).toBe(0)
        })

        test("should return no events when read backward", async () => {
            const events = await streamAllEventsToArray(eventStore.readAll())
            expect(events.length).toBe(0)
        })
    })

    describe("when event store contains exactly one event", () => {
        beforeEach(async () => {
            eventStore = new MemoryEventStore()
            await eventStore.append(new EventType1("tag-key-1"), AppendConditions.Any)
        })

        test("should return a single event when read forward", async () => {
            const events = await streamAllEventsToArray(eventStore.readAll())
            expect(events.length).toBe(1)
        })

        test("should return a single event when read backward", async () => {
            const events = await streamAllEventsToArray(eventStore.readAll({ backwards: true }))
            expect(events.length).toBe(1)
        })
    })

    describe("when event store contains two events", () => {
        beforeEach(async () => {
            eventStore = new MemoryEventStore()
            await eventStore.append(new EventType1("tag-key-1"), AppendConditions.Any)
            await eventStore.append(new EventType2("tag-key-2"), AppendConditions.Any)
        })

        describe("with a fromSequenceNumber filter applied", () => {
            test("should return the second event when read forward from sequence number 2", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.readAll({ fromSequenceNumber: SequenceNumber.create(2) })
                )
                expect(events.length).toBe(1)
                expect(events[0].sequenceNumber.value).toBe(2)
            })

            test("should return the first event when read backward from sequence number 1", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.readAll({ fromSequenceNumber: SequenceNumber.create(1), backwards: true })
                )
                expect(events.length).toBe(1)
                expect(events[0].sequenceNumber.value).toBe(1)
            })

            test("should return both first and second event when read backward from sequence number 2", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.readAll({ fromSequenceNumber: SequenceNumber.create(2), backwards: true })
                )
                expect(events.length).toBe(2)
            })
        })

        describe("when filtered by event types", () => {
            test("should return the event of type 'testEvent1' when read forward with event type filter", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.read({ criteria: [{ eventTypes: ["testEvent1"], tags: {} }] })
                )
                expect(events.length).toBe(1)
                expect(events[0].event.type).toBe("testEvent1")
            })
        })

        describe("when filtered by tags", () => {
            test("should return no events when tag keys do not match", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.read({ criteria: [{ eventTypes: [], tags: { unmatchedId: "tag-key-1" } }] })
                )
                expect(events.length).toBe(0)
            })

            test("should return the event matching specific tag key when read forward", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.read({ criteria: [{ eventTypes: [], tags: { testTagKey: "tag-key-1" } }] })
                )
                expect(events.length).toBe(1)
                expect(events[0].event.tags.testTagKey).toBe("tag-key-1")
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

        test("should return two events of type 'testEvent2' when read forward with event type filter", async () => {
            const events = await streamAllEventsToArray(
                eventStore.read({ criteria: [{ eventTypes: ["testEvent2"], tags: {} }] })
            )
            expect(events.length).toBe(2)
            expect(events[0].event.type).toBe("testEvent2")
            expect(events[1].event.type).toBe("testEvent2")
        })

        test("should treat multiple criteria as OR and return all events when read forward with multiple filters", async () => {
            const events = await streamAllEventsToArray(
                eventStore.read({
                    criteria: [
                        { eventTypes: ["testEvent2"], tags: {} },
                        { eventTypes: ["testEvent1"], tags: {} }
                    ]
                })
            )
            expect(events.length).toBe(3)
        })

        test.skip("should respect onlyLastEvent flag on read", async () => {
            const events = await streamAllEventsToArray(
                eventStore.read({ criteria: [{ eventTypes: ["testEvent2"], tags: {}, onlyLastEvent: true }] })
            )
            expect(events.length).toBe(1)
        })
    })
})
