import { buildDecisionModel } from "@dcb-es/event-store"
import {
    Course,
    PostgresCourseSubscriptionsRepository,
    Student,
    STUDENT_SUBSCRIPTION_LIMIT
} from "../postgresCourseSubscriptionRepository/PostgresCourseSubscriptionRespository"
import { Pool, PoolClient } from "pg"
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
import { HandlerCatchup, PostgresEventStore } from "@dcb-es/event-store-postgres"
import { PostgresCourseSubscriptionsProjection } from "./PostgresCourseSubscriptionsProjection"

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

export const setupHandlers = (client: PoolClient) => {
    return {
        CourseProjection: PostgresCourseSubscriptionsProjection(client)
    }
}

export const EventSourcedApi = (pool: Pool): Api => {
    /* read model repository */
    const readModelRepository = PostgresCourseSubscriptionsRepository(pool)
    return {
        findCourseById: async (courseId: string) => readModelRepository.findCourseById(courseId),
        findStudentById: async (studentId: string) => readModelRepository.findStudentById(studentId),
        registerCourse: async ({ id, title, capacity }) => {
            const client = await pool.connect()
            await client.query("BEGIN transaction isolation level serializable")
            try {
                const eventStore = new PostgresEventStore(client)
                const { state, appendCondition } = await buildDecisionModel(eventStore, {
                    courseExists: CourseExists(id)
                })

                if (state.courseExists) throw new Error(`Course with id ${id} already exists`)
                await eventStore.append(
                    new CourseWasRegisteredEvent({ courseId: id, title, capacity }),
                    appendCondition
                )

                const handlerCatchup = new HandlerCatchup(client, eventStore)
                await handlerCatchup.catchupHandlers(setupHandlers(client))

                await client.query("COMMIT")
            } catch (err) {
                await client.query("ROLLBACK")
                throw err
            } finally {
                client.release()
            }
        },
        registerStudent: async ({ id, name }) => {
            const client = await pool.connect()
            await client.query("BEGIN transaction isolation level serializable")
            try {
                const eventStore = new PostgresEventStore(client)
                const { state, appendCondition } = await buildDecisionModel(eventStore, {
                    studentAlreadyRegistered: StudentAlreadyRegistered(id),
                    nextStudentNumber: NextStudentNumber()
                })

                if (state.studentAlreadyRegistered) throw new Error(`Student with id ${id} already registered.`)
                await eventStore.append(
                    new StudentWasRegistered({ studentId: id, name: name, studentNumber: state.nextStudentNumber }),
                    appendCondition
                )

                const handlerCatchup = new HandlerCatchup(client, eventStore)
                await handlerCatchup.catchupHandlers(setupHandlers(client))
                await client.query("COMMIT")
            } catch (err) {
                await client.query("ROLLBACK")
                throw err
            } finally {
                client.release()
            }
        },
        updateCourseCapacity: async ({ courseId, newCapacity }) => {
            const client = await pool.connect()
            await client.query("BEGIN transaction isolation level serializable")
            try {
                const eventStore = new PostgresEventStore(client)

                const { state, appendCondition } = await buildDecisionModel(eventStore, {
                    courseExists: CourseExists(courseId),
                    CourseCapacity: CourseCapacity(courseId)
                })

                if (!state.courseExists) throw new Error(`Course ${courseId} doesn't exist.`)
                if (state.CourseCapacity.capacity === newCapacity)
                    throw new Error("New capacity is the same as the current capacity.")

                await eventStore.append(new CourseCapacityWasChangedEvent({ courseId, newCapacity }), appendCondition)

                const handlerCatchup = new HandlerCatchup(client, eventStore)
                await handlerCatchup.catchupHandlers(setupHandlers(client))
                await client.query("COMMIT")
            } catch (err) {
                await client.query("ROLLBACK")
                throw err
            } finally {
                client.release()
            }
        },
        updateCourseTitle: async ({ courseId, newTitle }) => {
            const client = await pool.connect()
            await client.query("BEGIN transaction isolation level serializable")
            try {
                const eventStore = new PostgresEventStore(client)

                const { state, appendCondition } = await buildDecisionModel(eventStore, {
                    courseExists: CourseExists(courseId),
                    courseTitle: CourseTitle(courseId)
                })

                if (!state.courseExists) throw new Error(`Course ${courseId} doesn't exist.`)
                if (state.courseTitle === newTitle) throw new Error("New title is the same as the current title.")
                await eventStore.append(new CourseTitleWasChangedEvent({ courseId, newTitle }), appendCondition)

                const handlerCatchup = new HandlerCatchup(client, eventStore)
                await handlerCatchup.catchupHandlers(setupHandlers(client))
                await client.query("COMMIT")
            } catch (err) {
                await client.query("ROLLBACK")
                throw err
            } finally {
                client.release()
            }
        },
        subscribeStudentToCourse: async ({ courseId, studentId }) => {
            const client = await pool.connect()
            await client.query("BEGIN transaction isolation level serializable")
            try {
                const eventStore = new PostgresEventStore(client)

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

                await eventStore.append(new StudentWasSubscribedEvent({ courseId, studentId }), appendCondition)

                const handlerCatchup = new HandlerCatchup(client, eventStore)
                await handlerCatchup.catchupHandlers(setupHandlers(client))
                await client.query("COMMIT")
            } catch (err) {
                await client.query("ROLLBACK")
                throw err
            } finally {
                client.release()
            }
        },
        unsubscribeStudentFromCourse: async ({ courseId, studentId }) => {
            const client = await pool.connect()
            await client.query("BEGIN transaction isolation level serializable")
            try {
                const eventStore = new PostgresEventStore(client)

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

                await eventStore.append(new StudentWasUnsubscribedEvent({ courseId, studentId }), appendCondition)

                const handlerCatchup = new HandlerCatchup(client, eventStore)
                await handlerCatchup.catchupHandlers(setupHandlers(client))
                await client.query("COMMIT")
            } catch (err) {
                await client.query("ROLLBACK")
                throw err
            } finally {
                client.release()
            }
        }
    }
}
