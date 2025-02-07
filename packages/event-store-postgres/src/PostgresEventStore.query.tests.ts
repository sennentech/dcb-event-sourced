import { DcbEvent, streamAllEventsToArray, SequenceNumber, EventStore } from "@dcb-es/event-store"
import { Pool, PoolClient } from "pg"
import { getTestPgDatabasePool } from "../jest.testPgDbPool"
import { PostgresEventStore } from "./PostgresEventStore"
import { Queries } from "@dcb-es/event-store"
import { ensureEventStoreInstalled } from "./ensureEventStoreInstalled"

class EventType1 implements DcbEvent {
    type: "testEvent1" = "testEvent1"
    tags: { testTagKey?: string }
    data: Record<string, never>
    metadata: Record<string, never> = {}

    constructor(tagValue?: string) {
        this.tags = tagValue ? { testTagKey: tagValue } : {}
        this.data = {}
    }
}

class EventType2 implements DcbEvent {
    type: "testEvent2" = "testEvent2"
    tags: { testTagKey?: string }
    data: Record<string, never>
    metadata: Record<string, never> = {}

    constructor(tagValue?: string) {
        this.tags = tagValue ? { testTagKey: tagValue } : {}
        this.data = {}
    }
}

describe("memoryEventStore.query", () => {
    let pool: Pool
    let eventStore: EventStore
    let client: PoolClient

    beforeAll(async () => {
        pool = await getTestPgDatabasePool()
        await ensureEventStoreInstalled(pool)
    })
    beforeEach(async () => {
        client = await pool.connect()
        await client.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE")
        eventStore = PostgresEventStore(client)
    })

    afterEach(async () => {
        await client.query("COMMIT")
        client.release()
        await pool.query("TRUNCATE table events")
        await pool.query("ALTER SEQUENCE events_sequence_number_seq RESTART WITH 1")
    })

    afterAll(async () => {
        if (pool) await pool.end()
    })

    describe("when event store is empty", () => {
        test("should return no events when read forward", async () => {
            const events = await streamAllEventsToArray(eventStore.read(Queries.all))
            expect(events.length).toBe(0)
        })

        test("should return no events when read backward", async () => {
            const events = await streamAllEventsToArray(eventStore.read(Queries.all))
            expect(events.length).toBe(0)
        })
    })

    describe("when event store contains exactly one event", () => {
        beforeEach(async () => {
            await eventStore.append(new EventType1("tag-key-1"))
        })

        test("should return a single event when read forward", async () => {
            const events = await streamAllEventsToArray(eventStore.read(Queries.all))
            expect(events.length).toBe(1)
        })

        test("should return a single event when read backward", async () => {
            const events = await streamAllEventsToArray(eventStore.read(Queries.all, { backwards: true }))
            expect(events.length).toBe(1)
        })
    })

    describe("when event store contains two events", () => {
        beforeEach(async () => {
            await eventStore.append(new EventType1("tag-key-1"))
            await eventStore.append(new EventType2("tag-key-2"))
        })

        describe("with a fromSequenceNumber filter applied", () => {
            test("should return both events when readAll called with no filter", async () => {
                const events = await streamAllEventsToArray(eventStore.read(Queries.all))
                expect(events.length).toBe(2)
                expect(events[0].sequenceNumber.value).toBe(1)
                expect(events[1].sequenceNumber.value).toBe(2)
            })

            test("should return both events when readAll called with backwards and no filter", async () => {
                const events = await streamAllEventsToArray(eventStore.read(Queries.all, { backwards: true }))
                expect(events.length).toBe(2)
                expect(events[0].sequenceNumber.value).toBe(2)
                expect(events[1].sequenceNumber.value).toBe(1)
            })

            test("should return the second event when read forward from sequence number 2", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.read(Queries.all, { fromSequenceNumber: SequenceNumber.create(2) })
                )
                expect(events.length).toBe(1)
                expect(events[0].sequenceNumber.value).toBe(2)
            })

            test("should return the first event when read backward from sequence number 1", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.read(Queries.all, { fromSequenceNumber: SequenceNumber.create(1), backwards: true })
                )
                expect(events.length).toBe(1)
                expect(events[0].sequenceNumber.value).toBe(1)
            })

            test("should return both first and second event when read backward from sequence number 2", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.read(Queries.all, { fromSequenceNumber: SequenceNumber.create(2), backwards: true })
                )
                expect(events.length).toBe(2)
            })
        })

        describe("when filtered by event types", () => {
            test("should return the event of type 'testEvent1' when read forward with event type filter", async () => {
                const events = await streamAllEventsToArray(eventStore.read([{ eventTypes: ["testEvent1"], tags: {} }]))
                expect(events.length).toBe(1)
                expect(events[0].event.type).toBe("testEvent1")
            })
        })

        describe("when filtered by tags", () => {
            test("should return no events when tag keys do not match", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.read([{ eventTypes: [], tags: { unmatchedId: "tag-key-1" } }])
                )
                expect(events.length).toBe(0)
            })

            test("should return the event matching specific tag key when read forward", async () => {
                const events = await streamAllEventsToArray(
                    eventStore.read([{ eventTypes: [], tags: { testTagKey: "tag-key-1" } }])
                )
                expect(events.length).toBe(1)
                expect(events[0].event.tags.testTagKey).toBe("tag-key-1")
            })
        })
    })

    describe("when event store contains three events", () => {
        beforeEach(async () => {
            await eventStore.append(new EventType1("tag-key-1"))
            await eventStore.append(new EventType2("tag-key-2"))
            await eventStore.append(new EventType2("ev-3"))
        })

        test("should return two events of type 'testEvent2' when read forward with event type filter", async () => {
            const events = await streamAllEventsToArray(eventStore.read([{ eventTypes: ["testEvent2"], tags: {} }]))
            expect(events.length).toBe(2)
            expect(events[0].event.type).toBe("testEvent2")
            expect(events[1].event.type).toBe("testEvent2")
        })

        test("should treat multiple criteria as OR and return all events when read forward with multiple filters", async () => {
            const events = await streamAllEventsToArray(
                eventStore.read([
                    { eventTypes: ["testEvent2"], tags: {} },
                    { eventTypes: ["testEvent1"], tags: {} }
                ])
            )
            expect(events.length).toBe(3)
        })

        test("should respect onlyLastEvent flag on read", async () => {
            const events = await streamAllEventsToArray(
                eventStore.read([{ eventTypes: ["testEvent2"], tags: {}, onlyLastEvent: true }])
            )
            expect(events.length).toBe(1)
            expect(events[0].event.type).toBe("testEvent2")
            expect(events[0].event.tags.testTagKey).toBe("ev-3")
        })

        test("should respect onlyLastEvent flag on read with other criteria", async () => {
            const events = await streamAllEventsToArray(
                eventStore.read([
                    { eventTypes: ["testEvent2"], tags: {}, onlyLastEvent: true },
                    { eventTypes: ["testEvent1"], tags: {} }
                ])
            )
            expect(events.length).toBe(2)
            expect(events[0].event.type).toBe("testEvent1")
            expect(events[0].event.tags.testTagKey).toBe("tag-key-1")
            expect(events[1].event.type).toBe("testEvent2")
            expect(events[1].event.tags.testTagKey).toBe("ev-3")
        })

        test("should respect onlyLastEvent flag on read with backwards", async () => {
            const events = await streamAllEventsToArray(
                eventStore.read([{ eventTypes: ["testEvent2"], tags: {}, onlyLastEvent: true }], { backwards: true })
            )
            expect(events.length).toBe(1)
            expect(events[0].event.type).toBe("testEvent2")
            expect(events[0].event.tags.testTagKey).toBe("ev-3")
        })

        test("should return respect limit clause when readAll forward", async () => {
            const events = await streamAllEventsToArray(eventStore.read(Queries.all, { limit: 1 }))
            expect(events.length).toBe(1)
            expect(events[0].event.type).toBe("testEvent1")
            expect(events[0].event.tags.testTagKey).toBe("tag-key-1")
        })

        test("should return respect limit clause when readAll backward", async () => {
            const events = await streamAllEventsToArray(eventStore.read(Queries.all, { limit: 1, backwards: true }))
            expect(events.length).toBe(1)
            expect(events[0].event.type).toBe("testEvent2")
            expect(events[0].event.tags.testTagKey).toBe("ev-3")
        })

        test("should return respect limit clause when read forward", async () => {
            const events = await streamAllEventsToArray(
                eventStore.read([{ eventTypes: ["testEvent2"], tags: {} }], { limit: 1 })
            )

            expect(events.length).toBe(1)
            expect(events[0].event.type).toBe("testEvent2")
            expect(events[0].event.tags.testTagKey).toBe("tag-key-2")
        })

        test("should return respect limit clause when read backward", async () => {
            const events = await streamAllEventsToArray(
                eventStore.read([{ eventTypes: ["testEvent2"], tags: {} }], { limit: 1, backwards: true })
            )
            expect(events.length).toBe(1)
            expect(events[0].event.type).toBe("testEvent2")
            expect(events[0].event.tags.testTagKey).toBe("ev-3")
        })
    })

    test("should allow two consequtive reads in same transaction wihtout throwing", async () => {
        await eventStore.append(new EventType1())
        await eventStore.append(new EventType2())
        await streamAllEventsToArray(eventStore.read(Queries.all))
        await streamAllEventsToArray(eventStore.read(Queries.all))
    })
})
