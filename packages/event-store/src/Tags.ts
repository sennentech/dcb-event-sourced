const validateTagValues = (values: string[]): void => {
    const regex = /^[A-Za-z0-9-]+=[A-Za-z0-9-]+$/
    values.forEach(val => {
        if (!regex.test(val)) throw new Error(`Invalid tag value: ${val}`)
    })
}

export class Tags {
    #value: string[]

    private constructor(value: string[]) {
        this.#value = value
    }

    public get values(): string[] {
        return this.#value
    }

    public get length(): number {
        return this.#value.length
    }

    public equals = (other: Tags): boolean =>
        this.#value.length === other.#value.length && this.#value.every((val, idx) => val === other.#value[idx])

    public static from(values: string[]): Tags {
        validateTagValues(values)
        return new Tags(values)
    }

    public static fromObj(obj: Record<string, string>): Tags {
        if (!obj || Object.keys(obj).length === 0)
            throw new Error("Empty object is not valid for fromObj factory method")

        const values = Object.keys(obj).map(key => `${key}=${obj[key]}`)
        validateTagValues(values)
        return new Tags(values)
    }

    public static createEmpty(): Tags {
        return new Tags([])
    }
}
