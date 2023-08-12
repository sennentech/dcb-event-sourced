import { StoredEsEvent } from "../../src/eventStore/EventStore"
import { SequenceNumber } from "../../src/eventStore/SequenceNumber"
import { Timestamp } from "../../src/eventStore/TimeStamp"

export class CourseCreatedEvent implements StoredEsEvent {
    public type: "courseCreated" = "courseCreated"
    public tags: { courseId: string }
    public data: { capacity: number }

    public sequenceNumber: SequenceNumber
    public timestamp: Timestamp

    constructor({ courseId, capacity }: { courseId: string; capacity: number }) {
        this.tags = { courseId }
        this.data = { capacity }
    }
}

export class CourseCapacityChangedEvent implements StoredEsEvent {
    type: "courseCapacityChanged" = "courseCapacityChanged"
    public tags: { courseId: string }
    public data: { newCapacity: number }

    public sequenceNumber: SequenceNumber
    public timestamp: Timestamp

    constructor({ courseId, newCapacity }: { courseId: string; newCapacity: number }) {
        this.tags = { courseId }
        this.data = { newCapacity }
    }
}

export class StudentSubscribedEvent implements StoredEsEvent {
    type: "studentSubscribed" = "studentSubscribed"
    public tags: { courseId: string; studentId: string }
    public data: Record<string, never> = {}

    public sequenceNumber: SequenceNumber
    public timestamp: Timestamp

    constructor({ studentId, courseId }: { studentId: string; courseId: string }) {
        this.tags = { studentId, courseId }
    }
}

export class StudentUnsubscribedEvent implements StoredEsEvent {
    type: "studentUnsubscribed" = "studentUnsubscribed"
    public tags: { courseId: string; studentId: string }
    public data: Record<string, never> = {}

    public sequenceNumber: SequenceNumber
    public timestamp: Timestamp

    constructor({ studentId, courseId }: { studentId: string; courseId: string }) {
        this.tags = { studentId, courseId }
    }
}
