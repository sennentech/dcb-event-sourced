import { EsEvent, streamAllEventsToArray, AppendConditions, SequenceNumber } from "@dcb-es/event-store"
import { Pool } from "pg"
import { PostgresEventStore } from "./PostgresEventStore"
import { getTestPgDatabasePool } from "./jest.testPgDbPool"

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
    let pool: Pool
    let eventStore: PostgresEventStore

    beforeAll(async () => {
        pool = await getTestPgDatabasePool()
        eventStore = new PostgresEventStore(pool)
        await eventStore.install()
    })

    afterEach(async () => {
        await pool.query("TRUNCATE table events")
        await pool.query("ALTER SEQUENCE events_sequence_number_seq RESTART WITH 1")
    })

    afterAll(async () => {
        if (pool) await pool.end()
    })

    describe("when event store is empty", () => {
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
            await eventStore.append(new EventType1("tag-key-1"), AppendConditions.Any)
            await eventStore.append(new EventType2("tag-key-2"), AppendConditions.Any)
        })

        describe("with a fromSequenceNumber filter applied", () => {
            test("should return both events when readAll called with no filter", async () => {
                const events = await streamAllEventsToArray(eventStore.readAll())
                expect(events.length).toBe(2)
                expect(events[0].sequenceNumber.value).toBe(1)
                expect(events[1].sequenceNumber.value).toBe(2)
            })

            test("should return both events when readAll called with backwards and no filter", async () => {
                const events = await streamAllEventsToArray(eventStore.readAll({ backwards: true }))
                expect(events.length).toBe(2)
                expect(events[0].sequenceNumber.value).toBe(2)
                expect(events[1].sequenceNumber.value).toBe(1)
            })

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

        test("should respect onlyLastEvent flag on read", async () => {
            const events = await streamAllEventsToArray(
                eventStore.read({ criteria: [{ eventTypes: ["testEvent2"], tags: {}, onlyLastEvent: true }] })
            )
            expect(events.length).toBe(1)
            expect(events[0].event.type).toBe("testEvent2")
            expect(events[0].event.tags.testTagKey).toBe("ev-3")
        })

        test("should respect onlyLastEvent flag on read with other criteria", async () => {
            const events = await streamAllEventsToArray(
                eventStore.read({
                    criteria: [
                        { eventTypes: ["testEvent2"], tags: {}, onlyLastEvent: true },
                        { eventTypes: ["testEvent1"], tags: {} }
                    ]
                })
            )
            expect(events.length).toBe(2)
            expect(events[0].event.type).toBe("testEvent1")
            expect(events[0].event.tags.testTagKey).toBe("tag-key-1")
            expect(events[1].event.type).toBe("testEvent2")
            expect(events[1].event.tags.testTagKey).toBe("ev-3")
        })

        test("should respect onlyLastEvent flag on read with backwards", async () => {
            const events = await streamAllEventsToArray(
                eventStore.read(
                    {
                        criteria: [{ eventTypes: ["testEvent2"], tags: {}, onlyLastEvent: true }]
                    },
                    { backwards: true }
                )
            )
            expect(events.length).toBe(1)
            expect(events[0].event.type).toBe("testEvent2")
            expect(events[0].event.tags.testTagKey).toBe("ev-3")
        })

        test("should return respect limit clause when readAll forward", async () => {
            const events = await streamAllEventsToArray(eventStore.readAll({ limit: 1 }))
            expect(events.length).toBe(1)
            expect(events[0].event.type).toBe("testEvent1")
            expect(events[0].event.tags.testTagKey).toBe("tag-key-1")
        })

        test("should return respect limit clause when readAll backward", async () => {
            const events = await streamAllEventsToArray(eventStore.readAll({ limit: 1, backwards: true }))
            expect(events.length).toBe(1)
            expect(events[0].event.type).toBe("testEvent2")
            expect(events[0].event.tags.testTagKey).toBe("ev-3")
        })

        test("should return respect limit clause when read forward", async () => {
            const events = await streamAllEventsToArray(
                eventStore.read({ criteria: [{ eventTypes: ["testEvent2"], tags: {} }] }, { limit: 1 })
            )
            expect(events.length).toBe(1)
            expect(events[0].event.type).toBe("testEvent2")
            expect(events[0].event.tags.testTagKey).toBe("tag-key-2")
        })

        test("should return respect limit clause when read backward", async () => {
            const events = await streamAllEventsToArray(
                eventStore.read({ criteria: [{ eventTypes: ["testEvent2"], tags: {} }] }, { limit: 1, backwards: true })
            )
            expect(events.length).toBe(1)
            expect(events[0].event.type).toBe("testEvent2")
            expect(events[0].event.tags.testTagKey).toBe("ev-3")
        })
    })
})
