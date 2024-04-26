import { EventHandler } from "../../../eventHandlers/src/EventHandler"
import { CourseCreatedEvent } from "../events"

export const CourseExists = (
    courseId: string
): EventHandler<{
    state: boolean
    tagFilter: { courseId: string }
    eventHandlers: CourseCreatedEvent
}> => ({
    tagFilter: { courseId },
    init: false,
    when: {
        courseCreated: async () => true
    }
})
