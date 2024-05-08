import { Course, Student } from "./ReadModels"

export interface Api {
    findCourseById(courseId: string): Promise<Course | undefined>
    findStudentById(studentId: string): Promise<Student | undefined>
    registerCourse(req: { id: string; capacity: number }): Promise<void>
    registerStudent(req: { id: string; name: string }): Promise<void>
    subscribeStudentToCourse(req: { courseId: string; studentId: string }): Promise<void>
    unsubscribeStudentFromCourse(req: { courseId: string; studentId: string }): Promise<void>
}
