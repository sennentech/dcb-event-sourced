import { StudentRepository, Student } from "./Repositories"
import { Pool } from "pg"

export class PostgresStudentRepository implements StudentRepository {
    constructor(private pool: Pool) {}

    async insert(student: Student): Promise<void> {
        try {
            await this.pool.query("INSERT INTO students (id, name) VALUES ($1, $2)", [student.id, student.name])
        } catch (e) {
            if (e.code === "23505") {
                throw new Error(`Student with id ${student.id} already exists.`)
            }
            throw e
        }
    }

    async update(student: Student): Promise<void> {
        const result = await this.pool.query("UPDATE students SET name = $1 WHERE id = $2", [student.name, student.id])

        if (result.rowCount === 0) throw new Error(`Student with id ${student.id} does not exist.`)
    }

    async delete(studentId: string): Promise<void> {
        this.pool.query("DELETE FROM students WHERE id = $1", [studentId])
    }

    async findById(studentId: string): Promise<Student> {
        const { rows } = await this.pool.query<Student>("SELECT id, name FROM students WHERE id = $1", [studentId])
        return rows[0]
    }

    async findAll(): Promise<Student[]> {
        const { rows } = await this.pool.query<Student>("SELECT id, name FROM students")
        return rows
    }
}

export const installPostgresStudentRepository = async (pool: Pool) => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS students (
            id TEXT PRIMARY KEY,
            name TEXT
        )
    `)
}
