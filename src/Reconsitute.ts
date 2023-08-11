import { EventStore } from "./EventStore"
import { Projection, ProjectionDef } from "./Projection"

type ExtractStateType<T> = {
    [K in keyof T]: (T[K] extends Projection<ProjectionDef> ? T[K] : never)["init"]
}

export async function reconstitute<T extends Record<string, Projection<ProjectionDef>>>(
    eventStore: EventStore,
    projections: T
): Promise<{ states: ExtractStateType<T>; appendCondition: any }> {
    // Implement the function as you need
    
    return { states: {} as ExtractStateType<T>, appendCondition: {} } // placeholder
}
