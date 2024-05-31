import { Pool } from "pg"
import { AppendConditions, EsEvent, EsEventEnvelope, Tags } from "../../eventStore/EventStore"
import { MemoryEventStore } from "../../eventStore/memoryEventStore/MemoryEventStore"
import { streamAllEventsToArray } from "../../eventStore/utils/streamAllEventsToArray"
import { EventHandler } from "../EventHandler"
import { EventPublisher } from "./EventPublisher"
import { EventHandlerRegistry } from "../EventHandlerRegistry"
import { PostgresTransactionManager } from "../postgresEventHandlerRegistry/PostgresTransactionManager"
import { PostgresEventHandlerRegistry } from "../postgresEventHandlerRegistry/PostgresEventHandlerRegistry"
import { SequenceNumber } from "../../eventStore/SequenceNumber"
import { getTestPgDatabasePool } from "../../jest.testPgDbPool"

class TestEvent implements EsEvent {
    type: "testEvent" = "testEvent"
    constructor(
        public data: { test: string },
        public tags: Tags
    ) {}
}

describe(`EventPublisher`, () => {
    let transactionManager: PostgresTransactionManager
    let pool: Pool
    let eventStore: MemoryEventStore

    beforeAll(async () => {
        pool = await getTestPgDatabasePool()

        transactionManager = new PostgresTransactionManager(pool)
    })
    beforeEach(async () => {
        eventStore = new MemoryEventStore()
    })
    afterAll(async () => {
        if (pool) await pool.end()
    })

    describe(`with no projection registry`, () => {
        let eventPublisher: EventPublisher

        beforeEach(async () => {
            eventPublisher = new EventPublisher(eventStore)
        })

        test(`should append event to event store`, async () => {
            await eventPublisher.publish(new TestEvent({ test: "test1" }, {}), AppendConditions.Any)
            const events = await streamAllEventsToArray(eventStore.readAll())
            expect(events).toHaveLength(1)
            expect(events[0].sequenceNumber.value).toBe(1)
            expect(events[0]?.event?.type).toBe("testEvent")
        })

        test(`should append multiple events to event store`, async () => {
            await eventPublisher.publish(new TestEvent({ test: "test1" }, {}), AppendConditions.Any)
            await eventPublisher.publish(new TestEvent({ test: "test2" }, {}), AppendConditions.Any)
            const events = await streamAllEventsToArray(eventStore.readAll())
            expect(events).toHaveLength(2)
            expect(events[0].sequenceNumber.value).toBe(1)
            expect(events[1].sequenceNumber.value).toBe(2)
            expect(events[0]?.event?.data).toHaveProperty("test", "test1")
            expect(events[1]?.event?.data).toHaveProperty("test", "test2")
        })
    })

    describe(`with projection registry`, () => {
        let registry: EventHandlerRegistry
        let eventPublisher: EventPublisher
        const eventsSeenByProjection: EsEventEnvelope[] = []
        beforeAll(async () => {
            const projection: EventHandler<{
                eventHandlers: TestEvent
            }> = {
                when: {
                    testEvent: async event => {
                        eventsSeenByProjection.push(event)
                    }
                }
            }
            registry = new PostgresEventHandlerRegistry(transactionManager, {
                "test-projection": projection
            })
            await registry.install()
        })
        beforeEach(async () => {
            await pool.query(`update _event_handler_bookmarks set last_sequence_number = 0;`)
            eventsSeenByProjection.length = 0
            eventStore = new MemoryEventStore()
            eventPublisher = new EventPublisher(eventStore, registry)
        })

        test("Projection sees published event", async () => {
            await eventPublisher.publish(new TestEvent({ test: "test1" }, {}), AppendConditions.Any)
            expect(eventsSeenByProjection).toHaveLength(1)
            expect(eventsSeenByProjection[0].event.type).toBe("testEvent")
            expect(eventsSeenByProjection[0].event.data).toHaveProperty("test", "test1")
        })

        test("Event publisher applies catchup when projection not date", async () => {
            //pre events
            await eventStore.append(
                [
                    new TestEvent({ test: "test1" }, {}),
                    new TestEvent({ test: "test1" }, {}),
                    new TestEvent({ test: "test1" }, {})
                ],
                AppendConditions.Any
            )

            let readCount = 0
            eventStore.on("read", () => readCount++)

            await eventPublisher.publish(new TestEvent({ test: "test1" }, {}), AppendConditions.Any)
            expect(readCount).toBe(2)
            expect(eventsSeenByProjection).toHaveLength(4)
            expect(eventsSeenByProjection[eventsSeenByProjection.length - 1].sequenceNumber).toEqual(
                SequenceNumber.create(4)
            )
        })

        test("Event publisher efficiently applies last event when projection upto date", async () => {
            //pre events
            await eventStore.append(
                [
                    new TestEvent({ test: "test1" }, {}),
                    new TestEvent({ test: "test1" }, {}),
                    new TestEvent({ test: "test1" }, {})
                ],
                AppendConditions.Any
            )

            //change internals so projection has seen all 3 events
            await pool.query(`update _event_handler_bookmarks set last_sequence_number = 3;`)

            let readCount = 0
            eventStore.on("read", () => readCount++)

            await eventPublisher.publish(new TestEvent({ test: "test1" }, {}), AppendConditions.Any)
            expect(readCount).toBe(1)
            expect(eventsSeenByProjection).toHaveLength(1)
            expect(eventsSeenByProjection[eventsSeenByProjection.length - 1].sequenceNumber).toEqual(
                SequenceNumber.create(4)
            )
        })
    })
})
