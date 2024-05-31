import { SequenceNumber } from "../eventStore/SequenceNumber"
import { EventHandler } from "./EventHandler"

export type HandlerCheckPoints = Record<string, SequenceNumber>
export interface EventHandlerRegistry {
    handlers: Record<string, EventHandler>
    install(): Promise<void>
    lockHandlers(): Promise<HandlerCheckPoints>
    commitAndRelease(progress: HandlerCheckPoints): Promise<void>
    rollbackAndRelease(): Promise<void>
}
