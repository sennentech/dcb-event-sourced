import { buildDecisionModel } from "@dcb-es/event-store"
import {
    PostgresCourseSubscriptionsRepository,
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

export const setupHandlers = (client: PoolClient | Pool) => ({
    CourseProjection: PostgresCourseSubscriptionsProjection(client)
})
export class Api {
    private pool: Pool
    private readModelRepository: ReturnType<typeof PostgresCourseSubscriptionsRepository>

    constructor(pool: Pool) {
        this.pool = pool
        this.readModelRepository = PostgresCourseSubscriptionsRepository(pool)
    }

    async findCourseById(courseId: string) {
        return this.readModelRepository.findCourseById(courseId)
    }

    async findStudentById(studentId: string) {
        return this.readModelRepository.findStudentById(studentId)
    }

    async registerCourse(cmd: { id: string; title: string; capacity: number }) {
        const client = await this.pool.connect()
        await client.query("BEGIN transaction isolation level serializable")
        try {
            const eventStore = new PostgresEventStore(client)
            const { state, appendCondition } = await buildDecisionModel(eventStore, {
                courseExists: CourseExists(cmd.id)
            })

            if (state.courseExists) throw new Error(`Course with id ${cmd.id} already exists`)
            await eventStore.append(
                new CourseWasRegisteredEvent({ courseId: cmd.id, title: cmd.title, capacity: cmd.capacity }),
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
    }

    async registerStudent(cmd: { id: string; name: string }) {
        const { id, name } = cmd
        const client = await this.pool.connect()
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
    }

    async updateCourseCapacity(cmd: { courseId: string; newCapacity: number }) {
        const { courseId, newCapacity } = cmd
        const client = await this.pool.connect()
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
    }

    async updateCourseTitle(cmd: { courseId: string; newTitle: string }) {
        const { courseId, newTitle } = cmd
        const client = await this.pool.connect()
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
    }

    async subscribeStudentToCourse(cmd: { courseId: string; studentId: string }) {
        const { courseId, studentId } = cmd
        const client = await this.pool.connect()
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
    }

    async unsubscribeStudentFromCourse(cmd: { courseId: string; studentId: string }) {
        const { courseId, studentId } = cmd
        const client = await this.pool.connect()
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
