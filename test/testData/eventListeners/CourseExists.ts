import { EsEventListener } from "../../../src/eventListener/EsEventListener"
import { CourseCreatedEvent } from "../events"

export const CourseExists = (
    courseId: string
): EsEventListener<{
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
