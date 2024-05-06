import { Pool } from "pg"
import { newDb } from "pg-mem"
import { PostgresCourseRepository, installPostgresCourseRepository } from "./PostgresCourseRepository"
describe("PostgresCourseRepository", () => {
    const db = newDb()
    const pool: Pool = new (db.adapters.createPg().Pool)()

    const repository = new PostgresCourseRepository(pool)

    beforeAll(async () => {
        await installPostgresCourseRepository(pool)
    })

    describe("when database is empty", () => {
        test("Should return empty array when findAll called", async () => {
            const courses = await repository.findAll()
            expect(courses).toEqual([])
        })
    })
})
