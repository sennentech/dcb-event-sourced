import { reconstitute } from "../../eventHandling/reconstitute"
import { EventStore } from "../../eventStore/EventStore"
import { Api } from "../Api"
import { STUDENT_SUBSCRIPTION_LIMIT } from "../ReadModels"
import { CourseSubscriptionRepository } from "../repository/Repositories"
import { CourseWasRegisteredEvent, StudentWasRegistered, StudentWasSubscribedEvent } from "./Events"
import { EventPublisher } from "../../eventHandling/EventPublisher"
import {
    CourseCapacity,
    CourseExists,
    StudentAlreadyRegistered,
    StudentAlreadySubscribed,
    StudentSubscriptions
} from "./WriteModels"
import { ProjectionRegistry } from "../../eventHandling/EventHandler"

export const EventSourcedApi = (
    eventStore: EventStore,
    repository: CourseSubscriptionRepository,
    projectionRegistry: ProjectionRegistry
): Api => {
    const eventPublisher = new EventPublisher(eventStore, projectionRegistry)
    return {
        findCourseById: async (courseId: string) => repository.findCourseById(courseId),
        findStudentById: async (studentId: string) => repository.findStudentById(studentId),
        registerCourse: async (id: string, capacity: number) => {
            const {
                states: { courseExists },
                appendCondition
            } = await reconstitute(eventStore, {
                courseExists: CourseExists(id)
            })

            if (courseExists) throw new Error(`Course with id ${id} already exists`)
            await eventPublisher.publish(new CourseWasRegisteredEvent({ courseId: id, capacity }), appendCondition)
        },
        registerStudent: async (id: string, name: string) => {
            const {
                states: { studentAlreadyRegistered },
                appendCondition
            } = await reconstitute(eventStore, {
                studentAlreadyRegistered: StudentAlreadyRegistered(id)
            })

            if (studentAlreadyRegistered) throw new Error(`Student with id ${id} already registered.`)
            await eventPublisher.publish(new StudentWasRegistered({ studentId: id, name: name }), appendCondition)
        },
        subscribeStudentToCourse: async (courseId: string, studentId: string) => {
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

            if (!courseExists) throw new Error(`Course ${courseId} doesn't exist.`)

            if (courseCapacity.subscriberCount >= courseCapacity.capacity)
                throw new Error(`Course ${courseId} is full.`)

            if (studentAlreadySubscribed)
                throw new Error(`Student ${studentId} already subscribed to course ${courseId}.`)

            if (studentSubscriptions.subscriptionCount >= STUDENT_SUBSCRIPTION_LIMIT)
                throw new Error(`Student ${studentId} is already subscribed to the maximum number of courses`)

            await eventPublisher.publish(new StudentWasSubscribedEvent({ courseId, studentId }), appendCondition)
        },
        unsubscribeStudentFromCourse: async (courseId: string, studentId: string) => {
            const {
                states: { studentAlreadySubscribed, courseExists },
                appendCondition
            } = await reconstitute(eventStore, {
                studentAlreadySubscribed: StudentAlreadySubscribed({
                    courseId: courseId,
                    studentId: studentId
                }),
                courseExists: CourseExists(courseId)
            })

            if (!courseExists) throw new Error(`Course ${courseId} doesn't exist.`)
            if (!studentAlreadySubscribed)
                throw new Error(`Student ${studentId} is not subscribed to course ${courseId}.`)

            await eventPublisher.publish(new StudentWasSubscribedEvent({ courseId, studentId }), appendCondition)
        }
    }
}
