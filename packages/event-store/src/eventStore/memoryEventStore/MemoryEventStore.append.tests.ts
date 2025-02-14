import { MemoryEventStore } from "./MemoryEventStore"
import { AppendCondition, DcbEvent, Queries } from "../EventStore"
import { SequencePosition } from "../../SequencePosition"
import { streamAllEventsToArray } from "../../streamAllEventsToArray"

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

describe("memoryEventStore.append", () => {
    let eventStore: MemoryEventStore

    describe("when event store empty", () => {
        beforeEach(async () => {
            eventStore = new MemoryEventStore()
        })

        test("should return an empty array when no events are stored", async () => {
            const events = await streamAllEventsToArray(eventStore.read(Queries.all))
            expect(events.length).toBe(0)
        })
        test("should assign a sequence number of 1 on appending the first event", async () => {
            await eventStore.append(new EventType1())
            const events = await streamAllEventsToArray(eventStore.read(Queries.all))
            const lastSequencePosition = events.at(-1)?.sequencePosition

            expect(lastSequencePosition?.value).toBe(1)
        })
        describe("when append condition with eventTypes filter and maxSequencePosition provided", () => {
            const appendCondition: AppendCondition = {
                query: [{ eventTypes: ["testEvent1"], tags: {} }],
                expectedCeiling: SequencePosition.create(1)
            }
            test("should successfully append an event without throwing under specified conditions", async () => {
                await eventStore.append(new EventType1(), appendCondition)
                const events = await streamAllEventsToArray(eventStore.read(Queries.all))
                const lastSequencePosition = events.at(-1)?.sequencePosition

                expect(lastSequencePosition?.value).toBe(1)
            })
        })
    })

    describe("when event store has exactly one event", () => {
        beforeEach(async () => {
            eventStore = new MemoryEventStore()
            await eventStore.append(new EventType1())
        })

        test("should increment sequence number to 2 when a second event is appended", async () => {
            await eventStore.append(new EventType1())
            const events = await streamAllEventsToArray(eventStore.read(Queries.all))
            const lastSequencePosition = events.at(-1)?.sequencePosition

            expect(lastSequencePosition?.value).toBe(2)
        })

        test("should update the sequence number to 3 after appending two more events", async () => {
            await eventStore.append([new EventType1(), new EventType1()])
            const events = await streamAllEventsToArray(eventStore.read(Queries.all))
            const lastSequencePosition = events.at(-1)?.sequencePosition

            expect(lastSequencePosition?.value).toBe(3)
        })

        describe("when append condition with eventTypes filter and maxSequencePosition provided", () => {
            const appendCondition: AppendCondition = {
                query: [{ eventTypes: ["testEvent1"], tags: {} }],
                expectedCeiling: SequencePosition.zero()
            }
            test("should throw an error if appended event exceeds the maximum allowed sequence number", async () => {
                await expect(eventStore.append(new EventType1(), appendCondition)).rejects.toThrow(
                    "Expected Version fail: New events matching appendCondition found."
                )
            })
        })

        test("test append count works", async () => {
            let appendCount = 0
            eventStore.on("append", () => appendCount++)
            await eventStore.append(new EventType1())

            expect(appendCount).toBe(1)
        })
    })
})
