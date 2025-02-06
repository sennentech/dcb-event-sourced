import { EventEnvelope } from "./EventStore"

export const streamAllEventsToArray = async (
    generator: AsyncGenerator<EventEnvelope>
): Promise<EventEnvelope[]> => {
    const results: EventEnvelope[] = []
    let done: boolean | undefined = false
    while (!done) {
        const next = await generator.next()
        if (next.value) {
            results.push(next.value)
        }
        done = next.done
    }
    return results
}
