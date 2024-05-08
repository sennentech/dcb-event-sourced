import { Client, Pool, PoolClient } from "pg"
import { EventHandler } from "../../eventHandling/EventHandler"
import { CourseSubscriptionRepository } from "../repository/Repositories"
import {
    CourseCapacityWasChangedEvent,
    CourseWasRegisteredEvent,
    StudentWasRegistered,
    StudentWasSubscribedEvent,
    StudentWasUnsubscribedEvent
} from "./Events"
import { PostgresCourseSubscriptionsRepository } from "../repository/PostgresCourseSubscriptionRespository"
import { SequenceNumber } from "../../eventStore/SequenceNumber"
import { PostgresLockManager } from "../../eventHandling/LockManager"

export const CourseSubscriptionsProjection = (
    lockManager: PostgresLockManager
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
            const repository = new PostgresCourseSubscriptionsRepository(lockManager.postgresClient)
            await repository.registerCourse({ courseId: tags.courseId, capacity: data.capacity })
        },
        courseCapacityWasChanged: async ({ event: { tags, data } }) => {
            const repository = new PostgresCourseSubscriptionsRepository(lockManager.postgresClient)
            await repository.updateCourseCapacity({ courseId: tags.courseId, newCapacity: data.newCapacity })
        },
        studentWasRegistered: async ({ event: { tags, data } }) => {
            const repository = new PostgresCourseSubscriptionsRepository(lockManager.postgresClient)
            await repository.registerStudent({ studentId: tags.studentId, name: data.name })
        },
        studentWasSubscribed: async ({ event: { tags } }) => {
            const repository = new PostgresCourseSubscriptionsRepository(lockManager.postgresClient)
            await repository.subscribeStudentToCourse({ studentId: tags.studentId, courseId: tags.courseId })
        },
        studentWasUnsubscribed: async ({ event: { tags } }) => {
            const repository = new PostgresCourseSubscriptionsRepository(lockManager.postgresClient)
            await repository.unsubscribeStudentFromCourse({ studentId: tags.studentId, courseId: tags.courseId })
        }
    }
})
