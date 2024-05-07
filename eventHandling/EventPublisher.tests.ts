import { AppendConditions, EventStore } from "../eventStore/EventStore"
import { MemoryEventStore } from "../eventStore/memoryEventStore/MemoryEventStore"
import { streamAllEventsToArray } from "../eventStore/utils/streamAllEventsToArray"
import { EventPublisher } from "./EventPublisher"

describe(`EventPublisher`, () => {
    let eventStore: EventStore
    let eventPublisher: EventPublisher

    describe(`with no projection registry`, () => {
        beforeAll(async () => {
            eventStore = new MemoryEventStore()
            eventPublisher = new EventPublisher(eventStore)
        })

        test(`should append event to event store`, async () => {
            await eventPublisher.publish({ type: "TestEvent", data: { test: "test" }, tags: {} }, AppendConditions.Any)
            const events = await streamAllEventsToArray(eventStore.readAll())
            expect(events).toHaveLength(1)
            expect(events[0].sequenceNumber.value).toBe(1)
            expect(events[0]?.event?.type).toBe("TestEvent")
        })
    })
})
