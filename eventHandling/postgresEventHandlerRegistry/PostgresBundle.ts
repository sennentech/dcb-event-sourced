import { Pool, PoolConfig } from "pg"
import { PostgresEventStore } from "../../eventStore/postgresEventStore/PostgresEventStore"
import { PostgresTransactionManager } from "./PostgresTransactionManager"

export const PostgresBundle = async (postgresConfig: PoolConfig) => {
    const pool = new Pool(postgresConfig)
    const eventStore = new PostgresEventStore(pool)
    await eventStore.install()

    return {
        pool,
        eventStore: new PostgresEventStore(pool),
        transactionManager: new PostgresTransactionManager(pool)
    }
}
