import { PartitionedStateEventHandler } from "../../eventHandling/src/EventHandler"
import { CourseCapacityWasChangedEvent, CourseWasCreatedEvent } from "../events"
import * as R from "ramda"

export interface Course {
    id: string
    capacity: number
    subscriptions: number
}
export interface CourseRepository {
    findById(id: string): Course
    save(id: string, course: Course): void
}

export const PersistentPartitionedCourse = (
    repository: CourseRepository
): PartitionedStateEventHandler<{
    state: Course
    eventHandlers: CourseWasCreatedEvent | CourseCapacityWasChangedEvent
}> => ({
    init: { id: undefined, capacity: 0, subscriptions: 0 },
    partitionByTags: ({ courseId }) => courseId,
    when: {
        courseWasCreated: async ({ event }, { subscriptions }) => {
            return {
                id: event.tags.courseId,
                capacity: event.data.capacity,
                subscriptions
            }
        },
        courseCapacityWasChanged: async ({ event }, course) => {
            return R.assoc("capacity", event.data.newCapacity, course)
        }
    },
    stateManager: {
        read: async courseId => {
            return repository.findById(courseId)
        },
        save: async (courseId, course) => {
            repository.save(courseId, course)
        }
    }
})
