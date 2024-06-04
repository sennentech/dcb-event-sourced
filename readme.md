# Dynamic Consistency Boundary Event Store for nodejs/typescript

Implementation of the Dynamic Consistency Boundary pattern for nodejs/typescript [described by Sara Pellegrini](https://sara.event-thinking.io/2023/04/kill-aggregate-chapter-1-I-am-here-to-kill-the-aggregate.html)

This repository contains the key core concepts (event-store and event-handling) as well as specific implementations of each of these against different backend persistence layers (currently only Postgres). There is also an example CLI application, following Sara's Course/Students example implemented using this pattern.

## Prerequisites

It is important to have an understanding of the concepts of event-sourcing and projections before you start. Additionally read the article series above from Sara. An understanding of Domain Driven Design concepts such as the Aggregate (though we pretty much eliminate this here), Entities and Consistency Boundaries will help.

## Concepts

The concept of the event-store and event-handling libraries are to allow the following:

-   Querying the event-store in a Command Handler prior to determine if the system is in a valid state to append new events.
-   Publishing new events to the event-store, while guaranteeing no _relevant_ events have been added in the meantime (avoiding race conditions).
-   Enable a registry of Event Handlers (e.g. Projections, Process Managers) to update state or take other actions based on events. These can be updated synchronously with event publishes if required, avoiding the complexities of eventual consistency.

## Event shape and streams

In traditional Event Sourcing, each event is stored in a Stream, which usually represents the Aggregate. However in DCB Event Sourcing, the Aggregate is pretty much eliminated, and the streams are more dynamic, and governed by the _event types_ and _tags_. In Sara's examples, she describes each event having a _type_ and _domain IDs_. However here we have generalised the _domain IDs_ to _tags_, but the idea is the same.

So each event has a _type_ and a set of _tags_, as well as _data_:

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

When event(s) are appended to the store, a second parameter "AppendCondition" can be supplied. This can optionally contain an array of queries that were used to build any write models, as well as the _last sequence number seen_. This is to ensure no new _relevant_ events were added in a race condition that would invalidate the append.

The library greatly simplifies the management of these concepts, and it is best explained with some examples.

## Examples

For clarity, the examples here all involve the same domain as outlined in Sara's concepts.

### Command Handler

An example of a command handler to register a new course is outlined below in its simplest form. This involves a Write Model to check that a Course with the same ID does not already exist prior to publishing a new event:

#### Event

Let's introduce our first event, implemented as a class here (class is an optional approach). It takes a _courseId_, _title_ and _capacity_ in the constructor.

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

The write model is an _EventHandlerWithState_ is an object that defines what events are of interest, what the default state should be and how any event seen by the handler affect that state.

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

In this example, the `append` would fail if another user created a course with the ID `course-1234` _after_ the reconsitute of the WriteModel but _before_ the append.

This is one of the guarantees the library provides.

## Contribution

Contributions in the form of [issues](https://github.com/sennentech/dcb-event-sourced/issues), [pull requests](https://github.com/sennentech/dcb-event-sourced/pulls) or [discussions](https://github.com/sennentech/dcb-event-sourced/discussions) are appreciated.

## License

Licensed under an [MIT license](./LICENSE.md)
