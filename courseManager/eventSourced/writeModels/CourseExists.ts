import { EventHandler } from "../../../eventHandling/src/EventHandler"
import { CourseWasCreatedEvent } from "../Events"

export const CourseExists = (
    courseId: string
): EventHandler<{
    state: boolean
    tagFilter: { courseId: string }
    eventHandlers: CourseWasCreatedEvent
}> => ({
    tagFilter: { courseId },
    init: false,
    when: {
        courseWasCreated: async () => true
    }
})
