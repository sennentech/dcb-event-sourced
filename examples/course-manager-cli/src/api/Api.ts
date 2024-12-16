import { EventHandlerRegistry, EventPublisher, buildDecisionModel } from "@dcb-es/event-handling"
import { EventStore } from "@dcb-es/event-store"
import { Course, PostgresCourseSubscriptionsRepository, Student, STUDENT_SUBSCRIPTION_LIMIT } from "../postgresCourseSubscriptionRepository/PostgresCourseSubscriptionRespository"
import {
    CourseWasRegisteredEvent,
    StudentWasRegistered,
    StudentWasSubscribedEvent,
    StudentWasUnsubscribedEvent,
    CourseCapacityWasChangedEvent,
    CourseTitleWasChangedEvent
} from "./Events"

import {
    CourseCapacity,
    CourseExists,
    CourseTitle,
    NextStudentNumber,
    StudentAlreadyRegistered,
    StudentAlreadySubscribed,
    StudentSubscriptions
} from "./DecisionModels"

export interface Api {
    findCourseById(courseId: string): Promise<Course | undefined>
    findStudentById(studentId: string): Promise<Student | undefined>
    registerCourse(req: { id: string; title: string; capacity: number }): Promise<void>
    registerStudent(req: { id: string; name: string }): Promise<void>
    updateCourseCapacity(req: { courseId: string; newCapacity: number }): Promise<void>
    updateCourseTitle(req: { courseId: string; newTitle: string }): Promise<void>
    subscribeStudentToCourse(req: { courseId: string; studentId: string }): Promise<void>
    unsubscribeStudentFromCourse(req: { courseId: string; studentId: string }): Promise<void>
}

export const EventSourcedApi = (
    eventStore: EventStore,
    repository: PostgresCourseSubscriptionsRepository,
    eventHandlerRegistry: EventHandlerRegistry
): Api => {
    const eventPublisher = new EventPublisher(eventStore, eventHandlerRegistry)
    return {
        findCourseById: async (courseId: string) => repository.findCourseById(courseId),
        findStudentById: async (studentId: string) => repository.findStudentById(studentId),
        registerCourse: async ({ id, title, capacity }) => {
            const { state, appendCondition } = await buildDecisionModel(eventStore, {
                courseExists: CourseExists(id)
            })

            if (state.courseExists) throw new Error(`Course with id ${id} already exists`)
            await eventPublisher.publish(
                new CourseWasRegisteredEvent({ courseId: id, title, capacity }),
                appendCondition
            )
        },
        registerStudent: async ({ id, name }) => {
            const { state, appendCondition } = await buildDecisionModel(eventStore, {
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
            const { state, appendCondition } = await buildDecisionModel(eventStore, {
                courseExists: CourseExists(courseId),
                CourseCapacity: CourseCapacity(courseId)
            })

            if (!state.courseExists) throw new Error(`Course ${courseId} doesn't exist.`)
            if (state.CourseCapacity.capacity === newCapacity)
                throw new Error("New capacity is the same as the current capacity.")

            await eventPublisher.publish(new CourseCapacityWasChangedEvent({ courseId, newCapacity }), appendCondition)
        },
        updateCourseTitle: async ({ courseId, newTitle }) => {
            const { state, appendCondition } = await buildDecisionModel(eventStore, {
                courseExists: CourseExists(courseId),
                courseTitle: CourseTitle(courseId)
            })

            if (!state.courseExists) throw new Error(`Course ${courseId} doesn't exist.`)
            if (state.courseTitle === newTitle) throw new Error("New title is the same as the current title.")
            await eventPublisher.publish(new CourseTitleWasChangedEvent({ courseId, newTitle }), appendCondition)
        },
        subscribeStudentToCourse: async ({ courseId, studentId }) => {
            const { state, appendCondition } = await buildDecisionModel(eventStore, {
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
            const { state, appendCondition } = await buildDecisionModel(eventStore, {
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
