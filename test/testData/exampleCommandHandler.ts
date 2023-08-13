import { EventStore } from "../../src/eventStore/EventStore"
import { reconstitute } from "../../src/projection/reconstitute"
import { StudentSubscribedEvent } from "./events"
import { CourseCapacity } from "./projections/CourseCapacity"
import { CourseExists } from "./projections/CourseExists"
import { StudentAlreadySubscribed } from "./projections/StudentAlreadySubscribed"
import { StudentSubscriptions } from "./projections/StudentSubscriptions"

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
        } = await reconstitute(eventStore, {
            courseExists: CourseExists(courseId),
            courseCapacity: CourseCapacity(courseId),
            studentAlreadySubscribed: StudentAlreadySubscribed({ courseId: courseId, studentId: studentId }),
            studentSubscriptions: StudentSubscriptions(studentId)
        })

        if (!courseExists) throw new Error(`Course doesn't exist.`)
        if (courseCapacity.isFull) throw new Error(`Course is at capacity.`)
        if (studentAlreadySubscribed) throw new Error(`Student already subscribed to course.`)
        if (studentSubscriptions.maxedOut)
            throw new Error(`Student is already subscribed to the maximum number of courses`)

        await eventStore.append(new StudentSubscribedEvent({ courseId, studentId }), appendCondition)
    }
