import { AppendConditions, EsEvent, EsEventEnvelope, EventStore, Tags } from "../eventStore/EventStore"
import { MemoryEventStore } from "../eventStore/memoryEventStore/MemoryEventStore"
import { getPgMemDb } from "../eventStore/utils/getPgMemDb"
import { streamAllEventsToArray } from "../eventStore/utils/streamAllEventsToArray"
import { EventHandler, ProjectionRegistry } from "./EventHandler"
import { EventPublisher } from "./EventPublisher"
import { EventHandlerLockManager, PostgresLockManager } from "./LockManager"

class TestEvent implements EsEvent {
    type: "testEvent" = "testEvent"
    constructor(
        public data: { test: string },
        public tags: Tags
    ) {}
}

describe(`EventPublisher`, () => {
    let lockManager: PostgresLockManager
    let eventStore: EventStore

    beforeAll(async () => {
        const pool = new (await getPgMemDb().adapters.createPg().Pool)()
        lockManager = new PostgresLockManager(pool, "test-handler")
        await lockManager.install()
    })
    beforeEach(async () => {
        eventStore = new MemoryEventStore()
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
            const registry: ProjectionRegistry = [
                {
                    handler: projection,
                    lockManager
                }
            ]

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
