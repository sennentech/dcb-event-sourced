import { Pool, PoolClient } from "pg"
import {
    Course,
    installPostgresCourseSubscriptionsRepository,
    PostgresCourseSubscriptionsRepository
} from "../postgresCourseSubscriptionRepository/PostgresCourseSubscriptionRespository"
import { Api, setupHandlers } from "./Api"
import { EventSourcedApi } from "./Api"
import { getTestPgDatabasePool } from "../../jest.testPgDbPool"
import { ensureEventStoreInstalled, ensureHandlersInstalled } from "@dcb-es/event-store-postgres"

const COURSE_1 = {
    id: "course-1",
    title: "Course 1",
    capacity: 5
}

const STUDENT_1 = {
    id: "student-1",
    name: "Student 1",
    studentNumber: 1
}

describe("EventSourcedApi", () => {
    let pool: Pool
    let repository: ReturnType<typeof PostgresCourseSubscriptionsRepository>
    let api: Api
    let client: PoolClient

    beforeAll(async () => {
        pool = await getTestPgDatabasePool()

        await ensureEventStoreInstalled(pool)
        await installPostgresCourseSubscriptionsRepository(pool)
        api = EventSourcedApi(pool)
    })

    beforeEach(async () => {
        client = await pool.connect()

        await ensureHandlersInstalled(pool, Object.keys(setupHandlers(client)))
        await client.query("BEGIN transaction isolation level serializable")
        repository = PostgresCourseSubscriptionsRepository(client)
    })

    afterEach(async () => {
        client.query("ROLLBACK;")
        client.release()
        await pool.query("TRUNCATE table events")
        await pool.query("TRUNCATE table courses")
        await pool.query("TRUNCATE table students")
        await pool.query("TRUNCATE table subscriptions")
        await pool.query("TRUNCATE table _event_handler_bookmarks")
    })

    afterAll(async () => {
        if (pool) await pool.end()
    })

    test("single course registered shows in repository", async () => {
        await api.registerCourse({ id: COURSE_1.id, title: COURSE_1.title, capacity: COURSE_1.capacity })

        const course = await repository.findCourseById(COURSE_1.id)
        expect(course).toEqual(<Course>{
            id: COURSE_1.id,
            title: COURSE_1.title,
            capacity: COURSE_1.capacity,
            subscribedStudents: []
        })
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
        await api.registerCourse({ id: COURSE_1.id, title: COURSE_1.title, capacity: COURSE_1.capacity })
        await api.registerStudent({ id: STUDENT_1.id, name: STUDENT_1.name })
        await api.subscribeStudentToCourse({ courseId: COURSE_1.id, studentId: STUDENT_1.id })

        const course = await repository.findCourseById(COURSE_1.id)
        const student = await repository.findStudentById(STUDENT_1.id)

        expect(course?.subscribedStudents).toEqual([
            { id: STUDENT_1.id, name: STUDENT_1.name, studentNumber: STUDENT_1.studentNumber }
        ])
        expect(student?.subscribedCourses).toEqual([
            { id: COURSE_1.id, title: COURSE_1.title, capacity: COURSE_1.capacity }
        ])
    })

    describe("with one course and 100 students in database", () => {
        beforeEach(async () => {
            api = EventSourcedApi(pool)
            await api.registerCourse({ id: COURSE_1.id, title: COURSE_1.title, capacity: COURSE_1.capacity })

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
            const studentSubscriptionPromises: Promise<void>[] = []

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
})
