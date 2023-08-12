import { DateTime } from "luxon"

export class Timestamp {
    get toISO(): string {
        return this.value
    }

    private constructor(private value: string) {}

    public static now(): Timestamp {
        return new Timestamp(DateTime.utc().toISO())
    }

    public static isValid(timestamp: string) {
        try {
            Timestamp.create(timestamp)
            return true
        } catch (err) {
            return false
        }
    }

    public static create(timestamp: string): Timestamp {
        if (timestamp === undefined || timestamp === null) throw new Error("Timestamp cannot be null")
        if (!DateTime.fromISO(timestamp).valid()) throw new Error("Invalid timestamp")
        return new Timestamp(timestamp)
    }
}
