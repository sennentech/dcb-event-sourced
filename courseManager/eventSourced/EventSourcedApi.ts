import { reconstitute } from "../../eventHandling/src/reconstitute"
import { EventStore } from "../../eventStore/src/EventStore"
import { Api } from "../Api"
import { CourseSubscriptionRepository } from "../repository/Repositories"
import { CourseWasCreatedEvent, StudentWasRegistered, StudentWasSubscribedEvent } from "./Events"
import { PublishEvent } from "./PublishEvent"
import { CourseCapacity } from "./writeModels/CourseCapacity"
import { CourseExists } from "./writeModels/CourseExists"
import { StudentAlreadySubscribed } from "./writeModels/StudentAlreadySubscribed"
import { StudentAlreadyRegistered } from "./writeModels/StudentExists"
import { StudentSubscriptions } from "./writeModels/StudentSubscriptions"

export const EventSourcedApi =
    (eventStore: EventStore, repository: CourseSubscriptionRepository) => async (): Promise<Api> => {
        const publishEvent = PublishEvent(eventStore, {})
        return {
            findCourseById: async (courseId: string) => repository.findCourseById(courseId),
            findStudentById: async (studentId: string) => repository.findStudentById(studentId),
            registerCourse: async (id: string, capacity: number) => {
                const {
                    states: { courseExists },
                    appendCondition
                } = await reconstitute(eventStore, {
                    courseExists: CourseExists(id)
                })

                if (courseExists) throw new Error(`Course with id ${id} already exists`)
                await publishEvent(new CourseWasCreatedEvent({ courseId: id, capacity }), appendCondition)
            },
            registerStudent: async (id: string, name: string) => {
                const {
                    states: { studentAlreadyRegistered },
                    appendCondition
                } = await reconstitute(eventStore, {
                    studentAlreadyRegistered: StudentAlreadyRegistered(id)
                })

                if (!studentAlreadyRegistered) throw new Error(`Student with id ${id} already registered.`)
                publishEvent(new StudentWasRegistered({ studentId: id }), appendCondition)
            },
            subscribeStudentToCourse: async (courseId: string, studentId: string) => {
                const {
                    states: { courseExists, courseCapacity, studentAlreadySubscribed, studentSubscriptions },
                    appendCondition
                } = await reconstitute(eventStore, {
                    courseExists: CourseExists(courseId),
                    courseCapacity: CourseCapacity(courseId),
                    studentAlreadySubscribed: StudentAlreadySubscribed({
                        courseId: courseId,
                        studentId: studentId
                    }),
                    studentSubscriptions: StudentSubscriptions(studentId)
                })

                if (!courseExists) throw new Error(`Course doesn't exist.`)
                if (courseCapacity.isFull) throw new Error(`Course is at capacity.`)
                if (studentAlreadySubscribed) throw new Error(`Student already subscribed to course.`)
                if (studentSubscriptions.maxedOut)
                    throw new Error(`Student is already subscribed to the maximum number of courses`)

                await publishEvent(new StudentWasSubscribedEvent({ courseId, studentId }), appendCondition)
            }
        }
    }
