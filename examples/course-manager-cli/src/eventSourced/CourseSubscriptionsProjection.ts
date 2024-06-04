import { EventHandler } from "@dcb-es/event-handling"
import { PostgresTransactionManager } from "@dcb-es/event-handling-postgres"

import { PostgresCourseSubscriptionsRepository } from "../repository/PostgresCourseSubscriptionRespository"

import {
    CourseWasRegisteredEvent,
    CourseCapacityWasChangedEvent,
    StudentWasRegistered,
    StudentWasSubscribedEvent,
    StudentWasUnsubscribedEvent,
    CourseTitleWasChangedEvent
} from "./Events"

export const CourseSubscriptionsProjection = (
    transactionManager: PostgresTransactionManager
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
            const repository = new PostgresCourseSubscriptionsRepository(transactionManager.client)
            await repository.registerCourse({ courseId: tags.courseId, title: data.title, capacity: data.capacity })
        },
        courseTitleWasChanged: async ({ event: { tags, data } }) => {
            const repository = new PostgresCourseSubscriptionsRepository(transactionManager.client)
            await repository.updateCourseTitle({ courseId: tags.courseId, newTitle: data.newTitle })
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
