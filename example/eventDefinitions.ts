import { EsEvent } from "../src/EventStore"

export class CourseCreatedEvent implements EsEvent {
    type: "courseCreated" = "courseCreated"
    public domainIds: Array<{ courseId: string }>
    public data: { capacity: number }

    constructor({ courseId, capacity }: { courseId: string; capacity: number }) {
        this.domainIds = [{ courseId }]
        this.data = { capacity }
    }
}

export class CourseCapacityChangedEvent implements EsEvent {
    type: "courseCapacityChanged" = "courseCapacityChanged"
    public domainIds: Array<{ courseId: string }>
    public data: { newCapacity: number }

    constructor({ courseId, newCapacity }: { courseId: string; newCapacity: number }) {
        this.domainIds = [{ courseId }]
        this.data = { newCapacity }
    }
}

export class StudentSubscribedEvent implements EsEvent {
    type: "studentSubscribed" = "studentSubscribed"
    public domainIds: Array<{ courseId: string; studentId: string }>
    public data: Record<string, never> = {}

    constructor({ studentId, courseId }: { studentId: string; courseId: string }) {
        this.domainIds = [{ studentId, courseId }]
    }
}

export class StudentUnsubscribedEvent implements EsEvent {
    type: "studentUnsubscribed" = "studentUnsubscribed"
    public domainIds: Array<{ courseId: string; studentId: string }>
    public data: Record<string, never> = {}

    constructor({ studentId, courseId }: { studentId: string; courseId: string }) {
        this.domainIds = [{ studentId, courseId }]
    }
}
