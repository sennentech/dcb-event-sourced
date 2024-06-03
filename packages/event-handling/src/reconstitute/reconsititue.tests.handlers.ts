import { EventHandlerWithState } from "../EventHandlerWithState"
import {
    CourseWasRegisteredEvent,
    CourseCapacityWasChangedEvent,
    StudentWasSubscribedEvent,
    StudentWasUnsubscribedEvent
} from "./reconstitute.tests.events"

export const CourseExists = (
    courseId: string
): EventHandlerWithState<{
    state: boolean
    tagFilter: { courseId: string }
    eventHandlers: CourseWasRegisteredEvent
}> => ({
    tagFilter: { courseId },
    init: false,
    when: {
        courseWasRegistered: async () => true
    }
})

export const CourseCapacity = (
    courseId: string
): EventHandlerWithState<{
    state: { isFull: boolean; subscriberCount: number; capacity: number }
    eventHandlers:
        | CourseWasRegisteredEvent
        | CourseCapacityWasChangedEvent
        | StudentWasSubscribedEvent
        | StudentWasUnsubscribedEvent
}> => ({
    tagFilter: { courseId },
    init: { isFull: true, subscriberCount: 0, capacity: 0 },
    when: {
        courseWasRegistered: ({ event }) => ({
            isFull: event.data.capacity === 0,
            capacity: event.data.capacity,
            subscriberCount: 0
        }),
        courseCapacityWasChanged: ({ event }, { subscriberCount }) => ({
            subscriberCount,
            isFull: event.data.newCapacity <= subscriberCount,
            capacity: event.data.newCapacity
        }),
        studentWasSubscribed: (_eventEnvelope, { capacity, subscriberCount }) => ({
            isFull: capacity <= subscriberCount + 1,
            subscriberCount: subscriberCount + 1,
            capacity
        }),
        studentWasUnsubscribed: (eventEnvelope, { capacity, subscriberCount }) => ({
            isFull: capacity <= subscriberCount - 1,
            subscriberCount: subscriberCount - 1,
            capacity
        })
    }
})
