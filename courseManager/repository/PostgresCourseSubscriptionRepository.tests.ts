import { Pool } from "pg"
import { PostgresCourseSubscriptionsRepository } from "./PostgresCourseSubscriptionRespository"
import { subscribe } from "diagnostics_channel"
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql"

const COURSE_1 = {
    id: "course-1",
    capacity: 30
}
const STUDENT_1 = {
    id: "student-1",
    name: "John Doe"
}

describe("PostgresCourseSubscriptionRepository", () => {
    let pgContainer: StartedPostgreSqlContainer
    let pool: Pool
    let repository: PostgresCourseSubscriptionsRepository

    beforeAll(async () => {
        pgContainer = await new PostgreSqlContainer().start()
        pool = new Pool({
            connectionString: pgContainer.getConnectionUri()
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
        await pool.end()
        await pgContainer.stop()
    })

    describe("registerCourse", () => {
        test("should register a course successfully", async () => {
            await repository.registerCourse({ courseId: COURSE_1.id, capacity: COURSE_1.capacity })
            const course = await repository.findCourseById(COURSE_1.id)
            expect(course).toEqual({ id: COURSE_1.id, capacity: COURSE_1.capacity, subscribedStudents: [] })
        })
    })

    describe("findCourseById", () => {
        test("should return a course by ID with correct capacity and empty subscriptions", async () => {
            await repository.registerCourse({ courseId: COURSE_1.id, capacity: COURSE_1.capacity })
            const course = await repository.findCourseById(COURSE_1.id)

            expect(course).toEqual({ id: COURSE_1.id, capacity: COURSE_1.capacity, subscribedStudents: [] })
        })
        test("should return undefined if the course does not exist", async () => {
            const course = await repository.findCourseById("non-existent-course")
            expect(course).toBeUndefined()
        })
    })

    describe("registerStudent", () => {
        test("should register student successfully", async () => {
            await repository.registerStudent({ studentId: STUDENT_1.id, name: STUDENT_1.name })
            expect(await repository.findStudentById(STUDENT_1.id)).toEqual({
                id: STUDENT_1.id,
                name: STUDENT_1.name,
                subscribedCourses: []
            })
        })
    })

    describe("with one existing course and one registered student", () => {
        beforeEach(async () => {
            await repository.registerCourse({ courseId: COURSE_1.id, capacity: COURSE_1.capacity })
            await repository.registerStudent({ studentId: STUDENT_1.id, name: STUDENT_1.name })
        })

        describe("updateCourseCapacity", () => {
            const newCapacity = 40

            test("should update a course's capacity successfully", async () => {
                await repository.updateCourseCapacity({ courseId: COURSE_1.id, newCapacity })
                const course = await repository.findCourseById(COURSE_1.id)
                expect(course.capacity).toBe(newCapacity)
            })
        })

        describe("subscribeStudentToCourse", () => {
            test("should subscribe a student to a course successfully", async () => {
                await repository.subscribeStudentToCourse({ courseId: COURSE_1.id, studentId: STUDENT_1.id })
                const course = await repository.findCourseById(COURSE_1.id)
                const student = await repository.findStudentById(STUDENT_1.id)

                expect(course.subscribedStudents).toEqual([{ id: STUDENT_1.id, name: STUDENT_1.name }])
                expect(student.subscribedCourses).toEqual([{ id: COURSE_1.id, capacity: COURSE_1.capacity }])
            })
        })

        describe("unsubscribeStudentFromCourse", () => {
            test("should unsubscribe a student from a course successfully", async () => {
                await repository.subscribeStudentToCourse({ courseId: COURSE_1.id, studentId: STUDENT_1.id })
                await repository.unsubscribeStudentFromCourse({ courseId: COURSE_1.id, studentId: STUDENT_1.id })
                const course = await repository.findCourseById(COURSE_1.id)
                const student = await repository.findStudentById(STUDENT_1.id)

                expect(course.subscribedStudents).toEqual([])
                expect(student.subscribedCourses).toEqual([])
            })
        })
    })

    describe("findStudentById", () => {
        test("should return a student by ID with correct name and no subscribed courses", async () => {
            await repository.registerStudent({ studentId: STUDENT_1.id, name: STUDENT_1.name })
            const student = await repository.findStudentById(STUDENT_1.id)

            expect(student).toEqual({
                id: STUDENT_1.id,
                name: STUDENT_1.name,
                subscribedCourses: []
            })
        })

        test("should return a student by ID with subscribed courses", async () => {
            await repository.registerStudent({ studentId: STUDENT_1.id, name: STUDENT_1.name })
            await repository.registerCourse({ courseId: COURSE_1.id, capacity: COURSE_1.capacity })
            await repository.subscribeStudentToCourse({ courseId: COURSE_1.id, studentId: STUDENT_1.id })

            const student = await repository.findStudentById(STUDENT_1.id)

            expect(student).toEqual({
                id: STUDENT_1.id,
                name: STUDENT_1.name,
                subscribedCourses: [
                    {
                        id: COURSE_1.id,
                        capacity: COURSE_1.capacity
                    }
                ]
            })
        })

        test("should return undefined if the student does not exist", async () => {
            const student = await repository.findStudentById("non-existent-student")
            expect(student).toBeUndefined()
        })
    })
})
