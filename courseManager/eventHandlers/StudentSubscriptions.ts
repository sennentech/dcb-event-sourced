import { EventHandler } from "../../eventHandling/src/EventHandler"
import { StudentWasSubscribedEvent, StudentWasUnsubscribedEvent } from "../events"

const STUDENT_SUBSCRIPTION_LIMIT = 10
export const StudentSubscriptions = (
    studentId: string
): EventHandler<{
    state: { maxedOut: boolean; subscriptionCount: number }
    eventHandlers: StudentWasSubscribedEvent | StudentWasUnsubscribedEvent
}> => ({
    tagFilter: { studentId },
    init: { maxedOut: false, subscriptionCount: 0 },
    when: {
        studentWasSubscribed: (_eventEnvelope, { subscriptionCount }) => ({
            maxedOut: STUDENT_SUBSCRIPTION_LIMIT <= subscriptionCount + 1,
            subscriptionCount: subscriptionCount + 1
        }),
        studentWasUnsubscribed: (_eventEnvelope, { subscriptionCount }) => ({
            maxedOut: STUDENT_SUBSCRIPTION_LIMIT <= subscriptionCount - 1,
            subscriptionCount: subscriptionCount - 1
        })
    }
})
