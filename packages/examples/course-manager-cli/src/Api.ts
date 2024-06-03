import { Course, Student } from "./ReadModels"

export interface Api {
    findCourseById(courseId: string): Promise<Course | undefined>
    findStudentById(studentId: string): Promise<Student | undefined>
    registerCourse(req: { id: string; title: string; capacity: number }): Promise<void>
    registerStudent(req: { id: string; name: string }): Promise<void>
    updateCourseCapacity(req: { courseId: string; newCapacity: number }): Promise<void>
    updateCourseTitle(req: { courseId: string; newTitle: string }): Promise<void>
    subscribeStudentToCourse(req: { courseId: string; studentId: string }): Promise<void>
    unsubscribeStudentFromCourse(req: { courseId: string; studentId: string }): Promise<void>
}
