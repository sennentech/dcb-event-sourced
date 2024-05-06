import { Pool } from "pg"
import { IBackup, newDb } from "pg-mem"
import { PostgresCourseRepository, installPostgresCourseRepository } from "./PostgresCourseRepository"

const COURSE_1_ID = "course-1"
const COURSE_2_ID = "course-2"

describe("PostgresCourseRepository", () => {
    const db = newDb()
    const pool: Pool = new (db.adapters.createPg().Pool)()

    const repository = new PostgresCourseRepository(pool)
    let backup: IBackup

    beforeAll(async () => {
        await installPostgresCourseRepository(pool)
        backup = db.backup()
    })

    beforeEach(async () => {
        backup.restore()
    })

    describe("findAll", () => {
        test("should return an empty array when no courses are present", async () => {
            const courses = await repository.findAll()
            expect(courses).toEqual([])
        })

        test("should return all courses after multiple insertions", async () => {
            await repository.insert({ id: COURSE_1_ID, capacity: 10 })
            await repository.insert({ id: COURSE_2_ID, capacity: 20 })
            const courses = await repository.findAll()
            expect(courses).toHaveLength(2)
        })
    })

    describe("findById", () => {
        test("should return undefined when no course matches the ID", async () => {
            const course = await repository.findById(COURSE_1_ID)
            expect(course).toBeUndefined()
        })

        test("should return the correct course after it is inserted", async () => {
            await repository.insert({ id: COURSE_1_ID, capacity: 10 })
            const course = await repository.findById(COURSE_1_ID)
            expect(course).toEqual({ id: COURSE_1_ID, capacity: 10 })
        })

        test("Should return the correct course when multiple courses are present", async () => {
            await repository.insert({ id: COURSE_1_ID, capacity: 20 })
            await repository.insert({ id: COURSE_2_ID, capacity: 10 })
            const course = await repository.findById(COURSE_1_ID)
            expect(course).toEqual({ id: COURSE_1_ID, capacity: 20 })
        })
    })

    describe("insert", () => {
        test("should successfully insert and retrieve a new course", async () => {
            await repository.insert({ id: COURSE_1_ID, capacity: 10 })
            const course = await repository.findById(COURSE_1_ID)
            expect(course).toEqual({ id: COURSE_1_ID, capacity: 10 })
        })

        test("should throw an error when inserting a course with a duplicate ID", async () => {
            await repository.insert({ id: COURSE_1_ID, capacity: 10 })
            await expect(repository.insert({ id: COURSE_1_ID, capacity: 10 })).rejects.toThrow(
                `Course with id ${COURSE_1_ID} already exists.`
            )
        })
    })

    describe("update", () => {
        test("should update a course's capacity successfully", async () => {
            await repository.insert({ id: COURSE_1_ID, capacity: 10 })
            await repository.update({ id: COURSE_1_ID, capacity: 20 })
            const course = await repository.findById(COURSE_1_ID)
            expect(course).toEqual({ id: COURSE_1_ID, capacity: 20 })
        })

        test("should throw an error when updating a non-existent course", async () => {
            await expect(repository.update({ id: COURSE_1_ID, capacity: 10 })).rejects.toThrow(
                `Course with id ${COURSE_1_ID} does not exist.`
            )
        })
    })

    describe("delete", () => {
        test("should successfully delete an existing course", async () => {
            await repository.insert({ id: COURSE_1_ID, capacity: 10 })
            await repository.delete(COURSE_1_ID)
            const courses = await repository.findAll()
            expect(courses).toEqual([])
        })

        test("should do nothing when trying to delete a non-existent course", async () => {
            await expect(repository.delete(COURSE_1_ID)).resolves.toBeUndefined()
        })
    })

    // Additional test scenarios
    test("should return undefined when findById is called with null", async () => {
        const course = await repository.findById(null)
        expect(course).toBeUndefined()
    })
})
