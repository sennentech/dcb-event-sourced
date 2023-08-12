export class SequenceNumber {
    #value: number

    get value(): number {
        return this.#value
    }

    private constructor(value: number) {
        this.#value = value
    }

    equals(otherSequenceNumber: SequenceNumber) {
        return this.#value === otherSequenceNumber.value
    }
    greaterThan(otherSequenceNumber: SequenceNumber) {
        return this.#value > otherSequenceNumber.value
    }
    lessThan(otherSequenceNumber: SequenceNumber) {
        return this.#value < otherSequenceNumber.value
    }
    greaterThanOrEqualTo(otherSequenceNumber: SequenceNumber) {
        return this.#value >= otherSequenceNumber.value
    }
    lessThanOrEqualTo(otherSequenceNumber: SequenceNumber) {
        return this.#value <= otherSequenceNumber.value
    }

    static create(sequenceNumber: number): SequenceNumber {
        if (sequenceNumber === undefined || sequenceNumber === null) throw new Error("Sequence number cannot be null")
        if (!Number.isInteger(sequenceNumber)) throw new Error("Sequence number needs to be a valid integer")
        if (sequenceNumber <= 0) throw new Error("Sequence number must be greater than 0")

        return new SequenceNumber(sequenceNumber)
    }

    static first(): SequenceNumber {
        return SequenceNumber.create(1)
    }
}