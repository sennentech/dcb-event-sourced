import { ValueObject } from "./ValueObject"
import * as R from "ramda"

const MAX_LENGTH = 32
interface EventTypeProps {
    value: string
}

export class EventType extends ValueObject<EventTypeProps> {
    get value(): string {
        return this.props.value
    }

    private constructor(props: EventTypeProps) {
        super(props)
    }

    public static create(eventType: string): EventType {
        if (eventType === undefined || eventType === null) throw new Error("eventType cannot be null")
        if (!R.is(String, eventType)) throw new Error("Sequence number needs to be a valid integer")

        if (R.length(eventType) > MAX_LENGTH) throw new Error(`Event type exceeds max length of ${MAX_LENGTH}`)
        return new EventType({ value: eventType })
    }
}
