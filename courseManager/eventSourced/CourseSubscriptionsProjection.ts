import { EventHandler } from "../../eventHandling/EventHandler"
import { PostgresCourseSubscriptionsRepository } from "../repository/PostgresCourseSubscriptionRespository"
import { PostgresTransactionManager } from "../../eventHandling/postgresEventHandlerRegistry/PostgresTransactionManager"
import {
    CourseWasRegisteredEvent,
    CourseCapacityWasChangedEvent,
    StudentWasRegistered,
    StudentWasSubscribedEvent,
    StudentWasUnsubscribedEvent
} from "./Events"

export const CourseSubscriptionsProjection = (
    transactionManager: PostgresTransactionManager
): EventHandler<{
    eventHandlers:
        | CourseWasRegisteredEvent
        | CourseCapacityWasChangedEvent
        | StudentWasRegistered
        | StudentWasSubscribedEvent
        | StudentWasUnsubscribedEvent
}> => ({
    when: {
        courseWasRegistered: async ({ event: { tags, data } }) => {
            const repository = new PostgresCourseSubscriptionsRepository(transactionManager.client)
            await repository.registerCourse({ courseId: tags.courseId, capacity: data.capacity })
        },
        courseCapacityWasChanged: async ({ event: { tags, data } }) => {
            const repository = new PostgresCourseSubscriptionsRepository(transactionManager.client)
            await repository.updateCourseCapacity({ courseId: tags.courseId, newCapacity: data.newCapacity })
        },
        studentWasRegistered: async ({ event: { tags, data } }) => {
            const repository = new PostgresCourseSubscriptionsRepository(transactionManager.client)
            await repository.registerStudent({
                studentId: tags.studentId,
                name: data.name,
                studentNumber: data.studentNumber
            })
        },
        studentWasSubscribed: async ({ event: { tags } }) => {
            const repository = new PostgresCourseSubscriptionsRepository(transactionManager.client)
            await repository.subscribeStudentToCourse({ studentId: tags.studentId, courseId: tags.courseId })
        },
        studentWasUnsubscribed: async ({ event: { tags } }) => {
            const repository = new PostgresCourseSubscriptionsRepository(transactionManager.client)
            await repository.unsubscribeStudentFromCourse({ studentId: tags.studentId, courseId: tags.courseId })
        }
    }
})
