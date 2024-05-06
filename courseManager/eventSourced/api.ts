// import { Pool } from "pg"

// import {
//     PostgresSubscriptionRepository,
//     installPostgresSubscriptionRepository
// } from "./repository/PostgresSubscriptionRepository"
// import { newDb } from "pg-mem"

// import { installPostgresCourseRepository, PostgresCourseRepository } from "./repository/PostgresCourseRepository"
// import { installPostgresStudentRepository, PostgresStudentRepository } from "./repository/PostgresStudentRepository"
// import { Course } from "./readModel/readModels"
// ;(async () => {
//     // Initialize in-memory database
//     const db = newDb()
//     const pool: Pool = new (db.adapters.createPg().Pool)()

//     // Install repositories
//     await installPostgresCourseRepository(pool)
//     await installPostgresStudentRepository(pool)
//     await installPostgresSubscriptionRepository(pool)

//     // Create repository instances
//     const courseRepository = new PostgresCourseRepository(pool)
//     const studentRepository = new PostgresStudentRepository(pool)
//     const subscriptionRepository = new PostgresSubscriptionRepository(pool)

//     return {
//         createCourse: async (id: string, capacity: number) => {},
//         createStudent: async (id: string, name: string) => {},
//         subscribeStudentToCourse: async (courseId: string, studentId: string) => {},
//         findCourseById: async (courseId: string): Promise<Course> => {
//             const course = await courseRepository.findById(courseId)
//             const subscripions = await subscriptionRepository.findStudentsByCourse(courseId)

//             const finalCourse: Course = {
//                 id: course.id,
//                 subscribedStudents: subscripions.map(sub => ({ id: sub.id }))
//             }
//             return finalCourse
//         }
//     }
// })()
