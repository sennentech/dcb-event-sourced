import { Projection } from "../../../src/projection/Projection"
import { CourseCreatedEvent } from "../events"

export const CourseExists = (
    courseId: string
): Projection<{
    state: boolean
    tags: { courseId: string }
    eventHandlers: CourseCreatedEvent
}> => ({
    tags: { courseId },
    init: false,
    when: {
        courseCreated: async () => true
    }
})
