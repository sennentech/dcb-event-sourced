import { Pool } from "pg"
import { PostgresCourseSubscriptionsRepository } from "./repository/PostgresCourseSubscriptionRespository"
import { EventSourcedApi } from "./eventSourced/EventSourcedApi"
import { CourseSubscriptionsProjection } from "./eventSourced/CourseSubscriptionsProjection"
import inquirer from "inquirer"
import { PostgresEventStore } from "../eventStore/postgresEventStore/PostgresEventStore"
import "source-map-support/register"
import { PostgresTransactionManager } from "../eventHandling/postgresEventHandlerRegistry/PostgresTransactionManager"
import { PostgresEventHandlerRegistry } from "../eventHandling/postgresEventHandlerRegistry/PostgresEventHandlerRegistry"
import { PostgresBundle } from "../eventHandling/postgresEventHandlerRegistry/PostgresBundle"

const log = (message: string | object | Error) => {
    console.log(`______________________________________________________`)
    if (message instanceof Error) {
        console.log(`\n\x1b[31m${message?.message ?? message}\x1b[0m`)
    } else {
        console.log(`\n${typeof message === "object" ? JSON.stringify(message, null, 2) : message}`)
    }
    console.log(`______________________________________________________\n`)
}

;(async () => {
    const { pool, eventStore, transactionManager } = await PostgresBundle({
        host: "localhost",
        port: 5432,
        user: "postgres",
        password: "postgres",
        database: "dcb_test_1"
    })
    await resetDb(pool)

    const handlers = {
        CourseProjection: CourseSubscriptionsProjection(transactionManager)
    }

    const handlerRegistry = new PostgresEventHandlerRegistry(transactionManager, handlers)
    await handlerRegistry.install()

    const repository = new PostgresCourseSubscriptionsRepository(pool)
    await repository.install()
    const api = EventSourcedApi(eventStore, repository, handlerRegistry)

    log("Program started succesfully")
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
                    log(`Course with id ${course.id} and capacity ${course.capacity} registered`)
                    break
                }

                case "Update course capacity": {
                    const { courseId, newCapacity } = await inquirer.prompt([
                        { name: "courseId", message: "Course ID:", type: "input" },
                        { name: "newCapacity", message: "Course capacity:", type: "number" }
                    ])
                    console.log(courseId, newCapacity)
                    // await api.updateCourseCapacity({ courseId, newCapacity })
                    log(`method not implemented`)
                    break
                }

                case "Register student": {
                    const student = await inquirer.prompt([
                        { name: "id", message: "Student ID:", type: "input" },
                        { name: "name", message: "Student name:", type: "input" }
                    ])
                    await api.registerStudent(student)
                    log(`Student with id ${student.id} and name ${student.name} registered`)
                    break
                }

                case "Subscribe student to course": {
                    const { courseId, studentId } = await inquirer.prompt([
                        { name: "studentId", message: "Student ID:", type: "input" },
                        { name: "courseId", message: "Course ID:", type: "input" }
                    ])
                    await api.subscribeStudentToCourse({ courseId, studentId })
                    log(`Student ${studentId} subscribed to course ${courseId}`)
                    break
                }

                case "Unsubscribe student from course": {
                    const { courseId, studentId } = await inquirer.prompt([
                        { name: "studentId", message: "Student ID:", type: "input" },
                        { name: "courseId", message: "Course ID:", type: "input" }
                    ])
                    await api.unsubscribeStudentFromCourse({ courseId, studentId })
                    log(`Student ${studentId} unsubscribed from course ${courseId}`)
                    break
                }

                case "Find course": {
                    const { courseId } = await inquirer.prompt([
                        { name: "courseId", message: "Course ID:", type: "input" }
                    ])
                    const course = await api.findCourseById(courseId)
                    log(`Found course:`)
                    log(course)
                    break
                }

                case "Find student": {
                    const { studentId } = await inquirer.prompt([
                        { name: "studentId", message: "Student ID:", type: "input" }
                    ])
                    const course = await api.findStudentById(studentId)
                    log(`Found student:`)
                    log(course)
                    break
                }

                case "Exit":
                    exit = true
                    log("Exiting...")
                    break

                default:
                    log("No valid action selected.")
                    break
            }
        } catch (err) {
            if (process.env.DEBUG) throw err
            log(err)
        }
    }
})()
async function resetDb(pool: Pool) {
    await pool.query(
        ` 
        drop table if exists subscriptions;
        drop table if exists courses;
        drop table if exists students;

        drop table if exists _event_handler_bookmarks;
        drop table if exists events;
        `
    )
}
