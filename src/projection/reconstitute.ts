import * as R from "ramda"
import { AppendCondition, EsQuery, EventStore } from "../eventStore/EventStore"
import { Projection } from "./Projection"
import { SequenceNumber } from "../eventStore/SequenceNumber"

type Projections = Record<string, Projection>
type ProjectionStates<T extends Projections> = {
    [K in keyof T]: T[K]["init"]
}

export async function reconstitute<T extends Projections>(
    eventStore: EventStore,
    projections: T
): Promise<{ states: ProjectionStates<T>; appendCondition: AppendCondition }> {
    const states = R.map(R.prop("init"), projections) as ProjectionStates<T>

    const query: EsQuery = {
        criteria: R.values(R.map(proj => ({ tags: proj.tags, eventTypes: R.keys(proj.when) as string[] }), projections))
    }
    const fromSequenceNumber = SequenceNumber.first()

    let highestSeqNoSeen = SequenceNumber.first()
    for await (const eventEnvelope of eventStore.read(query, fromSequenceNumber)) {
        for (const [stateKey, projection] of R.toPairs(projections)) {
            const { event, sequenceNumber } = eventEnvelope
            const handler = R.has(event.type, projection.when) ? projection.when[event.type] : R.identity

            states[stateKey] = await handler(states[stateKey], eventEnvelope)
            if (sequenceNumber > highestSeqNoSeen) highestSeqNoSeen = sequenceNumber
        }
    }

    return { states, appendCondition: { query, maxSequenceNumber: highestSeqNoSeen } }
}
