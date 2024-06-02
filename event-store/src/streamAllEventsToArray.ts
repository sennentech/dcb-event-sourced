import { EsEventEnvelope } from "./EventStore"

export const streamAllEventsToArray = async (
    generator: AsyncGenerator<EsEventEnvelope>
): Promise<EsEventEnvelope[]> => {
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
