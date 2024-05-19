import { Pool } from "pg"
import { AppendCondition, AppendConditions, EsEvent } from "../EventStore"
import { SequenceNumber } from "../SequenceNumber"
import { streamAllEventsToArray } from "../utils/streamAllEventsToArray"
import { PostgresEventStore } from "./PostgresEventStore"
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql"

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
    let pgContainer: StartedPostgreSqlContainer
    let pool: Pool
    let eventStore: PostgresEventStore

    beforeAll(async () => {
        pgContainer = await new PostgreSqlContainer()
            .withDatabase("int_tests")
            .withUsername("test")
            .withPassword("test")
            .start()

        pool = new Pool({
            connectionString: pgContainer.getConnectionUri()
        })

        eventStore = new PostgresEventStore(pool)
        await eventStore.install()
    })

    afterEach(async () => {
        await pool.query("TRUNCATE table events")
        await pool.query("ALTER SEQUENCE events_sequence_number_seq RESTART WITH 1")
    })

    afterAll(async () => {
        await pool.end()
        await pgContainer.stop()
    })

    describe("when event store empty", () => {
        test("should return an empty array when no events are stored", async () => {
            const events = await streamAllEventsToArray(eventStore.readAll())
            expect(events.length).toBe(0)
        })
        test("should assign a sequence number of 1 on appending the first event", async () => {
            const { lastSequenceNumber } = await eventStore.append(new EventType1(), AppendConditions.Any)
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
                const { lastSequenceNumber } = await eventStore.append(new EventType1(), appendCondition)
                expect(lastSequenceNumber.value).toBe(1)
            })
        })
    })

    describe("when event store has exactly one event", () => {
        beforeEach(async () => {
            await eventStore.append(new EventType1(), AppendConditions.Any)
        })

        test("should increment sequence number to 2 when a second event is appended", async () => {
            const { lastSequenceNumber } = await eventStore.append(new EventType1(), AppendConditions.Any)
            expect(lastSequenceNumber.value).toBe(2)
        })

        test("should update the sequence number to 3 after appending two more events", async () => {
            const { lastSequenceNumber } = await eventStore.append(
                [new EventType1(), new EventType1()],
                AppendConditions.Any
            )

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
    })
})
