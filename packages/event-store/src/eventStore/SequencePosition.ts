export class SequencePosition {
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

    inc(): SequencePosition {
        return SequencePosition.create(this.#value + 1)
    }

    plus(value: number): SequencePosition {
        return SequencePosition.create(this.#value + value)
    }

    static create(sequencePosition: number): SequencePosition {
        if (sequencePosition === undefined || sequencePosition === null)
            throw new Error("Sequence number cannot be null")
        if (!Number.isInteger(sequencePosition)) throw new Error("Sequence number needs to be a valid integer")
        if (sequencePosition < 0) throw new Error("Sequence number must be greater than 0")

        return new SequencePosition(sequencePosition)
    }

    static zero(): SequencePosition {
        return SequencePosition.create(0)
    }
}
