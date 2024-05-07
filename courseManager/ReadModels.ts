export const STUDENT_SUBSCRIPTION_LIMIT = 5

export class Course {
    id: string
    capacity: number
    subscribedStudents: Omit<Student, "subscribedCourses">[]
}

export class Student {
    id: string
    name: string
    subscribedCourses: Omit<Course, "subscribedStudents">[]
}
