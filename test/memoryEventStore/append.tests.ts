import { expect } from "chai"
import { MemoryEventStore } from "../../src/eventStore/MemoryEventStore"
import { AppendCondition } from "../../src/EventStore"
import { TestEvent } from "./TestEvent"

describe("memoryEventStore.append", () => {
    describe("when event store empty", () => {
        it("append gives new sequence number of 1", async () => {
            const eventStore = new MemoryEventStore()
            const { lastSequenceNumber } = await eventStore.append(new TestEvent("ev-1"), AppendCondition.None)

            expect(lastSequenceNumber.value).to.equal(1)
        })
    })
})
