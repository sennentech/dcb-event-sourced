import { EventHandler } from "../../../eventHandling/src/EventHandler"
import { StudentWasSubscribedEvent, StudentWasUnsubscribedEvent } from "../Events"

export const StudentAlreadySubscribed = ({
    courseId,
    studentId
}: {
    courseId: string
    studentId: string
}): EventHandler<{
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
