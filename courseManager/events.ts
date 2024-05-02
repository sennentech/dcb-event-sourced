import { EsEvent } from "../eventStore/src/EventStore"

export class CourseCreatedEvent implements EsEvent {
    public type: "courseCreated" = "courseCreated"
    public tags: { courseId: string }
    public data: { capacity: number }

    constructor({ courseId, capacity }: { courseId: string; capacity: number }) {
        this.tags = { courseId }
        this.data = { capacity }
    }
}

export class CourseCapacityChangedEvent implements EsEvent {
    type: "courseCapacityChanged" = "courseCapacityChanged"
    public tags: { courseId: string }
    public data: { newCapacity: number }

    constructor({ courseId, newCapacity }: { courseId: string; newCapacity: number }) {
        this.tags = { courseId }
        this.data = { newCapacity }
    }
}

export class StudentSubscribedEvent implements EsEvent {
    type: "studentSubscribed" = "studentSubscribed"
    public tags: { courseId: string; studentId: string }
    public data: Record<string, never> = {}

    constructor({ studentId, courseId }: { studentId: string; courseId: string }) {
        this.tags = { studentId, courseId }
    }
}

export class StudentUnsubscribedEvent implements EsEvent {
    type: "studentUnsubscribed" = "studentUnsubscribed"
    public tags: { courseId: string; studentId: string }
    public data: Record<string, never> = {}

    constructor({ studentId, courseId }: { studentId: string; courseId: string }) {
        this.tags = { studentId, courseId }
    }
}
