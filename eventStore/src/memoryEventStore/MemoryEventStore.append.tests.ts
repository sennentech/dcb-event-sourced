import { expect } from "chai"
import { MemoryEventStore } from "./MemoryEventStore"
import { AppendCondition, AppendConditions, EsEvent } from "../EventStore"
import { SequenceNumber } from "../SequenceNumber"
import { streamAllEventsToArray } from "../utils/streamAllEventsToArray"

class EventType1 implements EsEvent {
    type: "testEvent1" = "testEvent1"
    tags: { testTagKey?: string }
    data: Record<string, never>

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

        it("should return an empty array when no events are stored", async () => {
            const events = await streamAllEventsToArray(eventStore.read())
            expect(events.length).to.equal(0)
        })
        it("should assign a sequence number of 1 on appending the first event", async () => {
            const { lastSequenceNumber } = await eventStore.append(new EventType1(), AppendConditions.Any)
            expect(lastSequenceNumber.value).to.equal(1)
        })
        describe("when append condition with eventTypes filter and maxSequenceNumber provided", () => {
            const appendCondition: AppendCondition = {
                query: {
                    criteria: [{ eventTypes: ["testEvent1"], tags: {} }]
                },
                maxSequenceNumber: SequenceNumber.create(1)
            }
            it("should successfully append an event without throwing under specified conditions", async () => {
                const { lastSequenceNumber } = await eventStore.append(new EventType1(), appendCondition)
                expect(lastSequenceNumber.value).to.equal(1)
            })
        })
    })

    describe("when event store has exactly one event", () => {
        beforeEach(async () => {
            eventStore = new MemoryEventStore()
            await eventStore.append(new EventType1(), AppendConditions.Any)
        })

        it("should increment sequence number to 2 when a second event is appended", async () => {
            const { lastSequenceNumber } = await eventStore.append(new EventType1(), AppendConditions.Any)
            expect(lastSequenceNumber.value).to.equal(2)
        })

        it("should update the sequence number to 3 after appending two more events", async () => {
            const { lastSequenceNumber } = await eventStore.append(
                [new EventType1(), new EventType1()],
                AppendConditions.Any
            )

            expect(lastSequenceNumber.value).to.equal(3)
        })

        describe("when append condition with eventTypes filter and maxSequenceNumber provided", () => {
            const appendCondition: AppendCondition = {
                query: {
                    criteria: [{ eventTypes: ["testEvent1"], tags: {} }]
                },
                maxSequenceNumber: SequenceNumber.zero()
            }
            it("should throw an error if appended event exceeds the maximum allowed sequence number", async () => {
                await expect(eventStore.append(new EventType1(), appendCondition)).to.be.rejectedWith(
                    "Expected Version fail: New events matching appendCondition found."
                )
            })
        })
    })
})
