import { Projection } from "../../../src/projection/Projection"
import { StudentSubscribedEvent, StudentUnsubscribedEvent } from "../events"

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
