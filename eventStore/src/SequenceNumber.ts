export class SequenceNumber {
    #value: number

    get value(): number {
        return this.#value
    }

    private constructor(value: number) {
        this.#value = value
    }

    [Symbol.toPrimitive]() {
        return this.#value
    }

    valueOf(): number {
        return this.#value
    }

    inc(): SequenceNumber {
        return SequenceNumber.create(this.#value + 1)
    }

    plus(value: number): SequenceNumber {
        return SequenceNumber.create(this.#value + value)
    }

    static create(sequenceNumber: number): SequenceNumber {
        if (sequenceNumber === undefined || sequenceNumber === null) throw new Error("Sequence number cannot be null")
        if (!Number.isInteger(sequenceNumber)) throw new Error("Sequence number needs to be a valid integer")
        if (sequenceNumber < 0) throw new Error("Sequence number must be greater than 0")

        return new SequenceNumber(sequenceNumber)
    }

    static zero(): SequenceNumber {
        return SequenceNumber.create(0)
    }
}
