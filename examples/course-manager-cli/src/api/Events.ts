import { DcbEvent } from "@dcb-es/event-store"

export class CourseWasRegisteredEvent implements DcbEvent {
    public type: "courseWasRegistered" = "courseWasRegistered"
    public tags: { courseId: string }
    public data: { title: string; capacity: number }
    public metadata: unknown = {}

    constructor({ courseId, title, capacity }: { courseId: string; title: string; capacity: number }) {
        this.tags = { courseId }
        this.data = { title, capacity }
    }
}

export class StudentWasRegistered implements DcbEvent {
    public type: "studentWasRegistered" = "studentWasRegistered"
    public tags: { studentId: string }
    public data: { name: string; studentNumber: number }
    public metadata: unknown = {}

    constructor({ studentId, name, studentNumber }: { studentId: string; name: string; studentNumber: number }) {
        this.tags = { studentId }
        this.data = { name, studentNumber }
    }
}

export class CourseCapacityWasChangedEvent implements DcbEvent {
    type: "courseCapacityWasChanged" = "courseCapacityWasChanged"
    public tags: { courseId: string }
    public data: { newCapacity: number }
    public metadata: unknown = {}

    constructor({ courseId, newCapacity }: { courseId: string; newCapacity: number }) {
        this.tags = { courseId }
        this.data = { newCapacity }
    }
}

export class CourseTitleWasChangedEvent implements DcbEvent {
    type: "courseTitleWasChanged" = "courseTitleWasChanged"
    public tags: { courseId: string }
    public data: { newTitle: string }
    public metadata: unknown = {}

    constructor({ courseId, newTitle }: { courseId: string; newTitle: string }) {
        this.tags = { courseId }
        this.data = { newTitle }
    }
}

export class StudentWasSubscribedEvent implements DcbEvent {
    type: "studentWasSubscribed" = "studentWasSubscribed"
    public tags: { courseId: string; studentId: string }
    public data: Record<string, never> = {}
    public metadata: unknown = {}

    constructor({ studentId, courseId }: { studentId: string; courseId: string }) {
        this.tags = { studentId, courseId }
    }
}

export class StudentWasUnsubscribedEvent implements DcbEvent {
    type: "studentWasUnsubscribed" = "studentWasUnsubscribed"
    public tags: { courseId: string; studentId: string }
    public data: Record<string, never> = {}
    public metadata: unknown = {}

    constructor({ studentId, courseId }: { studentId: string; courseId: string }) {
        this.tags = { studentId, courseId }
    }
}
