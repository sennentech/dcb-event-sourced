export interface Course {
    id: string
    capacity: number
}

export interface Student {
    id: string
    name: string
}

export interface CourseRepository {
    insert(course: Course): Promise<void>
    update(course: Course): Promise<void>
    delete(courseId: string): Promise<void>

    findById(courseId: string): Promise<Course>
    findAll(): Promise<Course[]>
}

export interface StudentRepository {
    insert(student: Student): Promise<void>
    update(student: Student): Promise<void>
    delete(studentId: string): Promise<void>

    findById(studentId: string): Promise<Student>
    findAll(): Promise<Student[]>
}

export interface CourseSubscription {
    courseId: string
    studentId: string
}

export interface SubscriptionRepository {
    addSubscription(subscription: CourseSubscription): Promise<void>
    removeSubscription(subscription: CourseSubscription): Promise<void>
    findCoursesByStudent(studentId: string): Promise<Course[]>
    findStudentsByCourse(courseId: string): Promise<Student[]>
}
