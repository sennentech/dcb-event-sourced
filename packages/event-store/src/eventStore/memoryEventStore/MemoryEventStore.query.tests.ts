import { MemoryEventStore } from "./MemoryEventStore"
import { DcbEvent } from "../EventStore"
import { SequencePosition } from "../SequencePosition"
import { streamAllEventsToArray } from "../streamAllEventsToArray"
import { Tags } from "../Tags"
import { Query } from "../Query"

class EventType1 implements DcbEvent {
    type: "testEvent1" = "testEvent1"
    tags: Tags
    data: Record<string, never>
    metadata: Record<string, never> = {}

    constructor(tagValue?: string) {
        this.tags = tagValue ? Tags.fromObj({ testTagKey: tagValue }) : Tags.createEmpty()
        this.data = {}
    }
}

class EventType2 implements DcbEvent {
    type: "testEvent2" = "testEvent2"
    tags: Tags
    data: Record<string, never>
    metadata: Record<string, never> = {}

    constructor(tagValue?: string) {
        this.tags = tagValue ? Tags.fromObj({ testTagKey: tagValue }) : Tags.createEmpty()
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
            const events = await streamAllEventsToArray(eventStore.read(Query.all()))
            expect(events.length).toBe(0)
        })

        test("should return no events when read backward", async () => {
            const events = await streamAllEventsToArray(eventStore.read(Query.all()))
            expect(events.length).toBe(0)
        })
    })

    describe("when event store contains exactly one event", () => {
        beforeEach(async () => {
            eventStore = new MemoryEventStore()
            await eventStore.append(new EventType1("tag-key-1"))
        })

        test("should return a single event when read forward", async () => {
            const events = await streamAllEventsToArray(eventStore.read(Query.all()))
            expect(events.length).toBe(1)
        })

        test("should return a single event when read backward", async () => {
            const events = await streamAllEventsToArray(eventStore.read(Query.all(), { backwards: true }))
            expect(events.length).toBe(1)
        })
    })

    describe("when event store contains two events", () => {
        beforeEach(async () => {
            eventStore = new MemoryEventStore()
            await eventStore.append(new EventType1("tag-key-1"))
            await eventStore.append(new EventType2("tag-key-2"))
        })

        describe("with a fromSequencePosition filter applied", () => {
            test("should return the second event when read forward from sequence number 2", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.read(Query.all(), { fromSequencePosition: SequencePosition.create(2) })
                )
                expect(events.length).toBe(1)
                expect(events[0].sequencePosition.value).toBe(2)
            })

            test("should return the first event when read backward from sequence number 1", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.read(Query.all(), { fromSequencePosition: SequencePosition.create(1), backwards: true })
                )
                expect(events.length).toBe(1)
                expect(events[0].sequencePosition.value).toBe(1)
            })

            test("should return both first and second event when read backward from sequence number 2", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.read(Query.all(), { fromSequencePosition: SequencePosition.create(2), backwards: true })
                )
                expect(events.length).toBe(2)
            })
        })

        describe("when filtered by event types", () => {
            test("should return the event of type 'testEvent1' when read forward with event type filter", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.read(Query.fromItems([{ eventTypes: ["testEvent1"] }]))
                )
                expect(events.length).toBe(1)
                expect(events[0].event.type).toBe("testEvent1")
            })
        })

        describe("when filtered by tags", () => {
            test("should return no events when tag keys do not match", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.read(
                        Query.fromItems([{ eventTypes: [], tags: Tags.fromObj({ unmatchedId: "tag-key-1" }) }])
                    )
                )
                expect(events.length).toBe(0)
            })

            test("should return the event matching specific tag key when read forward", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.read(
                        Query.fromItems([{ eventTypes: [], tags: Tags.fromObj({ testTagKey: "tag-key-1" }) }])
                    )
                )
                expect(events.length).toBe(1)
                expect(events[0].event.tags.equals(Tags.fromObj({ testTagKey: "tag-key-1" }))).toEqual(true)
            })
        })
    })

    describe("when event store contains three events", () => {
        beforeEach(async () => {
            eventStore = new MemoryEventStore()
            await eventStore.append(new EventType1("tag-key-1"))
            await eventStore.append(new EventType2("tag-key-2"))
            await eventStore.append(new EventType2("ev-3"))
        })

        test("should return two events of type 'testEvent2' when read forward with event type filter", async () => {
            const events = await streamAllEventsToArray(
                eventStore.read(Query.fromItems([{ eventTypes: ["testEvent2"] }]))
            )
            expect(events.length).toBe(2)
            expect(events[0].event.type).toBe("testEvent2")
            expect(events[1].event.type).toBe("testEvent2")
        })

        test("should treat multiple criteria as OR and return all events when read forward with multiple filters", async () => {
            const events = await streamAllEventsToArray(
                eventStore.read(Query.fromItems([{ eventTypes: ["testEvent2"] }, { eventTypes: ["testEvent1"] }]))
            )
            expect(events.length).toBe(3)
        })

        test("should return respect limit clause when readAll backward", async () => {
            const events = await streamAllEventsToArray(eventStore.read(Query.all(), { limit: 1, backwards: true }))
            expect(events.length).toBe(1)
            expect(events[0].event.type).toBe("testEvent2")
            expect(events[0].event.tags.equals(Tags.fromObj({ testTagKey: "ev-3" }))).toEqual(true)
        })

        test("should return respect limit clause when read forward", async () => {
            const events = await streamAllEventsToArray(
                eventStore.read(Query.fromItems([{ eventTypes: ["testEvent2"] }]), { limit: 1 })
            )
            expect(events.length).toBe(1)
            expect(events[0].event.type).toBe("testEvent2")

            expect(events[0].event.tags.equals(Tags.fromObj({ testTagKey: "tag-key-2" }))).toEqual(true)
        })

        test("should return respect limit clause when read backward", async () => {
            const events = await streamAllEventsToArray(
                eventStore.read(Query.fromItems([{ eventTypes: ["testEvent2"] }]), { limit: 1, backwards: true })
            )
            expect(events.length).toBe(1)
            expect(events[0].event.type).toBe("testEvent2")
            expect(events[0].event.tags.equals(Tags.fromObj({ testTagKey: "ev-3" }))).toEqual(true)
        })

        test("test read count works", async () => {
            let readCount = 0
            eventStore.on("read", () => readCount++)

            await streamAllEventsToArray(
                eventStore.read(Query.fromItems([{ eventTypes: ["testEvent2"] }]), { limit: 1, backwards: true })
            )
            expect(readCount).toBe(1)
        })
    })
})
