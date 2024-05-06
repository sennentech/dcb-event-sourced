import { EventStore } from "../eventStore/src/EventStore"
import { reconstitute } from "../eventHandling/src/reconstitute"
import { StudentWasSubscribedEvent } from "./events"
import { CourseCapacity } from "./eventHandlers/CourseCapacity"
import { CourseExists } from "./eventHandlers/CourseExists"
import { StudentAlreadySubscribed } from "./eventHandlers/StudentAlreadySubscribed"
import { StudentSubscriptions } from "./eventHandlers/StudentSubscriptions"

export interface SubscribeStudentToCourseCmd {
    studentId: string
    courseId: string
}

export const subscribeStudentCommandHandler =
    (eventStore: EventStore) =>
    async ({ courseId, studentId }: SubscribeStudentToCourseCmd) => {
        const {
            states: { courseExists, courseCapacity, studentAlreadySubscribed, studentSubscriptions },
            appendCondition
        } = await reconstitute(eventStore, {
            courseExists: CourseExists(courseId),
            courseCapacity: CourseCapacity(courseId),
            studentAlreadySubscribed: StudentAlreadySubscribed({
                courseId: courseId,
                studentId: studentId
            }),
            studentSubscriptions: StudentSubscriptions(studentId)
        })

        if (!courseExists) throw new Error(`Course doesn't exist.`)
        if (courseCapacity.isFull) throw new Error(`Course is at capacity.`)
        if (studentAlreadySubscribed) throw new Error(`Student already subscribed to course.`)
        if (studentSubscriptions.maxedOut)
            throw new Error(`Student is already subscribed to the maximum number of courses`)

        await eventStore.append(new StudentWasSubscribedEvent({ courseId, studentId }), appendCondition)
    }
