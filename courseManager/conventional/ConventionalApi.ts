import { CourseSubscriptionRepository } from "../repository/Repositories"
import { STUDENT_SUBSCRIPTION_LIMIT } from "../ReadModels"
import { Api } from "../Api"

export const ConventionalApi = (repository: CourseSubscriptionRepository): Api => {
    return {
        findCourseById: async (courseId: string) => {
            return repository.findCourseById(courseId)
        },
        findStudentById: async (studentId: string) => {
            return repository.findStudentById(studentId)
        },
        registerCourse: async (id: string, capacity: number) => {
            const course = await repository.findCourseById(id)
            if (course) throw new Error(`Course with id ${id} already exists`)

            return repository.registerCourse(id, capacity)
        },
        registerStudent: async (id: string, name: string) => {
            const student = await repository.findStudentById(id)
            if (student) throw new Error(`Student with id ${id} already exists`)

            return repository.registerStudent(id, name)
        },
        subscribeStudentToCourse: async (courseId: string, studentId: string) => {
            const course = await repository.findCourseById(courseId)
            if (!course) throw new Error(`Course with id ${courseId} does not exist.`)

            const student = await repository.findStudentById(studentId)
            if (!student) throw new Error(`Student with id ${studentId} does not exist.`)

            if (course.subscribedStudents.length >= course.capacity)
                throw new Error(`Course with id ${courseId} is full.`)

            if (student.subscribedCourses.length >= STUDENT_SUBSCRIPTION_LIMIT)
                throw new Error(`Student with id ${studentId} has reached the subscription limit.`)

            if (student.subscribedCourses.some(course => course.id === courseId))
                throw new Error(`Student with id ${studentId} is already subscribed to course with id ${courseId}.`)

            await repository.subscribeStudentToCourse(courseId, studentId)
        },
        unsubscribeStudentFromCourse: async (courseId: string, studentId: string) => {
            const course = await repository.findCourseById(courseId)
            if (!course) throw new Error(`Course with id ${courseId} does not exist.`)

            const student = await repository.findStudentById(studentId)
            if (!student) throw new Error(`Student with id ${studentId} does not exist.`)

            if (!student.subscribedCourses.some(course => course.id === courseId))
                throw new Error(`Student with id ${studentId} is not subscribed to course with id ${courseId}.`)

            await repository.unsubscribeStudentFromCourse(courseId, studentId)
        }
    }
}
