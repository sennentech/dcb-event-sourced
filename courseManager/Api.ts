import { Course, Student } from "./readModel/readModels"

export interface Api {
    findCourseById(courseId: string): Promise<Course | undefined>
    findStudentById(studentId: string): Promise<Student | undefined>
    registerCourse(id: string, capacity: number): Promise<void>
    registerStudent(id: string, name: string): Promise<void>
    subscribeStudentToCourse(courseId: string, studentId: string): Promise<void>
    unsubscribeStudentFromCourse(courseId: string, studentId: string): Promise<void>
}
