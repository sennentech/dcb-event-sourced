import { Pool } from "pg"
import { AppendCondition, DcbEvent, SequenceNumber, streamAllEventsToArray } from "@dcb-es/event-store"
import { PostgresEventStore } from "./PostgresEventStore"
import { getTestPgDatabasePool } from "../jest.testPgDbPool"
import { Queries } from "@dcb-es/event-store"

class EventType1 implements DcbEvent {
    type: "testEvent1" = "testEvent1"
    tags: { testTagKey?: string }
    data: Record<string, never>
    metadata: { userId: string } = { userId: "user-1" }

    constructor(tags: Record<string, string> = {}) {
        this.tags = tags
        this.data = {}
    }
}

class EventType2 implements DcbEvent {
    type: "testEvent2" = "testEvent2"
    tags: { testTagKey?: string }
    data: Record<string, never>
    metadata: { userId: string } = { userId: "user-1" }

    constructor(tagValue?: string) {
        this.tags = tagValue ? { testTagKey: tagValue } : {}
        this.data = {}
    }
}

describe("postgresEventStore.append", () => {
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

    describe("when event store empty", () => {
        test("should return an empty array when no events are stored", async () => {
            const events = await streamAllEventsToArray(eventStore.read(Queries.all))
            expect(events.length).toBe(0)
        })
        test("should assign a sequence number of 1 on appending the first event", async () => {
            await eventStore.append(new EventType1())
            const lastSequenceNumber = (await streamAllEventsToArray(eventStore.read(Queries.all))).at(
                -1
            )?.sequenceNumber
            expect(lastSequenceNumber?.value).toBe(1)
        })
        describe("when append condition with eventTypes filter and maxSequenceNumber provided", () => {
            const appendCondition: AppendCondition = {
                query: [{ eventTypes: ["testEvent1"], tags: {} }],
                maxSequenceNumber: SequenceNumber.create(1)
            }
            test("should successfully append an event without throwing under specified conditions", async () => {
                await eventStore.append(new EventType1(), appendCondition)
                const lastSequenceNumber = (await streamAllEventsToArray(eventStore.read(Queries.all))).at(
                    -1
                )?.sequenceNumber
                expect(lastSequenceNumber?.value).toBe(1)
            })

            test("should store and return metadata on event successfully", async () => {
                await eventStore.append(new EventType1())
                const events = await streamAllEventsToArray(eventStore.read(Queries.all))
                const lastEvent = events.at(-1).event as EventType1
                expect(lastEvent.metadata.userId).toBe("user-1")
            })
        })
    })

    describe("when event store has exactly one event", () => {
        beforeEach(async () => {
            await eventStore.append(new EventType1())
        })

        test("should increment sequence number to 2 when a second event is appended", async () => {
            await eventStore.append(new EventType1())
            const lastSequenceNumber = (await streamAllEventsToArray(eventStore.read(Queries.all))).at(-1)?.sequenceNumber
            expect(lastSequenceNumber?.value).toBe(2)
        })

        test("should update the sequence number to 3 after appending two more events", async () => {

            await eventStore.append([new EventType1(), new EventType1()])
            const lastSequenceNumber = (await streamAllEventsToArray(eventStore.read(Queries.all))).at(-1)?.sequenceNumber

            expect(lastSequenceNumber?.value).toBe(3)
        })

        describe("when append condition with eventTypes filter and maxSequenceNumber provided", () => {
            const appendCondition: AppendCondition = {
                query: [{ eventTypes: ["testEvent1"], tags: {} }],
                maxSequenceNumber: SequenceNumber.zero()
            }
            test("should throw an error if appended event exceeds the maximum allowed sequence number", async () => {
                await expect(eventStore.append(new EventType1(), appendCondition)).rejects.toThrow(
                    "Expected Version fail: New events matching appendCondition found."
                )
            })
        })

        test("should successfully append an event without throwing under specified conditions", async () => {
            const appendCondition: AppendCondition = {
                query: [{ eventTypes: ["testEvent1"], tags: {}, onlyLastEvent: true }],
                maxSequenceNumber: SequenceNumber.create(3)
            }

            await eventStore.append(new EventType1(), appendCondition)
            await eventStore.append(new EventType1(), appendCondition)
            await eventStore.append(new EventType1(), appendCondition)

            const lastSequenceNumber = (await streamAllEventsToArray(eventStore.read(Queries.all))).at(-1)?.sequenceNumber

            expect(lastSequenceNumber?.value).toBe(4)
        })

        test("should concurrently add a single event when lots attempted in parallel with same append condition", async () => {
            const storeEvents = [];

            const appendCondition: AppendCondition = {
                query: [{ eventTypes: ["testEvent1"] }],
                maxSequenceNumber: SequenceNumber.create(1)
            }

            for (let i = 0; i < 10; i++) {
                storeEvents.push(eventStore.append(new EventType1(), appendCondition));
            }
            const results = await Promise.allSettled(storeEvents);
            expect(results.filter(r => r.status === "fulfilled").length).toBe(1)
            const events = await streamAllEventsToArray(eventStore.read(Queries.all))
            expect(events.length).toBe(2)
        })

        test("should concurrently add a all events when lots attempted in parralel", async () => {
            const storeEvents = [];
            const iterations = 1000
            for (let i = 0; i < iterations; i++) {
                storeEvents.push(eventStore.append(new EventType1()))
            }
            const results = await Promise.allSettled(storeEvents);
            expect(results.filter(r => r.status === "fulfilled").length).toBe(iterations)
        })


        test("should fail to append next event if append condition is no longer met", async () => {
            const appendCondition: AppendCondition = {
                query: [{ eventTypes: ["testEvent1"], tags: {} }], maxSequenceNumber: SequenceNumber.create(1)
            }

            // First append should pass and set sequence_number to 2
            await eventStore.append(new EventType1(), appendCondition)
            await eventStore.append(new EventType2())

            const events = await streamAllEventsToArray(eventStore.read(Queries.all))
            expect(events.at(-2)?.sequenceNumber?.value).toBe(2)

            // Second append should pass and as its unrelated (different event type)
            expect(events.at(-1)?.sequenceNumber?.value).toBe(3)

            // Third append with the same condition should fail because it would exceed maxSequenceNumber=2
            await expect(eventStore.append(new EventType1(), appendCondition)).rejects.toThrow(
                "Expected Version fail: New events matching appendCondition found."
            )
        })
    })
})
