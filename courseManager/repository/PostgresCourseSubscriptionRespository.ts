import { Pool } from "pg"
import { Course, Student } from "../readModel/readModels"

export class PostgresCourseSubscriptionRepository {
    constructor(private pool: Pool) {}

    async install(): Promise<void> {
        await this.pool.query(`
                CREATE TABLE IF NOT EXISTS courses (
                    id TEXT,
                    capacity INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS students (
                    id TEXT,
                    name TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS subscriptions (
                    course_id TEXT,
                    student_id TEXT
                );
            `)
    }

    async findCourseById(courseId: string): Promise<Course> {
        // Query to fetch course with all subscribed students as a JSON array
        const courseResult = await this.pool.query(
            `
                SELECT c.id, c.capacity
                FROM courses c
                WHERE c.id = $1
            `,
            [courseId]
        )

        if (courseResult.rows.length === 0) {
            return undefined
        }

        const courseData = courseResult.rows[0]

        const studentsResult = await this.pool.query(
            `
                SELECT s.id, s.name
                FROM students s
                JOIN subscriptions sub ON s.id = sub.student_id
                WHERE sub.course_id = $1
            `,
            [courseId]
        )

        const course: Course = {
            id: courseData.id,
            capacity: courseData.capacity,
            subscribedStudents: studentsResult.rows
        }

        return course
    }

    async findStudentById(studentId: string): Promise<Student> {
        // Query to fetch student
        const studentResult = await this.pool.query(
            `
                SELECT s.id, s.name
                FROM students s
                WHERE s.id = $1
            `,
            [studentId]
        )

        if (studentResult.rows.length === 0) {
            return undefined
        }

        const studentData = studentResult.rows[0]

        // Query to fetch courses that the student is subscribed to
        const coursesResult = await this.pool.query(
            `
                SELECT c.id, c.capacity
                FROM courses c
                JOIN subscriptions sub ON c.id = sub.course_id
                WHERE sub.student_id = $1
            `,
            [studentId]
        )

        const student: Student = {
            id: studentData.id,
            name: studentData.name,
            subscribedCourses: coursesResult.rows.map(course => ({
                id: course.id,
                capacity: course.capacity
            }))
        }

        return student
    }

    async registerCourse(courseId: string, capacity: number): Promise<void> {
        await this.pool.query("INSERT INTO courses (id, capacity) VALUES ($1, $2)", [courseId, capacity])
    }

    async registerStudent(studentId: string, name: string): Promise<void> {
        await this.pool.query("INSERT INTO students (id, name) VALUES ($1, $2)", [studentId, name])
    }

    async updateCourseCapacity(courseId: string, newCapacity: number): Promise<void> {
        await this.pool.query("UPDATE courses SET capacity = $1 WHERE id = $2", [newCapacity, courseId])
    }

    async subscribeStudentToCourse(courseId: string, studentId: string): Promise<void> {
        await this.pool.query("INSERT INTO subscriptions (course_id, student_id) VALUES ($1, $2)", [
            courseId,
            studentId
        ])
    }

    async unsubscribeStudentFromCourse(courseId: string, studentId: string): Promise<void> {
        await this.pool.query("DELETE FROM subscriptions WHERE course_id = $1 AND student_id = $2", [
            courseId,
            studentId
        ])
    }
}
