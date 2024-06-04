import { Api } from "../Api"
import { STUDENT_SUBSCRIPTION_LIMIT } from "../ReadModels"
import { CourseSubscriptionRepository } from "../repository/CourseSubscriptionRepository"

export const ConventionalApi = (repository: CourseSubscriptionRepository): Api => {
    return {
        findCourseById: async (courseId: string) => {
            return repository.findCourseById(courseId)
        },
        findStudentById: async (studentId: string) => {
            return repository.findStudentById(studentId)
        },
        registerCourse: async ({ id, title, capacity }) => {
            const course = await repository.findCourseById(id)
            if (course) throw new Error(`Course with id ${id} already exists`)

            return repository.registerCourse({ courseId: id, title, capacity })
        },
        registerStudent: async ({ id, name }) => {
            const student = await repository.findStudentById(id)
            if (student) throw new Error(`Student with id ${id} already exists`)

            return repository.registerStudent({ studentId: id, name, studentNumber: 0 })
        },
        updateCourseCapacity: async ({ courseId, newCapacity }) => {
            const course = await repository.findCourseById(courseId)
            if (!course) throw new Error(`Course with id ${courseId} does not exist.`)
            if (course.capacity === newCapacity) throw new Error("New capacity is the same as the current capacity.")
            return repository.updateCourseCapacity({ courseId, newCapacity })
        },
        updateCourseTitle: async ({ courseId, newTitle }) => {
            const course = await repository.findCourseById(courseId)
            if (!course) throw new Error(`Course with id ${courseId} does not exist.`)
            if (course.title === newTitle) throw new Error("New title is the same as the current title.")
            return repository.updateCourseTitle({ courseId, newTitle })
        },
        subscribeStudentToCourse: async ({ courseId, studentId }) => {
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

            await repository.subscribeStudentToCourse({ courseId, studentId })
        },
        unsubscribeStudentFromCourse: async ({ courseId, studentId }) => {
            const course = await repository.findCourseById(courseId)
            if (!course) throw new Error(`Course with id ${courseId} does not exist.`)

            const student = await repository.findStudentById(studentId)
            if (!student) throw new Error(`Student with id ${studentId} does not exist.`)

            if (!student.subscribedCourses.some(course => course.id === courseId))
                throw new Error(`Student with id ${studentId} is not subscribed to course with id ${courseId}.`)

            await repository.unsubscribeStudentFromCourse({ courseId, studentId })
        }
    }
}
