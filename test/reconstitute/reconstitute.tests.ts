import { expect } from "chai"
import { AppendCondition } from "../../src/EventStore"
import { MemoryEventStore } from "../../src/eventStore/MemoryEventStore"
import { CourseCreatedEvent } from "../eventDefinitions"
import { CourseExists } from "../projections"
import { reconstitute } from "../../src/Reconsitute"

describe("reconstitute", () => {
    describe("when event store has no events", () => {
        it.only("course exists projection returns default state", async () => {
            const eventStore = new MemoryEventStore()
            const courseId = "course-1"

            const {
                states: { courseExists }
            } = await reconstitute(eventStore, { courseExists: CourseExists(courseId) })

            expect(courseExists).to.equal(false)
        })
    })
    describe("when event store has 1 course create event", () => {
        it("course exists projection sees event", async () => {
            const eventStore = new MemoryEventStore()
            const courseId = "course-1"
            const { lastSequenceNumber } = await eventStore.append(
                new CourseCreatedEvent({ courseId, capacity: 10 }),
                AppendCondition.None
            )

            const {
                states: { courseExists },
                appendCondition
            } = await reconstitute(eventStore, { courseExists: CourseExists(courseId) })

            expect(courseExists).to.equal(true)
        })
    })
})
