import * as R from "ramda"

const MAX_LENGTH = 32

class EventType<T> {
    #value: T

    get value(): T {
        return this.#value
    }

    private constructor(value: T) {
        this.#value = value
    }

    public static create<T>(eventType: T): EventType<T> {
        if (eventType === undefined || eventType === null) throw new Error("eventType cannot be null")
        if (!R.is(String, eventType)) throw new Error("Sequence number needs to be a valid integer")

        if (R.length(eventType) > MAX_LENGTH) throw new Error(`Event type exceeds max length of ${MAX_LENGTH}`)
        return new EventType(eventType)
    }
}
