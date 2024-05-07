import { EventHandler } from "../../eventHandling/src/EventHandler"
import { CourseSubscriptionRepository } from "../repository/Repositories"
import {
    CourseCapacityWasChangedEvent,
    CourseWasCreatedEvent,
    StudentWasRegistered,
    StudentWasSubscribedEvent,
    StudentWasUnsubscribedEvent
} from "./Events"

export const CourseSubscriptionRepositoryProjection = (
    repository: CourseSubscriptionRepository
): EventHandler<{
    eventHandlers:
        | CourseWasCreatedEvent
        | CourseCapacityWasChangedEvent
        | StudentWasRegistered
        | StudentWasSubscribedEvent
        | StudentWasUnsubscribedEvent
}> => ({
    when: {
        courseWasCreated: async ({ event: { tags, data } }) =>
            await repository.registerCourse(tags.courseId, data.capacity),

        courseCapacityWasChanged: async ({ event: { tags, data } }) =>
            await repository.updateCourseCapacity(tags.courseId, data.newCapacity),

        studentWasRegistered: async ({ event: { tags, data } }) =>
            await repository.registerStudent(tags.studentId, data.name),

        studentWasSubscribed: async ({ event: { tags } }) =>
            await repository.subscribeStudentToCourse(tags.studentId, tags.courseId),

        studentWasUnsubscribed: async ({ event: { tags } }) =>
            await repository.unsubscribeStudentFromCourse(tags.studentId, tags.courseId)
    }
})
