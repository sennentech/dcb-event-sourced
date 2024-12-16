import { Pool, PoolClient, Client } from "pg"
export const STUDENT_SUBSCRIPTION_LIMIT = 5

/*
    This repository has nothing to do with the event sourcing, and is a simple layer following a repository 
    pattern with a simple CRUD like postgres implementation.  It is used here with the 
    PostgresCourseSubscriptionsProjection to demonstrate how the projection might persist state to a database.
*/

export class Course {
    id: string
    title: string
    capacity: number
    subscribedStudents: Omit<Student, "subscribedCourses">[]
}

export class Student {
    id: string
    name: string
    studentNumber: number
    subscribedCourses: Omit<Course, "subscribedStudents">[]
}

export class PostgresCourseSubscriptionsRepository {
    constructor(private client: Pool | PoolClient | Client) {
        if (!client) throw new Error(`Postgres client is not initialised`)
    }

    async install(): Promise<void> {
        await this.client.query(`
                CREATE TABLE IF NOT EXISTS courses (
                    id TEXT,
                    title TEXT NOT NULL,
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

    async findCourseById(courseId: string): Promise<Course | undefined> {
        const courseResult = await this.client.query(
            `
                SELECT c.id, c.title, c.capacity
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
            title: courseData.title,
            capacity: courseData.capacity,
            subscribedStudents: studentsResult.rows
        }

        return course
    }

    async findStudentById(studentId: string): Promise<Student | undefined> {
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

        const coursesResult = await this.client.query(
            `
                SELECT c.id, c.title, c.capacity
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
                title: course.title,
                capacity: course.capacity
            }))
        }

        return student
    }

    async registerCourse(req: { title: string; courseId: string; capacity: number }): Promise<void> {
        await this.client.query("INSERT INTO courses (id, title, capacity) VALUES ($1, $2, $3)", [
            req.courseId,
            req.title,
            req.capacity
        ])
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

    async updateCourseTitle(req: { courseId: string; newTitle: string }): Promise<void> {
        await this.client.query("UPDATE courses SET title = $1 WHERE id = $2", [req.newTitle, req.courseId])
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
