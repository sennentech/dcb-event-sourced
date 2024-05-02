import { EventHandler } from "./EventHandler"
import {
    CourseCreatedEvent,
    CourseCapacityChangedEvent,
    StudentSubscribedEvent,
    StudentUnsubscribedEvent
} from "./reconstitute.tests.events"

export const CourseExists = (
    courseId: string
): EventHandler<{
    state: boolean
    tagFilter: { courseId: string }
    eventHandlers: CourseCreatedEvent
}> => ({
    tagFilter: { courseId },
    init: false,
    when: {
        courseCreated: async () => true
    }
})

export const CourseCapacity = (
    courseId: string
): EventHandler<{
    state: { isFull: boolean; subscriberCount: number; capacity: number }
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
