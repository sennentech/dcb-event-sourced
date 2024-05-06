// import { Pool } from "pg"
// import { cli, command } from "interactive-cli"

// import {
//     PostgresSubscriptionRepository,
//     installPostgresSubscriptionRepository
// } from "./repository/PostgresSubscriptionRepository"
// import { newDb } from "pg-mem"
// import { installPostgresCourseRepository, PostgresCourseRepository } from "./repository/PostgresCourseRepository"
// import { installPostgresStudentRepository, PostgresStudentRepository } from "./repository/PostgresStudentRepository"
// ;(async () => {
//     // Initialize in-memory database
//     const db = newDb()
//     const pool = new (db.adapters.createPg().Pool)()

//     // Install repositories
//     await installPostgresCourseRepository(pool)
//     await installPostgresStudentRepository(pool)
//     await installPostgresSubscriptionRepository(pool)

//     // Create repository instances
//     const courseRepository = new PostgresCourseRepository(pool)
//     const studentRepository = new PostgresStudentRepository(pool)
//     const subscriptionRepository = new PostgresSubscriptionRepository(pool)

//     command("add-course", "Add a new course", async () => {
//         const id = await cli.ask("Enter course ID:")
//         const capacity = await cli.ask("Enter course capacity:", {
//             validate: value => {
//                 const parsed = parseInt(value, 10)
//                 return isNaN(parsed) || parsed <= 0 ? "Please enter a valid number greater than zero." : true
//             }
//         })

//         try {
//             await courseRepository.insert({
//                 id: id,
//                 capacity: parseInt(capacity, 10)
//             })
//             console.log("Course added successfully")
//         } catch (error) {
//             console.error("Failed to add course:", error.message)
//         }
//     })
// })()
