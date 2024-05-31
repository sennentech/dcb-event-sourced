import { Pool } from "pg"
import { AppendCondition, AppendConditions, EsEvent } from "../EventStore"
import { SequenceNumber } from "../SequenceNumber"
import { streamAllEventsToArray } from "../utils/streamAllEventsToArray"
import { PostgresEventStore } from "./PostgresEventStore"
import { getTestPgDatabasePool } from "../../jest.testPgDbPool"

class EventType1 implements EsEvent {
    type: "testEvent1" = "testEvent1"
    tags: { testTagKey?: string }
    data: Record<string, never>

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
            const events = await streamAllEventsToArray(eventStore.readAll())
            expect(events.length).toBe(0)
        })
        test("should assign a sequence number of 1 on appending the first event", async () => {
            const lastSequenceNumber = (await eventStore.append(new EventType1(), AppendConditions.Any)).at(
                -1
            ).sequenceNumber
            expect(lastSequenceNumber.value).toBe(1)
        })
        describe("when append condition with eventTypes filter and maxSequenceNumber provided", () => {
            const appendCondition: AppendCondition = {
                query: {
                    criteria: [{ eventTypes: ["testEvent1"], tags: {} }]
                },
                maxSequenceNumber: SequenceNumber.create(1)
            }
            test("should successfully append an event without throwing under specified conditions", async () => {
                const lastSequenceNumber = (await eventStore.append(new EventType1(), appendCondition)).at(
                    -1
                ).sequenceNumber
                expect(lastSequenceNumber.value).toBe(1)
            })
        })
    })

    describe("when event store has exactly one event", () => {
        beforeEach(async () => {
            await eventStore.append(new EventType1(), AppendConditions.Any)
        })

        test("should increment sequence number to 2 when a second event is appended", async () => {
            const lastSequenceNumber = await (await eventStore.append(new EventType1(), AppendConditions.Any)).at(-1)
                .sequenceNumber
            expect(lastSequenceNumber.value).toBe(2)
        })

        test("should update the sequence number to 3 after appending two more events", async () => {
            const lastSequenceNumber = (
                await eventStore.append([new EventType1(), new EventType1()], AppendConditions.Any)
            ).at(-1).sequenceNumber

            expect(lastSequenceNumber.value).toBe(3)
        })

        describe("when append condition with eventTypes filter and maxSequenceNumber provided", () => {
            const appendCondition: AppendCondition = {
                query: {
                    criteria: [{ eventTypes: ["testEvent1"], tags: {} }]
                },
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
                query: {
                    criteria: [{ eventTypes: ["testEvent1"], tags: {}, onlyLastEvent: true }]
                },
                maxSequenceNumber: SequenceNumber.create(3)
            }

            await eventStore.append(new EventType1(), AppendConditions.Any)
            await eventStore.append(new EventType1(), AppendConditions.Any)

            const lastSequenceNumber = (await eventStore.append(new EventType1(), appendCondition)).at(
                -1
            ).sequenceNumber
            expect(lastSequenceNumber.value).toBe(4)
        })
    })
})
