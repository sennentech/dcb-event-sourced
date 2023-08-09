import { reconstitute } from "../src/Reconsitute"
import { EventStore } from "../src/EventStore"
import { CourseExists, CourseCapacity, StudentSubscriptions, StudentAlreadySubscribed } from "./projections"
import { StudentSubscribedEvent } from "./eventDefinitions"

export interface SubscribeStudentToCourseCmd {
    studentId: string
    courseId: string
}

export const subscribeStudentCmdHandler =
    (eventStore: EventStore) =>
    async ({ courseId, studentId }: SubscribeStudentToCourseCmd) => {
        const {
            states: { courseExists, courseCapacity, studentAlreadySubscribed, studentSubscriptions },
            appendCondition
        } = await reconstitute(
            eventStore,
            CourseExists(courseId),
            CourseCapacity(courseId),
            StudentAlreadySubscribed({ courseId: courseId, studentId: studentId }),
            StudentSubscriptions(studentId)
        )

        if (!courseExists) throw new Error(`Course doesn't exist.`)
        if (courseCapacity.isFull) throw new Error(`Course is at capacity.`)
        if (studentAlreadySubscribed) throw new Error(`Student already subscribed to course.`)
        if (studentSubscriptions.maxedOut)
            throw new Error(`Student is already subscribed to the maximum number of courses`)

        const subscribeEvent = new StudentSubscribedEvent({ courseId, studentId })
        await eventStore.append(subscribeEvent, appendCondition)
    }
