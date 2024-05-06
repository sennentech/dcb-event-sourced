import { Pool } from "pg"
import { IBackup, newDb } from "pg-mem"
import { PostgresStudentRepository, installPostgresStudentRepository } from "./PostgresStudentRepository"

const STUDENT_ID = "student-1"

describe("PostgresStudentRepository", () => {
    const db = newDb()
    const pool: Pool = new (db.adapters.createPg().Pool)()

    const repository = new PostgresStudentRepository(pool)
    let backup: IBackup

    beforeAll(async () => {
        await installPostgresStudentRepository(pool)
        backup = db.backup()
    })

    beforeEach(async () => {
        backup.restore()
    })

    describe("findAll", () => {
        test("should return an empty array when no students are present", async () => {
            const students = await repository.findAll()
            expect(students).toEqual([])
        })

        test("should return all students after multiple insertions", async () => {
            await repository.insert({ id: "student-1", name: "John Doe" })
            await repository.insert({ id: "student-2", name: "Jane Smith" })
            const students = await repository.findAll()
            expect(students).toHaveLength(2)
        })
    })

    describe("findById", () => {
        test("should return undefined when no student matches the ID", async () => {
            const student = await repository.findById(STUDENT_ID)
            expect(student).toBeUndefined()
        })

        test("should return the correct student after it is inserted", async () => {
            await repository.insert({ id: STUDENT_ID, name: "John Doe" })
            const student = await repository.findById(STUDENT_ID)
            expect(student).toEqual({ id: STUDENT_ID, name: "John Doe" })
        })

        test("should handle cases where null input is given", async () => {
            const student = await repository.findById(null)
            expect(student).toBeUndefined()
        })
    })

    describe("insert", () => {
        test("should successfully insert and retrieve a new student", async () => {
            await repository.insert({ id: STUDENT_ID, name: "John Doe" })
            const student = await repository.findById(STUDENT_ID)
            expect(student).toEqual({ id: STUDENT_ID, name: "John Doe" })
        })

        test("should throw an error when inserting a student with a duplicate ID", async () => {
            await repository.insert({ id: STUDENT_ID, name: "John Doe" })
            await expect(repository.insert({ id: STUDENT_ID, name: "John Doe" })).rejects.toThrow(
                `Student with id ${STUDENT_ID} already exists.`
            )
        })
    })

    describe("update", () => {
        test("should update a student's name successfully", async () => {
            await repository.insert({ id: STUDENT_ID, name: "John Doe" })
            await repository.update({ id: STUDENT_ID, name: "John Smith" })
            const student = await repository.findById(STUDENT_ID)
            expect(student).toEqual({ id: STUDENT_ID, name: "John Smith" })
        })

        test("should throw an error when updating a non-existent student", async () => {
            await expect(repository.update({ id: STUDENT_ID, name: "John Smith" })).rejects.toThrow(
                `Student with id ${STUDENT_ID} does not exist.`
            )
        })
    })

    describe("delete", () => {
        test("should successfully delete an existing student", async () => {
            await repository.insert({ id: STUDENT_ID, name: "John Doe" })
            await repository.delete(STUDENT_ID)
            const students = await repository.findAll()
            expect(students).toEqual([])
        })

        test("should do nothing when trying to delete a non-existent student", async () => {
            await expect(repository.delete(STUDENT_ID)).resolves.toBeUndefined()
        })
    })
})
