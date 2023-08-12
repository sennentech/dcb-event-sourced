import { Projection } from "../../../src/projection/Projection"
import {
    CourseCreatedEvent,
    CourseCapacityChangedEvent,
    StudentSubscribedEvent,
    StudentUnsubscribedEvent
} from "../events"

export const CourseCapacity = (
    courseId: string
): Projection<{
    state: { isFull: boolean; subscriberCount: number; capacity: number }
    tags: { courseId: string }
    eventHandlers: CourseCreatedEvent | CourseCapacityChangedEvent | StudentSubscribedEvent | StudentUnsubscribedEvent
}> => ({
    tags: { courseId },
    init: { isFull: true, subscriberCount: 0, capacity: 0 },
    when: {
        courseCreated: (state, { data: { capacity } }) => ({
            isFull: capacity === 0,
            capacity,
            subscriberCount: 0
        }),
        courseCapacityChanged: ({ subscriberCount }, { data: { newCapacity } }) => ({
            subscriberCount,
            isFull: newCapacity <= subscriberCount,
            capacity: newCapacity
        }),
        studentSubscribed: ({ capacity, subscriberCount }) => ({
            isFull: capacity <= subscriberCount + 1,
            subscriberCount: subscriberCount + 1,
            capacity
        }),
        studentUnsubscribed: ({ capacity, subscriberCount }) => ({
            isFull: capacity <= subscriberCount - 1,
            subscriberCount: subscriberCount - 1,
            capacity
        })
    }
})
