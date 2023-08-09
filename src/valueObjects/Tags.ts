type TagPair = { key: string; value: string }

class Tags {
    #value: TagPair[]

    get value(): TagPair[] {
        return this.#value
    }

    private constructor(value: TagPair[]) {
        this.#value = value
    }

    public static create(tags: TagPair[]): Tags {
        return new Tags(tags)
    }
}
