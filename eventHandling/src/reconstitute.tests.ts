import { expect } from "chai"
import { AppendCondition, AppendConditions } from "../../eventStore/src/EventStore"
import { MemoryEventStore } from "../../eventStore/src/memoryEventStore/MemoryEventStore"
import * as R from "ramda"
import { reconstitute } from "./reconstitute"
import { CourseCapacity, CourseExists } from "./reconsititue.tests.handlers"
import { CourseCapacityWasChangedEvent, CourseWasCreatedEvent } from "./reconstitute.tests.events"
import { SequenceNumber } from "../../eventStore/src/SequenceNumber"
const COURSE_ID = "course-1"

describe("reconstitute", () => {
    let eventStore: MemoryEventStore
    let appendCondition: AppendCondition

    beforeEach(() => {
        eventStore = new MemoryEventStore()
    })

    describe("when event store is empty", () => {
        describe("should handle default state for course exists eventHandler", () => {
            let courseExists: boolean

            beforeEach(async () => {
                const result = await reconstitute(eventStore, { courseExists: CourseExists(COURSE_ID) })
                courseExists = result.states.courseExists
                appendCondition = result.appendCondition
            })

            it("should indicate course does not exist", async () => {
                expect(courseExists).to.equal(false)
            })

            it("should set the maximum sequence number to 0 in appendCondition", async () => {
                expect(appendCondition?.maxSequenceNumber.value).to.equal(SequenceNumber.zero().value)
            })

            it("should have a single eventType of 'courseWasCreated' in appendCondition", async () => {
                const { eventTypes } = appendCondition.query.criteria[0]
                expect(eventTypes.length).to.equal(1)
                expect(eventTypes[0]).to.equal("courseWasCreated")
            })

            it("should include 'courseId' as a tag in appendCondition", async () => {
                const { tags } = appendCondition.query.criteria[0]
                expect(R.keys(tags).length).to.equal(1)
                expect(tags.courseId).to.equal("course-1")
            })
        })
    })

    describe("when event store contains 1 course created event", () => {
        let courseExists: boolean
        beforeEach(async () => {
            await eventStore.append(
                new CourseWasCreatedEvent({ courseId: COURSE_ID, capacity: 10 }),
                AppendConditions.Any
            )

            const result = await reconstitute(eventStore, { courseExists: CourseExists(COURSE_ID) })
            courseExists = result.states.courseExists
            appendCondition = result.appendCondition
        })

        it("should detect existing course via eventHandler", async () => {
            expect(courseExists).to.be.true
        })

        it("should set the maximum sequence number to 1 in appendCondition", async () => {
            expect(appendCondition?.maxSequenceNumber.value).to.equal(1)
        })

        it("should have a single eventType of 'courseWasCreated' in appendCondition", async () => {
            const { eventTypes } = appendCondition.query.criteria[0]
            expect(eventTypes.length).to.equal(1)
            expect(eventTypes[0]).to.equal("courseWasCreated")
        })

        it("should include 'courseId' as a tag in appendCondition", async () => {
            const { tags } = appendCondition.query.criteria[0]
            expect(R.keys(tags).length).to.equal(1)
            expect(tags.courseId).to.equal("course-1")
        })
    })

    describe("when event store contains 1 course created event and 1 capacity changed event with CourseCapacity handler", () => {
        let courseCapacity: ReturnType<typeof CourseCapacity>["init"]
        beforeEach(async () => {
            await eventStore.append(
                new CourseWasCreatedEvent({ courseId: COURSE_ID, capacity: 10 }),
                AppendConditions.Any
            )
            await eventStore.append(
                new CourseCapacityWasChangedEvent({ courseId: COURSE_ID, newCapacity: 15 }),
                AppendConditions.Any
            )
            const result = await reconstitute(eventStore, { courseCapacity: CourseCapacity(COURSE_ID) })
            courseCapacity = result.states.courseCapacity
            appendCondition = result.appendCondition
        })

        it("should have assigned the new capacity of 15 to the course", async () => {
            expect(courseCapacity.capacity).to.equal(15)
        })

        it("should set the maximum sequence number to 2 in appendCondition", async () => {
            expect(appendCondition?.maxSequenceNumber.value).to.equal(2)
        })

        it("should have the 4 correct eventTypes in appendCondition", async () => {
            const { eventTypes } = appendCondition.query.criteria[0]
            expect(eventTypes.length).to.equal(4)
            expect([
                "courseWasCreated",
                "courseCapacityWasChanged",
                "studentWasUnsubscribed",
                "studentWasSubscribed"
            ]).to.have.all.members(eventTypes)
        })

        it("should include 'courseId' as a tag in appendCondition", async () => {
            const { tags } = appendCondition.query.criteria[0]
            expect(R.keys(tags).length).to.equal(1)
            expect(tags.courseId).to.equal("course-1")
        })
    })

    describe("when event store contains 1 course created event and 1 capacity changed event with CourseCapacity and CourseExists handler", () => {
        let courseCapacity: ReturnType<typeof CourseCapacity>["init"]
        let courseExists: boolean
        beforeEach(async () => {
            await eventStore.append(
                new CourseWasCreatedEvent({ courseId: COURSE_ID, capacity: 10 }),
                AppendConditions.Any
            )
            await eventStore.append(
                new CourseCapacityWasChangedEvent({ courseId: COURSE_ID, newCapacity: 15 }),
                AppendConditions.Any
            )
            const result = await reconstitute(eventStore, {
                courseCapacity: CourseCapacity(COURSE_ID),
                courseExists: CourseExists(COURSE_ID)
            })
            courseCapacity = result.states.courseCapacity
            courseExists = result.states.courseExists
            appendCondition = result.appendCondition
        })

        it("should have assigned the new capacity of 15 to the course", async () => {
            expect(courseCapacity.capacity).to.equal(15)
        })

        it("should set the maximum sequence number to 2 in appendCondition", async () => {
            expect(appendCondition?.maxSequenceNumber.value).to.equal(2)
        })

        it("should have the 4 correct eventTypes in appendCondition", async () => {
            const { eventTypes } = appendCondition.query.criteria[0]
            expect(eventTypes.length).to.equal(4)
            expect([
                "courseWasCreated",
                "courseCapacityWasChanged",
                "studentWasUnsubscribed",
                "studentWasSubscribed"
            ]).to.have.all.members(eventTypes)
        })

        it("should include 'courseId' as a tag in appendCondition", async () => {
            const { tags } = appendCondition.query.criteria[0]
            expect(R.keys(tags).length).to.equal(1)
            expect(tags.courseId).to.equal("course-1")
        })

        it("should indicate course exists", async () => {
            expect(courseExists).to.be.true
        })
    })
})
