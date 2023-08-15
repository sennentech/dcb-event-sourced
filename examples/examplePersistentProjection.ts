import { PartitionedPersistentProjection, PersistentProjection, Projection } from "../src/projection/Projection"
import { CourseCapacityChangedEvent, CourseCreatedEvent } from "../test/testData/events"
import * as R from "ramda"

interface Course {
    id: string
    capacity: number
}
interface CourseRepository {
    findById(id: string): Promise<Course>
    save(id: string, course: Course): Promise<void>
}

const CourseManager = (
    repository: CourseRepository
): PartitionedPersistentProjection<{
    state: Course
    eventHandlers: CourseCreatedEvent | CourseCapacityChangedEvent
}> => ({
    init: null,
    partitionByTags: ({ courseId }) => courseId,
    when: {
        courseCreated: async ({ event, timestamp }) => {
            return {
                id: event.tags.courseId,
                capacity: event.data.capacity,
                timestamp
            }
        },
        courseCapacityChanged: async ({ event }, course) => {
            return R.assoc("capacity", event.data.newCapacity, course)
        }
    },
    stateManager: {
        read: async courseId => {
            return repository.findById(courseId)
        },
        save: async (courseId, course) => {
            await repository.save(courseId, course)
        }
    }
})

console.log(CourseManager)
