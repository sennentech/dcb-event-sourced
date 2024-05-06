import { newDb } from "pg-mem"
import { Pool } from "pg"
import { CourseSubscriptionRepository } from "../repository/Repositories"
import { PostgresCourseSubscriptionRepository } from "../repository/PostgresCourseSubscriptionRespository"
import { Api } from "./api"
const COURSE_1 = {
    id: "course-1",
    capacity: 5
}

describe("Api stress tests", () => {
    let pool: Pool
    let repository: PostgresCourseSubscriptionRepository
    let api
    beforeEach(async () => {
        pool = new (newDb().adapters.createPg().Pool)()
        repository = new PostgresCourseSubscriptionRepository(pool)
        await repository.install()

        api = await Api(repository)
        api.registerCourse(COURSE_1.id, COURSE_1.capacity)

        const studentRegistraionPromises = []
        for (let i = 0; i < 100; i++) {
            studentRegistraionPromises.push(api.registerStudent(`student-${i}`, `Student ${i}`))
        }
        await Promise.all(studentRegistraionPromises)
    })

    test("should not exceed course capacity when 100 students subscribe simultaneously", async () => {
        const courseId = COURSE_1.id
        const studentSubscriptionPromises = []

        for (let i = 0; i < 100; i++) {
            studentSubscriptionPromises.push(api.subscribeStudentToCourse(courseId, `student-${i}`))
        }

        const results = await Promise.allSettled(studentSubscriptionPromises)
        const succeeded = results.filter(result => result.status === "fulfilled").length
        expect(succeeded).toBe(COURSE_1.capacity)

        const course = await api.findCourseById(courseId)
        expect(course.subscribedStudents.length).toBeLessThanOrEqual(COURSE_1.capacity)
    })
})
