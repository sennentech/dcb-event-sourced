import { DcbEvent } from "@dcb-es/event-store"

export class CourseWasRegisteredEvent implements DcbEvent {
    public type: "courseWasRegistered" = "courseWasRegistered"
    public tags: { courseId: string }
    public data: { capacity: number }
    public metadata: Record<string, never> = {}

    constructor({ courseId, capacity }: { courseId: string; capacity: number }) {
        this.tags = { courseId }
        this.data = { capacity }
    }
}

export class CourseCapacityWasChangedEvent implements DcbEvent {
    type: "courseCapacityWasChanged" = "courseCapacityWasChanged"
    public tags: { courseId: string }
    public data: { newCapacity: number }
    public metadata: Record<string, never> = {}

    constructor({ courseId, newCapacity }: { courseId: string; newCapacity: number }) {
        this.tags = { courseId }
        this.data = { newCapacity }
    }
}

export class StudentWasSubscribedEvent implements DcbEvent {
    type: "studentWasSubscribed" = "studentWasSubscribed"
    public tags: { courseId: string; studentId: string }
    public data: Record<string, never> = {}
    public metadata: Record<string, never> = {}

    constructor({ studentId, courseId }: { studentId: string; courseId: string }) {
        this.tags = { studentId, courseId }
    }
}

export class StudentWasUnsubscribedEvent implements DcbEvent {
    type: "studentWasUnsubscribed" = "studentWasUnsubscribed"
    public tags: { courseId: string; studentId: string }
    public data: Record<string, never> = {}
    public metadata: Record<string, never> = {}

    constructor({ studentId, courseId }: { studentId: string; courseId: string }) {
        this.tags = { studentId, courseId }
    }
}
