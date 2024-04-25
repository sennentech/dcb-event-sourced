import { EsEventListener } from "../../../eventHandlers/src/EventHandler"
import { StudentSubscribedEvent, StudentUnsubscribedEvent } from "../events"

const STUDENT_SUBSCRIPTION_LIMIT = 10
export const StudentSubscriptions = (
    studentId: string
): EsEventListener<{
    state: { maxedOut: boolean; subscriptionCount: number }
    eventHandlers: StudentSubscribedEvent | StudentUnsubscribedEvent
}> => ({
    tagFilter: { studentId },
    init: { maxedOut: false, subscriptionCount: 0 },
    when: {
        studentSubscribed: (_eventEnvelope, { subscriptionCount }) => ({
            maxedOut: STUDENT_SUBSCRIPTION_LIMIT <= subscriptionCount + 1,
            subscriptionCount: subscriptionCount + 1
        }),
        studentUnsubscribed: (_eventEnvelope, { subscriptionCount }) => ({
            maxedOut: STUDENT_SUBSCRIPTION_LIMIT <= subscriptionCount - 1,
            subscriptionCount: subscriptionCount - 1
        })
    }
})
