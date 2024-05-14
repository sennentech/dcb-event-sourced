import { SequenceNumber } from "../../eventStore/SequenceNumber"

export interface EventHandlerLockManager {
    obtainLock(): Promise<SequenceNumber>
    commitAndRelease(sequenceNumber: SequenceNumber): Promise<void>
    rollbackAndRelease(): Promise<void>
}
