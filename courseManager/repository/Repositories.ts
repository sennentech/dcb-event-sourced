import { Course, Student } from "../ReadModels"

export interface CourseSubscriptionRepository {
    install(): Promise<void>
    findCourseById(courseId: string): Promise<Course>
    findStudentById(studentId: string): Promise<Student>

    registerCourse(req: { courseId: string; capacity: number }): Promise<void>
    registerStudent(req: { studentId: string; name: string; studentNumber: number }): Promise<void>
    updateCourseCapacity(req: { courseId: string; newCapacity: number }): Promise<void>
    subscribeStudentToCourse(req: { courseId: string; studentId: string }): Promise<void>
    unsubscribeStudentFromCourse(req: { courseId: string; studentId: string }): Promise<void>
}
