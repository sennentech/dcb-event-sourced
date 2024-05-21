import { Pool, PoolClient, Client } from "pg"
import { Course, Student } from "../ReadModels"
import { CourseSubscriptionRepository } from "./Repositories"

export class PostgresCourseSubscriptionsRepository implements CourseSubscriptionRepository {
    constructor(private client: Pool | PoolClient | Client) {
        if (!client) throw new Error(`Postgres client is not initialised`)
    }

    async install(): Promise<void> {
        await this.client.query(`
                CREATE TABLE IF NOT EXISTS courses (
                    id TEXT,
                    capacity INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS students (
                    id TEXT,
                    name TEXT NOT NULL,
                    student_number integer NOT NULL
                );

                CREATE TABLE IF NOT EXISTS subscriptions (
                    course_id TEXT,
                    student_id TEXT
                );
            `)
    }

    async findCourseById(courseId: string): Promise<Course> {
        // Query to fetch course with all subscribed students as a JSON array
        const courseResult = await this.client.query(
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

        const studentsResult = await this.client.query(
            `
                SELECT s.id, s.name, s.student_number as "studentNumber"
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
        const studentResult = await this.client.query(
            `
                SELECT s.id, s.name, s.student_number as "studentNumber"
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
        const coursesResult = await this.client.query(
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
            studentNumber: studentData.studentNumber,
            subscribedCourses: coursesResult.rows.map(course => ({
                id: course.id,
                capacity: course.capacity
            }))
        }

        return student
    }

    async registerCourse(req: { courseId: string; capacity: number }): Promise<void> {
        await this.client.query("INSERT INTO courses (id, capacity) VALUES ($1, $2)", [req.courseId, req.capacity])
    }

    async registerStudent(req: { studentId: string; name: string; studentNumber: number }): Promise<void> {
        await this.client.query("INSERT INTO students (id, name, student_number) VALUES ($1, $2, $3)", [
            req.studentId,
            req.name,
            req.studentNumber
        ])
    }

    async updateCourseCapacity(req: { courseId: string; newCapacity: number }): Promise<void> {
        await this.client.query("UPDATE courses SET capacity = $1 WHERE id = $2", [req.newCapacity, req.courseId])
    }

    async subscribeStudentToCourse(req: { courseId: string; studentId: string }): Promise<void> {
        await this.client.query("INSERT INTO subscriptions (course_id, student_id) VALUES ($1, $2)", [
            req.courseId,
            req.studentId
        ])
    }

    async unsubscribeStudentFromCourse(req: { courseId: string; studentId: string }): Promise<void> {
        await this.client.query("DELETE FROM subscriptions WHERE course_id = $1 AND student_id = $2", [
            req.courseId,
            req.studentId
        ])
    }
}
