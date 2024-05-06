export interface Course {
    id: string
    capacity: number
}

export interface CourseRepository {
    create(course: Course): Promise<void>
    update(course: Course): Promise<void>
    delete(courseId: string): Promise<void>

    findById(courseId: string): Promise<Course>
    findAll(): Promise<Course[]>
}
