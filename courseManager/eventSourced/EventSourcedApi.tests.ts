import { Pool } from "pg"
import { PostgresCourseSubscriptionsRepository } from "../repository/PostgresCourseSubscriptionRespository"
import { Api } from "../Api"
import { EventSourcedApi } from "./EventSourcedApi"
import { MemoryEventStore } from "../../eventStore/memoryEventStore/MemoryEventStore"
import { CourseSubscriptionsProjection } from "./CourseSubscriptionsProjection"
import { PostgresTransactionManager } from "../../eventHandling/PostgresTransactionManager"
import { PostgresEventHandlerRegistry } from "../../eventHandling/handlerRegistry/postgresRegistry/PostgresEventHandlerRegistry"

const COURSE_1 = {
    id: "course-1",
    capacity: 5
}

const STUDENT_1 = {
    id: "student-1",
    name: "Student 1",
    studentNumber: 1
}

describe("EventSourcedApi", () => {
    let pool: Pool
    let transactionManager: PostgresTransactionManager
    let repository: PostgresCourseSubscriptionsRepository
    let api: Api

    beforeAll(async () => {
        pool = new Pool({
            connectionString: await global.__GET_TEST_PG_DATABASE_URI()
        })

        repository = new PostgresCourseSubscriptionsRepository(pool)
        await repository.install()
    })

    afterEach(async () => {
        await pool.query("TRUNCATE table courses")
        await pool.query("TRUNCATE table students")
        await pool.query("TRUNCATE table subscriptions")
    })

    afterAll(async () => {
        if (pool) await pool.end()
    })

    describe("with one course and 100 students in database", () => {
        beforeEach(async () => {
            api = EventSourcedApi(new MemoryEventStore(), repository, null)
            api.registerCourse({ id: COURSE_1.id, capacity: COURSE_1.capacity })

            for (let i = 0; i < 100; i++) {
                await api.registerStudent({ id: `student-${i}`, name: `Student ${i}` })
            }
        })

        test("should throw error when 6th student subscribes", async () => {
            for (let i = 1; i <= 5; i++) {
                await api.subscribeStudentToCourse({ courseId: COURSE_1.id, studentId: `student-${i}` })
            }

            await expect(
                api.subscribeStudentToCourse({ courseId: COURSE_1.id, studentId: "student-6" })
            ).rejects.toThrow(`Course ${COURSE_1.id} is full.`)
        })

        test("should reject subscriptions when 10 students subscribe simultaneously", async () => {
            const studentSubscriptionPromises = []

            for (let i = 0; i < 10; i++) {
                studentSubscriptionPromises.push(
                    api.subscribeStudentToCourse({ courseId: COURSE_1.id, studentId: `student-${i}` })
                )
            }

            const results = await Promise.allSettled(studentSubscriptionPromises)
            const succeeded = results.filter(result => result.status === "fulfilled").length
            expect(succeeded).toBeLessThanOrEqual(COURSE_1.capacity)
        })
    })

    describe("with a course projection", () => {
        let registry: PostgresEventHandlerRegistry

        beforeAll(async () => {
            transactionManager = new PostgresTransactionManager(pool)
            registry = new PostgresEventHandlerRegistry(transactionManager, {
                ["course-subscriptions"]: CourseSubscriptionsProjection(transactionManager)
            })
        })
        beforeEach(async () => {
            await registry.install()
            api = EventSourcedApi(new MemoryEventStore(), repository, registry)
        })
        afterEach(async () => {
            await pool.query("TRUNCATE table _event_handler_bookmarks")
        })

        test("single course registered shows in repository", async () => {
            await api.registerCourse({ id: COURSE_1.id, capacity: COURSE_1.capacity })

            const course = await repository.findCourseById(COURSE_1.id)
            expect(course).toEqual({ id: COURSE_1.id, capacity: COURSE_1.capacity, subscribedStudents: [] })
        })

        test("single student registered shows in repository", async () => {
            await api.registerStudent({ id: STUDENT_1.id, name: STUDENT_1.name })

            const student = await repository.findStudentById(STUDENT_1.id)
            expect(student).toEqual({
                id: STUDENT_1.id,
                name: STUDENT_1.name,
                studentNumber: STUDENT_1.studentNumber,
                subscribedCourses: []
            })
        })

        test("student subscribed to course shows in repository", async () => {
            await api.registerCourse({ id: COURSE_1.id, capacity: COURSE_1.capacity })
            await api.registerStudent({ id: STUDENT_1.id, name: STUDENT_1.name })
            await api.subscribeStudentToCourse({ courseId: COURSE_1.id, studentId: STUDENT_1.id })

            const course = await repository.findCourseById(COURSE_1.id)
            const student = await repository.findStudentById(STUDENT_1.id)

            expect(course.subscribedStudents).toEqual([
                { id: STUDENT_1.id, name: STUDENT_1.name, studentNumber: STUDENT_1.studentNumber }
            ])
            expect(student.subscribedCourses).toEqual([{ id: COURSE_1.id, capacity: COURSE_1.capacity }])
        })
    })
})
