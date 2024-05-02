import { EventHandler } from "../../eventHandling/src/EventHandler"
import { StudentSubscribedEvent, StudentUnsubscribedEvent } from "../events"

export const StudentAlreadySubscribed = ({
    courseId,
    studentId
}: {
    courseId: string
    studentId: string
}): EventHandler<{
    state: boolean
    tagFilter: { courseId: string; studentId: string }
    eventHandlers: StudentSubscribedEvent | StudentUnsubscribedEvent
}> => ({
    tagFilter: { courseId, studentId },
    init: false,
    when: {
        studentSubscribed: () => true,
        studentUnsubscribed: () => false
    }
})
