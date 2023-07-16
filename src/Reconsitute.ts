import { EventStore } from "./EventStore"

export const reconstitute = async (eventStore: EventStore, ...projections: any) => ({
    states: <any>{},
    appendCondition: <any>{}
})
