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
    tagFilter: { courseId: string }
    eventHandlers: CourseCreatedEvent | CourseCapacityChangedEvent | StudentSubscribedEvent | StudentUnsubscribedEvent
}> => ({
    tagFilter: { courseId },
    init: { isFull: true, subscriberCount: 0, capacity: 0 },
    when: {
        courseCreated: ({ event }) => ({
            isFull: event.data.capacity === 0,
            capacity: event.data.capacity,
            subscriberCount: 0
        }),
        courseCapacityChanged: ({ event }, { subscriberCount }) => ({
            subscriberCount,
            isFull: event.data.newCapacity <= subscriberCount,
            capacity: event.data.newCapacity
        }),
        studentSubscribed: (_eventEnvelope, { capacity, subscriberCount }) => ({
            isFull: capacity <= subscriberCount + 1,
            subscriberCount: subscriberCount + 1,
            capacity
        }),
        studentUnsubscribed: (eventEnvelope, { capacity, subscriberCount }) => ({
            isFull: capacity <= subscriberCount - 1,
            subscriberCount: subscriberCount - 1,
            capacity
        })
    }
})
