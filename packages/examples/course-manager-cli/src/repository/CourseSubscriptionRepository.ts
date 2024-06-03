import { Course, Student } from "../ReadModels"

export interface CourseSubscriptionRepository {
    install(): Promise<void>
    findCourseById(courseId: string): Promise<Course | undefined>
    findStudentById(studentId: string): Promise<Student | undefined>

    registerCourse(req: { courseId: string; title: string; capacity: number }): Promise<void>
    registerStudent(req: { studentId: string; name: string; studentNumber: number }): Promise<void>
    updateCourseCapacity(req: { courseId: string; newCapacity: number }): Promise<void>
    updateCourseTitle(req: { courseId: string; newTitle: string }): Promise<void>
    subscribeStudentToCourse(req: { courseId: string; studentId: string }): Promise<void>
    unsubscribeStudentFromCourse(req: { courseId: string; studentId: string }): Promise<void>
}
