import { expect } from "chai"
import { AppendConditions } from "../../eventStore/src/EventStore"
import { MemoryEventStore } from "../../eventStore/src/memoryEventStore/MemoryEventStore"
import { CourseCreatedEvent } from "../testData/events"
import { Course, PersistentPartitionedCourse } from "../testData/eventListeners/PersistentPartionedCourse"
import * as sinon from "sinon"
import { handleEvents } from "../../eventHandlers/src/applyEventsToHandler"
import { SequenceNumber } from "../../eventStore/src/SequenceNumber"
const sandbox = sinon.createSandbox()

describe("persistentPartitionedEventListeners", () => {
    describe("when using course repository in partitioned state handler", () => {
        const eventStore = new MemoryEventStore()
        const courseRepository = {
            findById: sandbox.stub<[string], Course>().returns(undefined),
            save: sandbox.stub<[string, Course]>()
        }
        const courseEventListener = PersistentPartitionedCourse(courseRepository)
        beforeEach(() => {
            sandbox.reset()
            eventStore.reset()
        })

        describe("when single course created event", () => {
            let lastSequenceNumberSeen: SequenceNumber
            beforeEach(async () => {
                eventStore.append(new CourseCreatedEvent({ courseId: "course-1", capacity: 10 }), AppendConditions.None)
                lastSequenceNumberSeen = (await handleEvents(eventStore, courseEventListener)).lastSequenceNumberSeen
            })
            it("last sequence number is one", async () => {
                expect(lastSequenceNumberSeen.value).to.equal(1)
            })
            it("findById was called once with correct args", async () => {
                sandbox.assert.calledOnceWithExactly(courseRepository.findById, "course-1")
            })
            it("save was called once with correct state from init and listener", async () => {
                sandbox.assert.calledOnceWithExactly(courseRepository.save, "course-1", {
                    id: "course-1",
                    capacity: 10,
                    subscriptions: 0
                })
            })
        })
    })
})
