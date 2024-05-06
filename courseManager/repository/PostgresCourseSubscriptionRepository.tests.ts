import { Pool } from "pg"
import { IBackup, newDb } from "pg-mem"
import { PostgresCourseSubscriptionRepository } from "./PostgresCourseSubscriptionRespository"
import { subscribe } from "diagnostics_channel"

const COURSE_1 = {
    id: "course-1",
    capacity: 30
}
const STUDENT_1 = {
    id: "student-1",
    name: "John Doe"
}

describe("PostgresCourseSubscriptionRepository", () => {
    const db = newDb()
    const pool: Pool = new (db.adapters.createPg().Pool)()
    const repository = new PostgresCourseSubscriptionRepository(pool)
    let backup: IBackup

    beforeAll(async () => {
        await repository.install() // Assuming install method creates tables
        backup = db.backup()
    })

    beforeEach(async () => {
        backup.restore()
    })

    describe("registerCourse", () => {
        test("should register a course successfully", async () => {
            await repository.registerCourse(COURSE_1.id, COURSE_1.capacity)
            const course = await repository.findCourseById(COURSE_1.id)
            expect(course).toEqual({ id: COURSE_1.id, capacity: COURSE_1.capacity, subscribedStudents: [] })
        })

        test("should throw an error if registering a course with a duplicate ID", async () => {
            await repository.registerCourse(COURSE_1.id, COURSE_1.capacity)
            await expect(repository.registerCourse(COURSE_1.id, COURSE_1.capacity)).rejects.toThrow(
                `Course with id ${COURSE_1.id} already exists`
            )
        })
    })

    describe("findCourseById", () => {
        test("should return a course by ID with correct capacity and empty subscriptions", async () => {
            await repository.registerCourse(COURSE_1.id, COURSE_1.capacity)
            const course = await repository.findCourseById(COURSE_1.id)

            expect(course).toEqual({ id: COURSE_1.id, capacity: COURSE_1.capacity, subscribedStudents: [] })
        })
        test("should return undefined if the course does not exist", async () => {
            const course = await repository.findCourseById("non-existent-course")
            expect(course).toBeUndefined()
        })
    })

    describe("registerStudent", () => {
        const studentId = "student-1"
        const name = "John Doe"

        test("should throw an error if registering a student with a duplicate ID", async () => {
            await repository.registerStudent(studentId, name)
            await expect(repository.registerStudent(studentId, name)).rejects.toThrow(
                `Student with id ${studentId} already exists`
            )
        })
    })

    describe("with one existing course and one registered student", () => {
        beforeEach(async () => {
            await repository.registerCourse(COURSE_1.id, COURSE_1.capacity)
            await repository.registerStudent(STUDENT_1.id, STUDENT_1.name)
        })

        describe("updateCourseCapacity", () => {
            const newCapacity = 40

            test("should update a course's capacity successfully", async () => {
                await repository.updateCourseCapacity(COURSE_1.id, newCapacity)
                const course = await repository.findCourseById(COURSE_1.id)
                expect(course.capacity).toBe(newCapacity)
            })

            test("should throw an error if the course does not exist", async () => {
                await expect(repository.updateCourseCapacity("non-existent-course", newCapacity)).rejects.toThrow(
                    `Course with id non-existent-course does not exist.`
                )
            })
        })

        describe("subscribeStudentToCourse", () => {
            test("should subscribe a student to a course successfully", async () => {
                await repository.subscribeStudentToCourse(COURSE_1.id, STUDENT_1.id)
                const course = await repository.findCourseById(COURSE_1.id)
                expect(course.subscribedStudents).toEqual([{ id: STUDENT_1.id, name: STUDENT_1.name }])
            })

            test("should throw an error if either the course or student does not exist", async () => {
                await expect(
                    repository.subscribeStudentToCourse("non-existent-course", "non-existent-student")
                ).rejects.toThrow()
            })
        })

        describe("unsubscribeStudentFromCourse", () => {
            test("should unsubscribe a student from a course successfully", async () => {
                await repository.subscribeStudentToCourse(COURSE_1.id, STUDENT_1.id)
                await repository.unsubscribeStudentFromCourse(COURSE_1.id, STUDENT_1.id)
                const course = await repository.findCourseById(COURSE_1.id)
                expect(course.subscribedStudents).toEqual([])
            })

            test("should throw an error if student already unsubscribed", async () => {
                await expect(repository.unsubscribeStudentFromCourse(COURSE_1.id, STUDENT_1.id)).rejects.toThrow(
                    `Student ${STUDENT_1.id} is not subscribed to course ${COURSE_1.id}.`
                )
            })
        })
    })

    describe("findStudentById", () => {
        test("should return a student by ID with correct name and no subscribed courses", async () => {
            await repository.registerStudent(STUDENT_1.id, STUDENT_1.name)
            const student = await repository.findStudentById(STUDENT_1.id)

            expect(student).toEqual({
                id: STUDENT_1.id,
                name: STUDENT_1.name,
                subscribedCourses: []
            })
        })

        test("should return a student by ID with subscribed courses", async () => {
            await repository.registerStudent(STUDENT_1.id, STUDENT_1.name)
            await repository.registerCourse(COURSE_1.id, COURSE_1.capacity)
            await repository.subscribeStudentToCourse(COURSE_1.id, STUDENT_1.id)

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
