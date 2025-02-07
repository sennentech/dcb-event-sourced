import { EventHandler } from "@dcb-es/event-handling"
import {
    CourseWasRegisteredEvent,
    CourseCapacityWasChangedEvent,
    CourseTitleWasChangedEvent,
    StudentWasRegistered,
    StudentWasSubscribedEvent,
    StudentWasUnsubscribedEvent
} from "./Events"
import { PostgresCourseSubscriptionsRepository } from "../postgresCourseSubscriptionRepository/PostgresCourseSubscriptionRespository"
import { PoolClient } from "pg"

export const PostgresCourseSubscriptionsProjection = (
    client: PoolClient
): EventHandler<{
    eventHandlers:
        | CourseWasRegisteredEvent
        | CourseCapacityWasChangedEvent
        | CourseTitleWasChangedEvent
        | StudentWasRegistered
        | StudentWasSubscribedEvent
        | StudentWasUnsubscribedEvent
}> => ({
    when: {
        courseWasRegistered: async ({ event: { tags, data } }) => {
            const repository = PostgresCourseSubscriptionsRepository(client)
            await repository.registerCourse({ courseId: tags.courseId, title: data.title, capacity: data.capacity })
        },
        courseTitleWasChanged: async ({ event: { tags, data } }) => {
            const repository = PostgresCourseSubscriptionsRepository(client)
            await repository.updateCourseTitle({ courseId: tags.courseId, newTitle: data.newTitle })
        },
        courseCapacityWasChanged: async ({ event: { tags, data } }) => {
            const repository = PostgresCourseSubscriptionsRepository(client)
            await repository.updateCourseCapacity({ courseId: tags.courseId, newCapacity: data.newCapacity })
        },
        studentWasRegistered: async ({ event: { tags, data } }) => {
            const repository = PostgresCourseSubscriptionsRepository(client)
            await repository.registerStudent({
                studentId: tags.studentId,
                name: data.name,
                studentNumber: data.studentNumber
            })
        },
        studentWasSubscribed: async ({ event: { tags } }) => {
            const repository = PostgresCourseSubscriptionsRepository(client)
            await repository.subscribeStudentToCourse({ studentId: tags.studentId, courseId: tags.courseId })
        },
        studentWasUnsubscribed: async ({ event: { tags } }) => {
            const repository = PostgresCourseSubscriptionsRepository(client)
            await repository.unsubscribeStudentFromCourse({ studentId: tags.studentId, courseId: tags.courseId })
        }
    }
})
