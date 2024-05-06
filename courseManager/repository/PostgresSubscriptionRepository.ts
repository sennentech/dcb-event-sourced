import { Pool } from "pg"
import { Course, CourseSubscription, Student, SubscriptionRepository } from "./Repositories"

export class PostgresSubscriptionRepository implements SubscriptionRepository {
    constructor(private pool: Pool) {}

    async addSubscription(subscription: CourseSubscription): Promise<void> {
        try {
            await this.pool.query("INSERT INTO subscriptions (course_id, student_id) VALUES ($1, $2)", [
                subscription.courseId,
                subscription.studentId
            ])
        } catch (e) {
            throw e
        }
    }

    async removeSubscription(subscription: CourseSubscription): Promise<void> {
        try {
            await this.pool.query("DELETE FROM subscriptions WHERE course_id = $1 AND student_id = $2", [
                subscription.courseId,
                subscription.studentId
            ])
        } catch (e) {
            throw e
        }
    }

    async findCoursesByStudent(studentId: string): Promise<Course[]> {
        const { rows } = await this.pool.query<Course>(
            "SELECT c.id, c.capacity FROM courses c INNER JOIN subscriptions s ON c.id = s.course_id WHERE s.student_id = $1",
            [studentId]
        )
        return rows
    }

    async findStudentsByCourse(courseId: string): Promise<Student[]> {
        const { rows } = await this.pool.query<Student>(
            "SELECT s.id, s.name FROM students s INNER JOIN subscriptions s ON s.id = s.student_id WHERE s.course_id = $1",
            [courseId]
        )
        return rows
    }
}

export const installPostgresSubscriptionRepository = async (pool: Pool): Promise<void> => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS subscriptions (
            course_id TEXT,
            student_id TEXT,
            PRIMARY KEY (course_id, student_id),
            FOREIGN KEY (course_id) REFERENCES courses(id),
            FOREIGN KEY (student_id) REFERENCES students(id)
        )
    `)
}
