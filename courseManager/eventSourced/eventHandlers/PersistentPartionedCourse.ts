// import { PartitionedStateEventHandler } from "../../eventHandling/src/EventHandler"
// import {
//     CourseCapacityWasChangedEvent,
//     CourseWasCreatedEvent,
//     StudentWasSubscribedEvent,
//     StudentWasUnsubscribedEvent
// } from "../events"
// import * as R from "ramda"

// export interface Course {
//     id: string
//     capacity: number
//     subscriptions: number
// }
// export interface CourseRepository {
//     findById(id: string): Course
//     save(id: string, course: Course): void
// }

// const courseWithSubCount = `select *, sum(s.*) from courses c join subscriptions s on c.id = s.courseId group by c.id`

// const projection = {
//     handlers: [
//         new PersistentPartitionedCourse(courseRepository),
//         new PersistentPartitionedCourseSubscription(subsctionrepo),
//         new PersistentPartitionedStudentSubscription(studentRepo)
//     ],
//     replay(...)
// }

// export const PersistentPartitionedCourse = (
//     repository: CourseRepository
// ): PartitionedStateEventHandler<{
//     state: Course
//     eventHandlers: CourseWasCreatedEvent | CourseCapacityWasChangedEvent
// }> => ({
//     init: { id: undefined, capacity: 0, subscriptions: 0 },
//     when: {
//         courseWasCreated: async ({ event }, { subscriptions }) => {
//             return {
//                 id: event.tags.courseId,
//                 capacity: event.data.capacity,
//                 subscriptions
//             }
//         },
//         courseCapacityWasChanged: async ({ event }, course) => {
//             return R.assoc("capacity", event.data.newCapacity, course)
//         }
//     }
// })

// const fullCourseManagerProjection = {
//     when: {
//         courseWasCreated: async ({ event }) =>
//             await repository.insertCourse(event.data),

//         courseCapacityWasChanged: async ({ event }) => {
//             const course = await repository.findById(event.tags.courseId)
//             course.capacity = event.data.newCapacity

//         },
//         studentWasSubscribedEvent: async ({ event }) =>
//             await repository.addSubscription(event.data),
//         studentWasUnsubscriptedSubscribedEvent: async ({ event }) =>  {
//             await repository.removeSubscription(event.data)
//         }

//     }

// }

// /*

// type     HandlesEvents   StoresCheckpoints    Replayable    PersistedState   supportsInit    "eventHandler"
// writeModel      yes            no                 yes          no                yes          no
// cachedWriteModel yes           yes                yes          yes               yes          no
// emailOnSignup   yes            yes                no           no                no           yes
// emailCourseStudents yes        yes                no           yes               yes          yes
// courseReadModel    yes         yes                yes          yes               no           yes

// Action:
// - Remove partition state handler
// - Combine into one repository
// - Create the read model projection to update via repository, storing checkpoint last seen
// - Create command handlers to publish new events with constraint checks

// */
