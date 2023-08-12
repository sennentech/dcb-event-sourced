import { expect } from "chai"
import { AppendConditions } from "../../src/eventStore/EventStore"
import { MemoryEventStore } from "../../src/eventStore/memoryEventStore/MemoryEventStore"
import { CourseCapacityChangedEvent, CourseCreatedEvent } from "../testData/events"
import { reconstitute } from "../../src/projection/Reconsitute"
import * as R from "ramda"
import { CourseCapacity } from "../testData/projections/CourseCapacity"
import { CourseExists } from "../testData/projections/CourseExists"

describe("reconstitute", () => {
    describe("when event store has no events", () => {
        it("course exists projection returns default state", async () => {
            const eventStore = new MemoryEventStore()
            const courseId = "course-1"

            const {
                states: { courseExists },
                appendCondition
            } = await reconstitute(eventStore, { courseExists: CourseExists(courseId) })

            expect(courseExists).to.equal(false)
            expect(appendCondition?.maxSequenceNumber?.value).to.equal(1)

            const {
                query: {
                    criteria: [{ eventTypes, tags }]
                }
            } = appendCondition
            expect(eventTypes.length).to.equal(1)
            expect(eventTypes[0]).to.equal("courseCreated")
            expect(R.keys(tags).length).to.equal(1)
            expect(tags.courseId).to.equal("course-1")
        })
    })

    describe("when event store has 1 course create event and 1 capacity changed event", async () => {
        const eventStore = new MemoryEventStore()
        const courseId = "course-1"
        await eventStore.append(new CourseCreatedEvent({ courseId, capacity: 10 }), AppendConditions.None)
        await eventStore.append(new CourseCapacityChangedEvent({ courseId, newCapacity: 15 }), AppendConditions.None)

        it("course exists projection sees event", async () => {
            const {
                states: { courseExists },
                appendCondition
            } = await reconstitute(eventStore, { courseExists: CourseExists(courseId) })

            expect(courseExists).to.equal(true)

            const {
                query: {
                    criteria: [{ eventTypes, tags }]
                }
            } = appendCondition
            expect(eventTypes.length).to.equal(1)
            expect(eventTypes[0]).to.equal("courseCreated")
            expect(R.keys(tags).length).to.equal(1)
            expect(tags.courseId).to.equal("course-1")
        })

        it("course capacity projection state has updated capacity", async () => {
            const {
                states: { courseCapacity },
                appendCondition
            } = await reconstitute(eventStore, { courseCapacity: CourseCapacity(courseId) })

            expect(courseCapacity.capacity).to.equal(15)
            expect(courseCapacity.isFull).to.equal(false)
            expect(courseCapacity.subscriberCount).to.equal(0)

            const {
                query: {
                    criteria: [{ eventTypes, tags }]
                },
                maxSequenceNumber
            } = appendCondition
            expect(eventTypes.length).to.equal(4)
            expect([
                "courseCreated",
                "courseCapacityChanged",
                "studentUnsubscribed",
                "studentSubscribed"
            ]).to.have.all.members(eventTypes)
            expect(R.keys(tags).length).to.equal(1)
            expect(tags.courseId).to.equal("course-1")
            expect(maxSequenceNumber.value).to.equal(2)
        })

        it("course capacity and course exists projection states updated", async () => {
            const {
                states: { courseCapacity, courseExists },
                appendCondition
            } = await reconstitute(eventStore, {
                courseCapacity: CourseCapacity(courseId),
                courseExists: CourseExists(courseId)
            })

            expect(courseCapacity.capacity).to.equal(15)
            expect(courseCapacity.isFull).to.equal(false)
            expect(courseCapacity.subscriberCount).to.equal(0)
            expect(courseExists).to.equal(true)

            const {
                query: {
                    criteria: [crit1, crit2]
                },
                maxSequenceNumber
            } = appendCondition

            expect(maxSequenceNumber.value).to.equal(2)

            expect(crit1.eventTypes.length).to.equal(4)
            expect([
                "courseCreated",
                "courseCapacityChanged",
                "studentUnsubscribed",
                "studentSubscribed"
            ]).to.have.all.members(crit1.eventTypes)
            expect(R.keys(crit1.tags).length).to.equal(1)
            expect(crit1.tags.courseId).to.equal("course-1")

            expect(crit2.eventTypes.length).to.equal(1)
            expect(crit2.eventTypes[0]).to.equal("courseCreated")
            expect(R.keys(crit2.tags).length).to.equal(1)
            expect(crit2.tags.courseId).to.equal("course-1")
        })
    })
})
