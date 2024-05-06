import { Course, Student } from "../readModel/readModels"

export interface CourseSubscriptionRepository {
    install(): Promise<void>
    findCourseById(courseId: string): Promise<Course>
    findStudentById(studentId: string): Promise<Student>

    registerCourse(courseId: string, capacity: number): Promise<void>
    registerStudent(studentId: string, name: string): Promise<void>
    updateCourseCapacity(courseId: string, newCapacity: number): Promise<void>
    subscribeStudentToCourse(courseId: string, studentId: string): Promise<void>
    unsubscribeStudentFromCourse(courseId: string, studentId: string): Promise<void>
}
