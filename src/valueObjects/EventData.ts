export class EventData {
    #value: any

    get value(): any {
        return this.#value
    }

    private constructor(value: string) {
        this.#value = value
    }

    public static create(eventType: string): EventData {
        return new EventData(eventType)
    }
}
