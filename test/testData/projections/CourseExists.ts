import { Projection } from "../../../src/projection/Projection"
import { CourseCreatedEvent } from "../events"

export const CourseExists = (
    courseId: string
): Projection<{
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
