import { EventHandler } from "../../../eventHandling/src/EventHandler"
import { StudentWasRegistered } from "../Events"

export const StudentAlreadyRegistered = (
    studentId: string
): EventHandler<{
    state: boolean
    tagFilter: { studentId: string }
    eventHandlers: StudentWasRegistered
}> => ({
    tagFilter: { studentId },
    init: false,
    when: {
        studentWasRegistered: async () => true
    }
})
