import { EsEvent } from "@dcb-es/event-store"

export class CourseWasRegisteredEvent implements EsEvent {
    public type: "courseWasRegistered" = "courseWasRegistered"
    public tags: { courseId: string }
    public data: { capacity: number }

    constructor({ courseId, capacity }: { courseId: string; capacity: number }) {
        this.tags = { courseId }
        this.data = { capacity }
    }
}

export class CourseCapacityWasChangedEvent implements EsEvent {
    type: "courseCapacityWasChanged" = "courseCapacityWasChanged"
    public tags: { courseId: string }
    public data: { newCapacity: number }

    constructor({ courseId, newCapacity }: { courseId: string; newCapacity: number }) {
        this.tags = { courseId }
        this.data = { newCapacity }
    }
}

export class StudentWasSubscribedEvent implements EsEvent {
    type: "studentWasSubscribed" = "studentWasSubscribed"
    public tags: { courseId: string; studentId: string }
    public data: Record<string, never> = {}

    constructor({ studentId, courseId }: { studentId: string; courseId: string }) {
        this.tags = { studentId, courseId }
    }
}

export class StudentWasUnsubscribedEvent implements EsEvent {
    type: "studentWasUnsubscribed" = "studentWasUnsubscribed"
    public tags: { courseId: string; studentId: string }
    public data: Record<string, never> = {}

    constructor({ studentId, courseId }: { studentId: string; courseId: string }) {
        this.tags = { studentId, courseId }
    }
}
