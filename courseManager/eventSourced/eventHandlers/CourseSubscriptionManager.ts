// import { PartitionedStateEventHandler } from "../../eventHandling/src/EventHandler"
// import {
//     CourseCapacityWasChangedEvent,
//     CourseWasCreatedEvent,
//     StudentWasSubscribedEvent,
//     StudentWasUnsubscribedEvent
// } from "../events"
// import * as R from "ramda"
// import { Course } from "../readModel/readModels"

// export interface CourseSubscriptionRepository {
//     remove(courseId: string, studentId: string): void
//     add(courseId: string, studentId: string): void
// }

// export interface CourseSubscription {
//     courseId: string
//     studentId: string
// }

// export const PersistentPartitionedCourse = (
//     repository: CourseSubscriptionRepository
// ): PartitionedStateEventHandler<{
//     state: CourseSubscription
//     eventHandlers: StudentWasSubscribedEvent | StudentWasUnsubscribedEvent
// }> => ({
//     init: null,

//     partitionByTags: ({ courseId, studentId }) => `${courseId}-${studentId}`,
//     when: {
//         studentWasSubscribed: async ({ event: { data: { courseId, studentID }}}) => {
//             repository.add(courseId, studentId)
//             return {
//                 courseId: ev.event.data.courseId,
//                 studentId: ev.event.data.studentId
//             }
//         }
//         studentWasUnSubscribed: async ({ event: {courseId, studentId} }, ) => {
//             await repository.remove(courseId, studentId)
//         }
//     },
//     stateManager: {
//         read: async courseId => {
//             return repository.findById(courseId)
//         },
//         save: async (courseId, course) => {
//             repository.save(courseId, course)
//         }
//     }
// })
