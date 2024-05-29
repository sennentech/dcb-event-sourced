import { Pool } from "pg"
import { AppendConditions, EsEvent, EsEventEnvelope, EventStore, Tags } from "../eventStore/EventStore"
import { MemoryEventStore } from "../eventStore/memoryEventStore/MemoryEventStore"
import { streamAllEventsToArray } from "../eventStore/utils/streamAllEventsToArray"
import { EventHandler } from "./EventHandler"
import { EventPublisher } from "./EventPublisher"
import { EventHandlerRegistry } from "./handlerRegistry/EventHandlerRegistry"
import { PostgresTransactionManager } from "./PostgresTransactionManager"
import { PostgresEventHandlerRegistry } from "./handlerRegistry/postgresRegistry/PostgresEventHandlerRegistry"

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
    let eventStore: EventStore

    beforeAll(async () => {
        pool = new Pool({
            connectionString: await global.__GET_TEST_PG_DATABASE_URI()
        })
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

            eventStore = new MemoryEventStore()
            eventPublisher = new EventPublisher(eventStore, registry)
        })
        beforeEach(() => {
            eventsSeenByProjection.length = 0
        })

        test("Projection sees published event", async () => {
            await eventPublisher.publish(new TestEvent({ test: "test1" }, {}), AppendConditions.Any)
            expect(eventsSeenByProjection).toHaveLength(1)
            expect(eventsSeenByProjection[0].event.type).toBe("testEvent")
            expect(eventsSeenByProjection[0].event.data).toHaveProperty("test", "test1")
        })
    })
})
