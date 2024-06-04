# Dynamic Consistency Boundary Event Store for nodejs/typescript

Implementation of the Dynamic Consistency Boundary pattern for nodejs/typescript [described by Sara Pellegrini](https://sara.event-thinking.io/2023/04/kill-aggregate-chapter-1-I-am-here-to-kill-the-aggregate.html)

This repository contains the key concepts (event-store and event-handling) as well as specific implementations of each of these against different backend persistence layers (currently only Postgres). There is also an example CLI application, following Sara's Course/Students example implemented using this pattern.

## Prerequisites

It is important to have an understanding of the concepts of event-sourcing and projections before you start. Additionally read the article series above from Sara. An understanding of Domain Driven Design concepts such as the Aggregate (though we pretty much eliminate this here), Entities and Consistency Boundaries will help.

## Purpose

The purpose of the event-store and event-handling libraries are to allow the following:

-   Querying the event-store in a Command Handler prior to appending events to determine if the system is in a valid state.
-   Publishing new events to the event-store, while guaranteeing no _relevant_ events have been added in the meantime (avoids race conditions).
-   Enable a registry of Event Handlers (e.g. Projections, Process Managers) to update state or take other actions based on events. These can be updated synchronously with event publishes if required, avoiding the complexities of eventual consistency.

## Event shape and streams

In traditional Event Sourcing, each event is stored in a Stream, which usually represents the Aggregate. However in DCB Event Sourcing, the Aggregate is pretty much eliminated, and the streams are dynamic, governed by the _event types_ and _tags_. In Sara's examples, she describes each event having a _type_ and _domain IDs_. However, here we have given the _domain IDs_ the name _tags_, but the idea is the same.

Each event has a _type_ and a set of _tags_, as well as _data_:

```typescript
const event: EsEvent = {
    type: "courseWasRegistered",
    tags: { courseId: "course-1234" },
    data: {
        title: "My course title",
        capacity: 10
    }
}
```

When returned from an event-store, these are wrapped in an EventEnvelope:

```typescript
//Note typically you will never instantiate an EsEventEnvelope as they are returned from the store
const eventEnvelope: EsEventEnvelope = {
    sequenceNumber: 1234,
    timestamp: "2024-06-04T20:59:00Z",
    event: {
        type: "courseWasRegistered",
        tags: { courseId: "course-1234" },
        data: {
            title: "My course title",
            capacity: 10
        }
    }
}
```

# Queries

The Event Store can be queried by event type and tags, e.g.:

```typescript
const esQuery = { eventTypes: ["courseWasRegistered"], tags: { courseId: "course-1234" } }
for await (const eventEnvelope of eventStore.read(query)) {
    console.log(eventEnvelope)
}
```

# Appending events

When event(s) are appended to the store, a second parameter, an _AppendCondition_ can be supplied. This can contain an array of queries that were used to build any write models, as well as the _last sequence number seen_. This will ensure no new _relevant_ events are added in a race condition that would invalidate the append.

The library greatly simplifies the management of these concepts, and it is best explained with some examples.

## Examples

### Command Handler

An example of a command handler to register a new course is outlined below in its simplest form. This involves a Write Model to check that a Course with the same ID does not already exist prior to publishing a new event:

#### Event

Let's introduce an event, implemented as a class here (class is an optional approach). It takes a _courseId_, _title_ and _capacity_ in the constructor.

```typescript
export class CourseWasRegisteredEvent implements EsEvent {
    public type: "courseWasRegistered" = "courseWasRegistered"
    public tags: { courseId: string }
    public data: { title: string; capacity: number }

    constructor({ courseId, title, capacity }: { courseId: string; title: string; capacity: number }) {
        this.tags = { courseId }
        this.data = { title, capacity }
    }
}
```

#### Write model

The write model (_EventHandlerWithState_) is an object that defines what events are of interest, what the default state should be and how any event seen by the handler affect that state.

This example _WriteModel_ is interested only in _courseWasRegistered_ event for courses with Id `course-1234`. The handler has a "default state" (_init_) of `false` (doesn't exist). Everytime a _courseWasRegistered_ is received, this state is changed to `true`.

```typescript
const courseExists = (
    courseId: string
): EventHandlerWithState<{
    state: boolean
    tagFilter: { courseId: string }
    eventHandlers: CourseWasRegisteredEvent
}> => ({
    tagFilter: { courseId: "course-1234" },
    init: false,
    when: {
        courseWasRegistered: async () => true
    }
})
```

For convenenience, we can wrap the construction of this _WriteModel_ in a closure, passing in the _tags_ to filter (e.g. `courseId`):

```typescript
export const CourseExists = (
    courseId: string
): EventHandlerWithState<{
    state: boolean
    tagFilter: { courseId: string }
    eventHandlers: CourseWasRegisteredEvent
}> => ({
    tagFilter: { courseId },
    init: false,
    when: {
        courseWasRegistered: async () => true
    }
})

const courseExists = CourseExists("course-1234")
```

#### Command handler example:

We can use our _reconsitute_ function to rebuild the _WriteModel_, check its state and append the events:

```typescript
const registerCourseCommandHandler = async (course: { id: string; title: string; capacity: number }) => {
    const { id, title, capacity } = course
    const { state, appendCondition } = await reconstitute(eventStore, {
        courseExists: CourseExists(id)
    })

    if (state.courseExists) throw new Error(`Course with id ${id} already exists`)

    try {
        await eventStore.append(new CourseWasRegisteredEvent({ courseId: id, title, capacity }), appendCondition)
    } catch (err) {
        //Check error and retry/report in case of a race condition
    }
}
```

The `reconsitute` function m

In this example, the `append` would fail if another user created a course with the ID `course-1234` _after_ the reconsitute of the WriteModel but _before_ the append.

This is one of the guarantees the library provides.

#### Multiple WriteModels

Often you will have multiple checks to do. We advise you separate each of these checks into small, granular _WriteModels_ each with its dedicated purpose.

For example here is another _WriteModel_ to check the existing capacity of a course:

```typescript
export const CourseCapacity = (
    courseId: string
): EventHandlerWithState<{
    state: { subscriberCount: number; capacity: number }
    eventHandlers:
        | CourseWasRegisteredEvent
        | CourseCapacityWasChangedEvent
        | StudentWasSubscribedEvent
        | StudentWasUnsubscribedEvent
}> => ({
    tagFilter: { courseId },
    init: { subscriberCount: 0, capacity: 0 },
    when: {
        courseWasRegistered: ({ event }) => ({
            isFull: event.data.capacity === 0,
            capacity: event.data.capacity,
            subscriberCount: 0
        }),
        courseCapacityWasChanged: ({ event }, { subscriberCount }) => ({
            subscriberCount,
            capacity: event.data.newCapacity
        }),
        studentWasSubscribed: (_eventEnvelope, { capacity, subscriberCount }) => ({
            subscriberCount: subscriberCount + 1,
            capacity
        }),
        studentWasUnsubscribed: (eventEnvelope, { capacity, subscriberCount }) => ({
            subscriberCount: subscriberCount - 1,
            capacity
        })
    }
})
```

This model handles 4 different types of events, and is filtered to `courseId` as well.

The command handler to subscribe a student might check for both existence of the course, and to check there is remaining capacity:

```typescript
const subscribeStudentToCourse: async ({ courseId, studentId }) => {
    const { state, appendCondition } = await reconstitute(eventStore, {
        courseExists: CourseExists(courseId),
        courseCapacity: CourseCapacity(courseId)
    })

    if (!state.courseExists) throw new Error(`Course ${courseId} doesn't exist.`)

    if (state.courseCapacity.subscriberCount >= state.courseCapacity.capacity)
        throw new Error(`Course ${courseId} is full.`)

    try {
        await eventStore.append({ courseId, studentId }), appendCondition)
    } catch (err) {
        //Check error and retry/report in case of a race condition
    }
}
```

In this case the library still guarantees there will be no events that affect _any_ of the relevant _WriteModels_.

## Contribution

Contributions in the form of [issues](https://github.com/sennentech/dcb-event-sourced/issues), [pull requests](https://github.com/sennentech/dcb-event-sourced/pulls) or [discussions](https://github.com/sennentech/dcb-event-sourced/discussions) are appreciated.

## License

Licensed under an [MIT license](./LICENSE.md)

```

```
