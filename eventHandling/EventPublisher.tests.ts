import { AppendConditions, EsEvent, EsEventEnvelope, EventStore, Tags } from "../eventStore/EventStore"
import { MemoryEventStore } from "../eventStore/memoryEventStore/MemoryEventStore"
import { streamAllEventsToArray } from "../eventStore/utils/streamAllEventsToArray"
import { EventHandler, ProjectionRegistry } from "./EventHandler"
import { EventPublisher } from "./EventPublisher"

class TestEvent implements EsEvent {
    type: "testEvent" = "testEvent"
    constructor(
        public data: { test: string },
        public tags: Tags
    ) {}
}

describe(`EventPublisher`, () => {
    let eventStore: EventStore
    let eventPublisher: EventPublisher

    describe(`with no projection registry`, () => {
        beforeEach(async () => {
            eventStore = new MemoryEventStore()
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
                    lockManager: null
                }
            ]

            eventStore = new MemoryEventStore()
            eventPublisher = new EventPublisher(eventStore, registry)
        })
        beforeEach(() => {
            eventsSeenByProjection.length = 0
        })

        test.skip("Projection sees published event", async () => {
            await eventPublisher.publish(new TestEvent({ test: "test1" }, {}), AppendConditions.Any)
            expect(eventsSeenByProjection).toHaveLength(1)
            expect(eventsSeenByProjection[0].event.type).toBe("testEvent")
            expect(eventsSeenByProjection[0].event.data).toHaveProperty("test", "test1")
        })
    })
})
