import { EventStore } from "../../eventStore/EventStore"
import { Api } from "../Api"
import { STUDENT_SUBSCRIPTION_LIMIT } from "../ReadModels"
import { CourseSubscriptionRepository } from "../repository/CourseSubscriptionRepository"
import {
    CourseWasRegisteredEvent,
    StudentWasRegistered,
    StudentWasSubscribedEvent,
    StudentWasUnsubscribedEvent,
    CourseCapacityWasChangedEvent,
    CourseTitleWasChangedEvent
} from "./Events"

import { EventPublisher } from "../../eventHandling/eventPublishing/EventPublisher"
import {
    CourseCapacity,
    CourseExists,
    CourseTitle,
    NextStudentNumber,
    StudentAlreadyRegistered,
    StudentAlreadySubscribed,
    StudentSubscriptions
} from "./WriteModels"
import { EventHandlerRegistry } from "../../eventHandling/EventHandlerRegistry"
import { reconstitute } from "../../eventHandling/reconstitute/reconstitute"

export const EventSourcedApi = (
    eventStore: EventStore,
    repository: CourseSubscriptionRepository,
    eventHandlerRegistry: EventHandlerRegistry
): Api => {
    const eventPublisher = new EventPublisher(eventStore, eventHandlerRegistry)
    return {
        findCourseById: async (courseId: string) => repository.findCourseById(courseId),
        findStudentById: async (studentId: string) => repository.findStudentById(studentId),
        registerCourse: async ({ id, title, capacity }) => {
            const { state, appendCondition } = await reconstitute(eventStore, {
                courseExists: CourseExists(id)
            })

            if (state.courseExists) throw new Error(`Course with id ${id} already exists`)
            await eventPublisher.publish(
                new CourseWasRegisteredEvent({ courseId: id, title, capacity }),
                appendCondition
            )
        },
        registerStudent: async ({ id, name }) => {
            const { state, appendCondition } = await reconstitute(eventStore, {
                studentAlreadyRegistered: StudentAlreadyRegistered(id),
                nextStudentNumber: NextStudentNumber()
            })

            if (state.studentAlreadyRegistered) throw new Error(`Student with id ${id} already registered.`)
            await eventPublisher.publish(
                new StudentWasRegistered({ studentId: id, name: name, studentNumber: state.nextStudentNumber }),
                appendCondition
            )
        },
        updateCourseCapacity: async ({ courseId, newCapacity }) => {
            const { state, appendCondition } = await reconstitute(eventStore, {
                courseExists: CourseExists(courseId),
                CourseCapacity: CourseCapacity(courseId)
            })

            if (!state.courseExists) throw new Error(`Course ${courseId} doesn't exist.`)
            if (state.CourseCapacity.capacity === newCapacity)
                throw new Error("New capacity is the same as the current capacity.")

            await eventPublisher.publish(new CourseCapacityWasChangedEvent({ courseId, newCapacity }), appendCondition)
        },
        updateCourseTitle: async ({ courseId, newTitle }) => {
            const { state, appendCondition } = await reconstitute(eventStore, {
                courseExists: CourseExists(courseId),
                courseTitle: CourseTitle(courseId)
            })

            if (!state.courseExists) throw new Error(`Course ${courseId} doesn't exist.`)
            if (state.courseTitle === newTitle) throw new Error("New title is the same as the current title.")
            await eventPublisher.publish(new CourseTitleWasChangedEvent({ courseId, newTitle }), appendCondition)
        },
        subscribeStudentToCourse: async ({ courseId, studentId }) => {
            const { state, appendCondition } = await reconstitute(eventStore, {
                courseExists: CourseExists(courseId),
                courseCapacity: CourseCapacity(courseId),
                studentAlreadySubscribed: StudentAlreadySubscribed({
                    courseId: courseId,
                    studentId: studentId
                }),
                studentSubscriptions: StudentSubscriptions(studentId)
            })

            if (!state.courseExists) throw new Error(`Course ${courseId} doesn't exist.`)

            if (state.courseCapacity.subscriberCount >= state.courseCapacity.capacity)
                throw new Error(`Course ${courseId} is full.`)

            if (state.studentAlreadySubscribed)
                throw new Error(`Student ${studentId} already subscribed to course ${courseId}.`)

            if (state.studentSubscriptions.subscriptionCount >= STUDENT_SUBSCRIPTION_LIMIT)
                throw new Error(`Student ${studentId} is already subscribed to the maximum number of courses`)

            await eventPublisher.publish(new StudentWasSubscribedEvent({ courseId, studentId }), appendCondition)
        },
        unsubscribeStudentFromCourse: async ({ courseId, studentId }) => {
            const { state, appendCondition } = await reconstitute(eventStore, {
                studentAlreadySubscribed: StudentAlreadySubscribed({
                    courseId: courseId,
                    studentId: studentId
                }),
                courseExists: CourseExists(courseId)
            })

            if (!state.courseExists) throw new Error(`Course ${courseId} doesn't exist.`)
            if (!state.studentAlreadySubscribed)
                throw new Error(`Student ${studentId} is not subscribed to course ${courseId}.`)

            await eventPublisher.publish(new StudentWasUnsubscribedEvent({ courseId, studentId }), appendCondition)
        }
    }
}
