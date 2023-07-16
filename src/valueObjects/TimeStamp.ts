import { ValueObject } from "./ValueObject"
import { DateTime } from "luxon"

interface TimestampProps {
    value: string
}

export class Timestamp extends ValueObject<TimestampProps> {
    get toISO(): string {
        return this.props.value
    }

    private constructor(props: TimestampProps) {
        super(props)
    }

    public static now(): Timestamp {
        return new Timestamp({ value: DateTime.utc().toISO() })
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
        return new Timestamp({ value: timestamp })
    }
}
