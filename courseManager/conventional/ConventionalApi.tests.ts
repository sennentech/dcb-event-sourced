import { Pool } from "pg"
import { PostgresCourseSubscriptionsRepository } from "../repository/PostgresCourseSubscriptionRespository"
import { ConventionalApi } from "./ConventionalApi"
import { Api } from "../Api"
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql"

const COURSE_1 = {
    id: "course-1",
    capacity: 5
}

describe("ConventionalApi", () => {
    let pool: Pool
    let pgContainer: StartedPostgreSqlContainer
    let repository: PostgresCourseSubscriptionsRepository
    let api: Api

    beforeAll(async () => {
        pgContainer = await new PostgreSqlContainer().start()
        pool = new Pool({
            connectionString: pgContainer.getConnectionUri()
        })
        repository = new PostgresCourseSubscriptionsRepository(pool)
        await repository.install()

        api = ConventionalApi(repository)
    })

    beforeEach(async () => {
        await api.registerCourse({ id: COURSE_1.id, capacity: COURSE_1.capacity })

        const studentRegistraionPromises = []
        for (let i = 0; i < 100; i++) {
            studentRegistraionPromises.push(api.registerStudent({ id: `student-${i}`, name: `Student ${i}` }))
        }
        await Promise.all(studentRegistraionPromises)
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

    test("should throw error when 6th student subscribes", async () => {
        for (let i = 1; i <= 5; i++) {
            await api.subscribeStudentToCourse({ courseId: COURSE_1.id, studentId: `student-${i}` })
        }

        await expect(api.subscribeStudentToCourse({ courseId: COURSE_1.id, studentId: "student-6" })).rejects.toThrow(
            `Course with id ${COURSE_1.id} is full.`
        )
    })

    test("known issue: capacity exceeded race condition when 10 students subscribe simultaneously", async () => {
        const courseId = COURSE_1.id
        const studentSubscriptionPromises = []

        for (let i = 0; i < 10; i++) {
            studentSubscriptionPromises.push(api.subscribeStudentToCourse({ courseId, studentId: `student-${i}` }))
        }

        const results = await Promise.allSettled(studentSubscriptionPromises)
        const succeeded = results.filter(result => result.status === "fulfilled").length
        expect(succeeded).toBeGreaterThan(COURSE_1.capacity)

        const course = await api.findCourseById(courseId)
        expect(course.subscribedStudents.length).toBeGreaterThanOrEqual(COURSE_1.capacity)
    })
})
