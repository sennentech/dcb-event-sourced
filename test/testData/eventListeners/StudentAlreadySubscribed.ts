import { EsEventListener } from "../../../src/eventListener/EsEventListener"
import { StudentSubscribedEvent, StudentUnsubscribedEvent } from "../events"

export const StudentAlreadySubscribed = ({
    courseId,
    studentId
}: {
    courseId: string
    studentId: string
}): EsEventListener<{
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
