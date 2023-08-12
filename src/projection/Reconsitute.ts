import { AppendCondition, EsQuery, EventStore } from "../eventStore/EventStore"
import { Projection, ProjectionDef } from "./Projection"
import * as R from "ramda"
import { SequenceNumber } from "../eventStore/SequenceNumber"

type ExtractStateType<T> = {
    [K in keyof T]: (T[K] extends Projection<ProjectionDef> ? T[K] : never)["init"]
}

export async function reconstitute<T extends Record<string, Projection<ProjectionDef>>>(
    eventStore: EventStore,
    projections: T
): Promise<{ states: ExtractStateType<T>; appendCondition: AppendCondition }> {
    const states = R.map(R.prop("init"), projections) // restore from snapshots if found

    const query: EsQuery = {
        criteria: R.values(R.map(proj => ({ tags: proj.tags, eventTypes: R.keys(proj.when) as string[] }), projections))
    }
    const fromSequenceNumber = SequenceNumber.create(1) //restore from lowest snapshots if found

    let highestSeqNoSeen = SequenceNumber.create(1)
    for await (const event of eventStore.read(query, fromSequenceNumber)) {
        for (const [stateKey, projection] of R.toPairs(projections) as [string, Projection<ProjectionDef>][]) {
            const handler = R.has(event.type, projection.when) ? projection.when[event.type] : R.identity
            states[stateKey] = await handler(states[stateKey], event)
            if (event.sequenceNumber.value > highestSeqNoSeen.value) highestSeqNoSeen = event.sequenceNumber
        }
    }

    return { states: states as ExtractStateType<T>, appendCondition: { query, maxSequenceNumber: highestSeqNoSeen } }
}
