import { Projection } from "../src/Projection"
import {
    CourseCreatedEvent,
    CourseCapacityChangedEvent,
    StudentSubscribedEvent,
    StudentUnsubscribedEvent
} from "./eventDefinitions"

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

export const CourseExists = (
    courseId: string
): Projection<{
    state: boolean
    tags: { courseId: string }
    eventHandlers: CourseCreatedEvent
}> => ({
    tags: { courseId },
    init: false,
    when: {
        courseCreated: async () => true
    }
})

const STUDENT_SUBSCRIPTION_LIMIT = 10
export const StudentSubscriptions = (
    studentId: string
): Projection<{
    state: { maxedOut: boolean; subscriptionCount: number }
    tags: { studentId: string }
    eventHandlers: StudentSubscribedEvent | StudentUnsubscribedEvent
}> => ({
    tags: { studentId },
    init: { maxedOut: false, subscriptionCount: 0 },
    when: {
        studentSubscribed: ({ subscriptionCount }) => ({
            maxedOut: STUDENT_SUBSCRIPTION_LIMIT <= subscriptionCount + 1,
            subscriptionCount: subscriptionCount + 1
        }),
        studentUnsubscribed: ({ subscriptionCount }) => ({
            maxedOut: STUDENT_SUBSCRIPTION_LIMIT <= subscriptionCount - 1,
            subscriptionCount: subscriptionCount - 1
        })
    }
})

export const StudentAlreadySubscribed = ({
    courseId,
    studentId
}: {
    courseId: string
    studentId: string
}): Projection<{
    state: boolean
    tags: { courseId: string; studentId: string }
    eventHandlers: StudentSubscribedEvent | StudentUnsubscribedEvent
}> => ({
    tags: { courseId, studentId },
    init: false,
    when: {
        studentSubscribed: () => true,
        studentUnsubscribed: () => false
    }
})
