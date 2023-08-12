import { Projection } from "../../../src/projection/Projection"
import { StudentSubscribedEvent, StudentUnsubscribedEvent } from "../events"

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
