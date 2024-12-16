import { EventHandlerWithState } from "@dcb-es/event-handling"
import {
    CourseWasRegisteredEvent,
    CourseCapacityWasChangedEvent,
    StudentWasSubscribedEvent,
    StudentWasUnsubscribedEvent,
    StudentWasRegistered,
    CourseTitleWasChangedEvent
} from "./Events"

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
        courseWasRegistered: () => true
    }
})

export const CourseTitle = (
    courseId: string
): EventHandlerWithState<{
    state: string
    tagFilter: { courseId: string }
    eventHandlers: CourseWasRegisteredEvent | CourseTitleWasChangedEvent
}> => ({
    tagFilter: { courseId },
    init: "",
    when: {
        courseWasRegistered: ({ event }) => event.data.title,
        courseTitleWasChanged: ({ event }) => event.data.newTitle
    }
})

export const CourseCapacity = (
    courseId: string
): EventHandlerWithState<{
    state: { subscriberCount: number; capacity: number }
    eventHandlers:
    | CourseWasRegisteredEvent
    | CourseCapacityWasChangedEvent
    | StudentWasSubscribedEvent
    | StudentWasUnsubscribedEvent
}> => ({
    tagFilter: { courseId },
    init: { subscriberCount: 0, capacity: 0 },
    when: {
        courseWasRegistered: ({ event }) => ({
            capacity: event.data.capacity,
            subscriberCount: 0
        }),
        courseCapacityWasChanged: ({ event }, { subscriberCount }) => ({
            subscriberCount,
            capacity: event.data.newCapacity
        }),
        studentWasSubscribed: (_eventEnvelope, { capacity, subscriberCount }) => ({
            subscriberCount: subscriberCount + 1,
            capacity
        }),
        studentWasUnsubscribed: (eventEnvelope, { capacity, subscriberCount }) => ({
            subscriberCount: subscriberCount - 1,
            capacity
        })
    }
})

export const StudentAlreadyRegistered = (
    studentId: string
): EventHandlerWithState<{
    state: boolean
    tagFilter: { studentId: string }
    eventHandlers: StudentWasRegistered
}> => ({
    tagFilter: { studentId },
    init: false,
    when: {
        studentWasRegistered: () => true
    }
})

export const NextStudentNumber = (): EventHandlerWithState<{
    state: number
    eventHandlers: StudentWasRegistered
}> => ({
    init: 1,
    onlyLastEvent: true,
    when: {
        studentWasRegistered: ({ event }) => event.data.studentNumber + 1
    }
})

export const StudentAlreadySubscribed = ({
    courseId,
    studentId
}: {
    courseId: string
    studentId: string
}): EventHandlerWithState<{
    state: boolean
    tagFilter: { courseId: string; studentId: string }
    eventHandlers: StudentWasSubscribedEvent | StudentWasUnsubscribedEvent
}> => ({
    tagFilter: { courseId, studentId },
    init: false,
    when: {
        studentWasSubscribed: () => true,
        studentWasUnsubscribed: () => false
    }
})

export const StudentSubscriptions = (
    studentId: string
): EventHandlerWithState<{
    state: { subscriptionCount: number }
    eventHandlers: StudentWasSubscribedEvent | StudentWasUnsubscribedEvent
}> => ({
    tagFilter: { studentId },
    init: { subscriptionCount: 0 },
    when: {
        studentWasSubscribed: (_eventEnvelope, { subscriptionCount }) => ({
            subscriptionCount: subscriptionCount + 1
        }),
        studentWasUnsubscribed: (_eventEnvelope, { subscriptionCount }) => ({
            subscriptionCount: subscriptionCount - 1
        })
    }
})
