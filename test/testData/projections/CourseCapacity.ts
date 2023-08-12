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
        courseCreated: (state, { event }) => ({
            isFull: event.data.capacity === 0,
            capacity: event.data.capacity,
            subscriberCount: 0
        }),
        courseCapacityChanged: ({ subscriberCount }, { event }) => ({
            subscriberCount,
            isFull: event.data.newCapacity <= subscriberCount,
            capacity: event.data.newCapacity
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
