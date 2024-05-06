import { CourseRepository, Course } from "./Repositories"
import { Pool } from "pg"

export class PostgresCourseRepository implements CourseRepository {
    constructor(private pool: Pool) {}

    async insert(course: Course): Promise<void> {
        try {
            await this.pool.query("INSERT INTO courses (id, capacity) VALUES ($1, $2)", [course.id, course.capacity])
        } catch (e) {
            if (e.code === "23505") {
                throw new Error(`Course with id ${course.id} already exists.`)
            }
            throw e
        }
    }

    async update(course: Course): Promise<void> {
        const result = await this.pool.query("UPDATE courses SET capacity = $1 WHERE id = $2", [
            course.capacity,
            course.id
        ])

        if (result.rowCount === 0) throw new Error(`Course with id ${course.id} does not exist.`)
    }

    async delete(courseId: string): Promise<void> {
        this.pool.query("DELETE FROM courses WHERE id = $1", [courseId])
    }

    async findById(courseId: string): Promise<Course> {
        const { rows } = await this.pool.query<Course>("SELECT id, capacity FROM courses WHERE id = $1", [courseId])
        return rows[0]
    }

    async findAll(): Promise<Course[]> {
        const { rows } = await this.pool.query<Course>("SELECT id, capacity FROM courses")
        return rows
    }
}

export const installPostgresCourseRepository = async (pool: Pool) => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS courses (
            id TEXT PRIMARY KEY,
            capacity INT
        )
    `)
}
