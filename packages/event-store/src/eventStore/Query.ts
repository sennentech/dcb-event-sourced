import { Tags } from "./Tags"

export interface QueryItem {
    tags?: Tags
    eventTypes?: string[]
}

export class Query {
    #items: QueryItem[]
    #isAll: boolean

    private constructor(queryItems: QueryItem[] | "All") {
        if (queryItems !== "All") {
            if (!Array.isArray(queryItems) || queryItems.length === 0) {
                throw new Error("Query must be 'All' or a non-empty array of QueryItems")
            }
        }
        this.#isAll = queryItems === "All"
        this.#items = queryItems === "All" ? [] : queryItems
    }

    static all() {
        return new Query("All")
    }

    static fromItems(queryItems: QueryItem[]) {
        return new Query(queryItems)
    }

    get items() {
        return this.#items
    }

    get isAll() {
        return this.#isAll
    }
}
