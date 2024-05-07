import { newDb } from "pg-mem"
import { Pool } from "pg"
import { PostgresCourseSubscriptionsRepository } from "../repository/PostgresCourseSubscriptionRespository"
import { ConventionalApi } from "./ConventionalApi"
import { Api } from "../Api"

const COURSE_1 = {
    id: "course-1",
    capacity: 5
}

describe("ConventionalApi", () => {
    let pool: Pool
    let repository: PostgresCourseSubscriptionsRepository
    let api: Api

    beforeEach(async () => {
        pool = new (newDb().adapters.createPg().Pool)()
        repository = new PostgresCourseSubscriptionsRepository(pool)
        await repository.install()

        api = await ConventionalApi(repository)
        api.registerCourse(COURSE_1.id, COURSE_1.capacity)

        const studentRegistraionPromises = []
        for (let i = 0; i < 100; i++) {
            studentRegistraionPromises.push(api.registerStudent(`student-${i}`, `Student ${i}`))
        }
        await Promise.all(studentRegistraionPromises)
    })

    test("should throw error when 6th student subscribes", async () => {
        for (let i = 1; i <= 5; i++) {
            await api.subscribeStudentToCourse(COURSE_1.id, `student-${i}`)
        }

        await expect(api.subscribeStudentToCourse(COURSE_1.id, "student-6")).rejects.toThrow(
            `Course with id ${COURSE_1.id} is full.`
        )
    })

    test("known issue: capacity exceeded race condition when 10 students subscribe simultaneously", async () => {
        const courseId = COURSE_1.id
        const studentSubscriptionPromises = []

        for (let i = 0; i < 10; i++) {
            studentSubscriptionPromises.push(api.subscribeStudentToCourse(courseId, `student-${i}`))
        }

        const results = await Promise.allSettled(studentSubscriptionPromises)
        const succeeded = results.filter(result => result.status === "fulfilled").length
        expect(succeeded).toBeGreaterThan(COURSE_1.capacity)

        const course = await api.findCourseById(courseId)
        expect(course.subscribedStudents.length).toBeGreaterThanOrEqual(COURSE_1.capacity)
    })
})
