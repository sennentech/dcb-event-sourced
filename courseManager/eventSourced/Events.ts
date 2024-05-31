import { EsEvent } from "../../eventStore/EventStore"

export class CourseWasRegisteredEvent implements EsEvent {
    public type: "courseWasRegistered" = "courseWasRegistered"
    public tags: { courseId: string }
    public data: { title: string; capacity: number }

    constructor({ courseId, title, capacity }: { courseId: string; title: string; capacity: number }) {
        this.tags = { courseId }
        this.data = { title, capacity }
    }
}

export class StudentWasRegistered implements EsEvent {
    public type: "studentWasRegistered" = "studentWasRegistered"
    public tags: { studentId: string }
    public data: { name: string; studentNumber: number }

    constructor({ studentId, name, studentNumber }: { studentId: string; name: string; studentNumber: number }) {
        this.tags = { studentId }
        this.data = { name, studentNumber }
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

export class CourseTitleWasChangedEvent implements EsEvent {
    type: "courseTitleWasChanged" = "courseTitleWasChanged"
    public tags: { courseId: string }
    public data: { newTitle: string }

    constructor({ courseId, newTitle }: { courseId: string; newTitle: string }) {
        this.tags = { courseId }
        this.data = { newTitle }
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
