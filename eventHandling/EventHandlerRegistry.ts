import { PostgresMultiLockManager } from "./lockManager/PostgresMultiLockManager";

export class EventHandlerRegistry {
    constructor(private lockManager: LockManager) {

    }

    async obtainLocks() {
        
    }
}