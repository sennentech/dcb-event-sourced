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
import { PostgresLockManager } from "../../eventHandling/lockManager/PostgresLockManager"
import { EsEventEnvelope } from "../../eventStore/EventStore"
import { PoolClientManager } from "../../eventHandling/lockManager/PostgresEventHandlerRegistry"

export const CourseSubscriptionsProjection = (
    clientManager: PoolClientManager
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
            const repository = new PostgresCourseSubscriptionsRepository(clientManager.client)
            await repository.registerCourse({ courseId: tags.courseId, capacity: data.capacity })
        },
        courseCapacityWasChanged: async ({ event: { tags, data } }) => {
            const repository = new PostgresCourseSubscriptionsRepository(clientManager.client)
            await repository.updateCourseCapacity({ courseId: tags.courseId, newCapacity: data.newCapacity })
        },
        studentWasRegistered: async ({ event: { tags, data } }) => {
            const repository = new PostgresCourseSubscriptionsRepository(clientManager.client)
            await repository.registerStudent({
                studentId: tags.studentId,
                name: data.name,
                studentNumber: data.studentNumber
            })
        },
        studentWasSubscribed: async ({ event: { tags } }) => {
            const repository = new PostgresCourseSubscriptionsRepository(clientManager.client)
            await repository.subscribeStudentToCourse({ studentId: tags.studentId, courseId: tags.courseId })
        },
        studentWasUnsubscribed: async ({ event: { tags } }) => {
            const repository = new PostgresCourseSubscriptionsRepository(clientManager.client)
            await repository.unsubscribeStudentFromCourse({ studentId: tags.studentId, courseId: tags.courseId })
        }
    }
})
