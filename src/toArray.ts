import { EventEnvelope } from "./EventStore"

export const toArray = async (generator: AsyncGenerator<EventEnvelope>): Promise<EventEnvelope[]> => {
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
