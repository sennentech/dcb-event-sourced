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
            await repository.registerCourse(tags.courseId, data.capacity)
        },
        courseCapacityWasChanged: async ({ event: { tags, data } }) => {
            const repository = new PostgresCourseSubscriptionsRepository(lockManager.postgresClient)
            await repository.updateCourseCapacity(tags.courseId, data.newCapacity)
        },
        studentWasRegistered: async ({ event: { tags, data } }) => {
            const repository = new PostgresCourseSubscriptionsRepository(lockManager.postgresClient)
            await repository.registerStudent(tags.studentId, data.name)
        },
        studentWasSubscribed: async ({ event: { tags } }) => {
            const repository = new PostgresCourseSubscriptionsRepository(lockManager.postgresClient)
            await repository.subscribeStudentToCourse(tags.studentId, tags.courseId)
        },
        studentWasUnsubscribed: async ({ event: { tags } }) => {
            const repository = new PostgresCourseSubscriptionsRepository(lockManager.postgresClient)
            await repository.unsubscribeStudentFromCourse(tags.studentId, tags.courseId)
        }
    }
})
