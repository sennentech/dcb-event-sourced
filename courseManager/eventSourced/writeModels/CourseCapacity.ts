import { EventHandler } from "../../../eventHandling/src/EventHandler"
import {
    CourseWasCreatedEvent,
    CourseCapacityWasChangedEvent,
    StudentWasSubscribedEvent,
    StudentWasUnsubscribedEvent
} from "../Events"

export const CourseCapacity = (
    courseId: string
): EventHandler<{
    state: { isFull: boolean; subscriberCount: number; capacity: number }
    eventHandlers:
        | CourseWasCreatedEvent
        | CourseCapacityWasChangedEvent
        | StudentWasSubscribedEvent
        | StudentWasUnsubscribedEvent
}> => ({
    tagFilter: { courseId },
    init: { isFull: true, subscriberCount: 0, capacity: 0 },
    when: {
        courseWasCreated: ({ event }) => ({
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
