export class SequenceNumber {
    private internalValue: number

    get value(): number {
        return this.internalValue
    }

    private constructor(value: number) {
        this.internalValue = value
    }

    equals(otherSequenceNumber: SequenceNumber) {
        return this.internalValue === otherSequenceNumber.value
    }
    greaterThan(otherSequenceNumber: SequenceNumber) {
        return this.internalValue > otherSequenceNumber.value
    }
    lessThan(otherSequenceNumber: SequenceNumber) {
        return this.internalValue < otherSequenceNumber.value
    }
    greaterThanOrEqualTo(otherSequenceNumber: SequenceNumber) {
        return this.internalValue >= otherSequenceNumber.value
    }
    lessThanOrEqualTo(otherSequenceNumber: SequenceNumber) {
        return this.internalValue <= otherSequenceNumber.value
    }

    static create(sequenceNumber: number): SequenceNumber {
        if (sequenceNumber === undefined || sequenceNumber === null) throw new Error("Sequence number cannot be null")
        if (!Number.isInteger(sequenceNumber)) throw new Error("Sequence number needs to be a valid integer")
        if (sequenceNumber <= 0) throw new Error("Sequence number must be greater than 0")

        return new SequenceNumber(sequenceNumber)
    }
}
