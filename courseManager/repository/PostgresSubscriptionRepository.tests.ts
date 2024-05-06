import { Pool } from "pg"
import { IBackup, newDb } from "pg-mem"
import { PostgresSubscriptionRepository, installPostgresSubscriptionRepository } from "./PostgresSubscriptionRepository"
import { PostgresCourseRepository, installPostgresCourseRepository } from "./PostgresCourseRepository"
import { PostgresStudentRepository, installPostgresStudentRepository } from "./PostgresStudentRepository"

const COURSE_1_ID = "course-1"
const COURSE_2_ID = "course-2"
const STUDENT_1_ID = "student-1"
const STUDENT_2_ID = "student-2"

describe("PostgresSubscriptionRepository", () => {
    const db = newDb()
    const pool: Pool = new (db.adapters.createPg().Pool)()

    const courseRepository = new PostgresCourseRepository(pool)
    const studentRepository = new PostgresStudentRepository(pool)
    const repository = new PostgresSubscriptionRepository(pool)
    let backup: IBackup

    beforeAll(async () => {
        await installPostgresCourseRepository(pool)
        await installPostgresStudentRepository(pool)
        await installPostgresSubscriptionRepository(pool)

        await courseRepository.insert({ id: COURSE_1_ID, capacity: 10 })
        await courseRepository.insert({ id: COURSE_2_ID, capacity: 20 })
        await studentRepository.insert({ id: STUDENT_1_ID, name: "John Doe" })
        await studentRepository.insert({ id: STUDENT_2_ID, name: "Jane Smith" })

        backup = db.backup()
    })

    beforeEach(async () => {
        backup.restore()
    })

    describe("addSubscription", () => {
        test("should add a subscription successfully", async () => {
            await repository.addSubscription({ courseId: COURSE_1_ID, studentId: STUDENT_1_ID })
            const courses = await repository.findCoursesByStudent(STUDENT_1_ID)
            const students = await repository.findStudentsByCourse(COURSE_1_ID)

            expect(courses.length).toBe(1)
            expect(students.length).toBe(1)
            expect(courses[0].id).toEqual(COURSE_1_ID)
            expect(students[0].id).toEqual(STUDENT_1_ID)
        })

        test("should handle attempts to add duplicate subscriptions", async () => {
            await repository.addSubscription({ courseId: COURSE_1_ID, studentId: STUDENT_1_ID })
            await expect(
                repository.addSubscription({ courseId: COURSE_1_ID, studentId: STUDENT_1_ID })
            ).rejects.toThrow()
        })
    })

    describe("removeSubscription", () => {
        test("should remove a subscription successfully", async () => {
            await repository.addSubscription({ courseId: COURSE_1_ID, studentId: STUDENT_1_ID })
            await repository.removeSubscription({ courseId: COURSE_1_ID, studentId: STUDENT_1_ID })

            const courses = await repository.findCoursesByStudent(STUDENT_1_ID)
            const students = await repository.findStudentsByCourse(COURSE_1_ID)

            expect(courses.length).toBe(0)
            expect(students.length).toBe(0)
        })

        test("should handle attempts to remove non-existent subscriptions", async () => {
            await expect(
                repository.removeSubscription({ courseId: COURSE_1_ID, studentId: STUDENT_1_ID })
            ).resolves.toBeUndefined()
        })
    })

    describe("findCoursesByStudent", () => {
        test("should return all courses subscribed by a student", async () => {
            await repository.addSubscription({ courseId: COURSE_1_ID, studentId: STUDENT_1_ID })
            await repository.addSubscription({ courseId: "course-2", studentId: STUDENT_1_ID })

            const courses = await repository.findCoursesByStudent(STUDENT_1_ID)
            expect(courses.length).toBe(2)
            expect(courses.map(c => c.id)).toEqual(expect.arrayContaining([COURSE_1_ID, "course-2"]))
        })

        test("should return an empty array if the student has no subscriptions", async () => {
            const courses = await repository.findCoursesByStudent(STUDENT_1_ID)
            expect(courses.length).toBe(0)
        })
    })

    describe("findStudentsByCourse", () => {
        test("should return all students subscribed to a course", async () => {
            await repository.addSubscription({ courseId: COURSE_1_ID, studentId: STUDENT_1_ID })
            await repository.addSubscription({ courseId: COURSE_1_ID, studentId: "student-2" })

            const students = await repository.findStudentsByCourse(COURSE_1_ID)
            expect(students.length).toBe(2)
            expect(students.map(s => s.id)).toEqual(expect.arrayContaining([STUDENT_1_ID, "student-2"]))
        })

        test("should return an empty array if the course has no subscribers", async () => {
            const students = await repository.findStudentsByCourse(COURSE_1_ID)
            expect(students.length).toBe(0)
        })
    })
})
