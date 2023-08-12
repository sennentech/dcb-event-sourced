import { StoredEsEvent } from "../EventStore"

export const streamAllEventsToArray = async (generator: AsyncGenerator<StoredEsEvent>): Promise<StoredEsEvent[]> => {
    const results = []
    let done = false
    while (!done) {
        const next = await generator.next()
        if (next.value) {
            results.push(next.value)
        }
        done = next.done
    }
    return results
}
