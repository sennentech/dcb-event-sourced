import { Pool } from "pg"
import { PostgresCourseSubscriptionsRepository } from "./repository/PostgresCourseSubscriptionRespository"
import { MemoryEventStore } from "../eventStore/memoryEventStore/MemoryEventStore"
import { EventSourcedApi } from "./eventSourced/EventSourcedApi"
import { ProjectionRegistry } from "../eventHandling/EventHandler"
import { CourseSubscriptionsProjection } from "./eventSourced/CourseSubscriptionsProjection"
import { PostgresLockManager } from "../eventHandling/lockManager/PostgresLockManager"
import inquirer from "inquirer"
import { PostgresEventStore } from "../eventStore/postgresEventStore/PostgresEventStore"
import "source-map-support/register"
;(async () => {
    const pool = new Pool({
        host: "localhost",
        port: 5432,
        user: "postgres",
        password: "postgres",
        database: "dcb_test_1"
    })

    const eventStore = new PostgresEventStore(pool)
    await eventStore.install()

    const repository = new PostgresCourseSubscriptionsRepository(pool)
    await repository.install()

    const lockManager = new PostgresLockManager(pool, "course-subscription-projection")
    await lockManager.install()

    //RESET:
    await pool.query(
        `
        truncate table subscriptions; 
        truncate table _event_handler_bookmarks; 
        truncate table courses; 
        truncate table students;
        truncate table events;
        `
    )

    const projectionRegistry: ProjectionRegistry = [
        {
            handler: CourseSubscriptionsProjection(lockManager),
            lockManager
        }
    ]

    const api = EventSourcedApi(eventStore, repository, projectionRegistry)

    let exit = false
    while (!exit) {
        const choices = await inquirer.prompt({
            type: "list",
            name: "action",
            message: "What do you want to do?",
            choices: [
                "Register course",
                "Register student",
                "Subscribe student to course",
                "Unsubscribe student from course",
                "Find course",
                "Find student",
                "Exit"
            ]
        })

        try {
            switch (choices.action) {
                case "Register course": {
                    const course = await inquirer.prompt([
                        { name: "id", message: "Course ID:", type: "input" },
                        { name: "capacity", message: "Course capacity:", type: "number" }
                    ])
                    await api.registerCourse(course)
                    console.log(`Course with id ${course.id} and capacity ${course.capacity} registered`)
                    break
                }

                case "Update course capacity": {
                    const { courseId, newCapacity } = await inquirer.prompt([
                        { name: "courseId", message: "Course ID:", type: "input" },
                        { name: "newCapacity", message: "Course capacity:", type: "number" }
                    ])
                    // await api.updateCourseCapacity({ courseId, newCapacity })
                    console.log(`method not implemented`)
                    break
                }

                case "Register student": {
                    const student = await inquirer.prompt([
                        { name: "id", message: "Student ID:", type: "input" },
                        { name: "name", message: "Student name:", type: "input" }
                    ])
                    await api.registerStudent(student)
                    console.log(`Student with id ${student.id} and name ${student.name} registered`)
                    break
                }

                case "Subscribe student to course": {
                    const { courseId, studentId } = await inquirer.prompt([
                        { name: "studentId", message: "Student ID:", type: "input" },
                        { name: "courseId", message: "Course ID:", type: "input" }
                    ])
                    await api.subscribeStudentToCourse({ courseId, studentId })
                    console.log(`Student ${studentId} subscribed to course ${courseId}`)
                    break
                }

                case "Unsubscribe student from course": {
                    const { courseId, studentId } = await inquirer.prompt([
                        { name: "studentId", message: "Student ID:", type: "input" },
                        { name: "courseId", message: "Course ID:", type: "input" }
                    ])
                    await api.unsubscribeStudentFromCourse({ courseId, studentId })
                    console.log(`Student ${studentId} unsubscribed from course ${courseId}`)
                    break
                }

                case "Find course": {
                    const { courseId } = await inquirer.prompt([
                        { name: "courseId", message: "Course ID:", type: "input" }
                    ])
                    const course = await api.findCourseById(courseId)
                    console.log(`Found course:`)
                    console.log(course)
                    break
                }

                case "Find student": {
                    const { studentId } = await inquirer.prompt([
                        { name: "studentId", message: "Student ID:", type: "input" }
                    ])
                    const course = await api.findStudentById(studentId)
                    console.log(`Found student:`)
                    console.log(course)
                    break
                }

                case "Exit":
                    exit = true
                    console.log("Exiting...")
                    break

                default:
                    console.log("No valid action selected.")
                    break
            }
        } catch (err) {
            console.log(`***** ERROR: ${err.message} *****`)
        }
    }
})()
