import { Pool, PoolConfig } from "pg"
import { PostgresEventStore } from "../../eventStore/postgresEventStore/PostgresEventStore"
import { PostgresTransactionManager } from "./PostgresTransactionManager"
import { EventHandler } from "../EventHandler"
import { PostgresEventHandlerRegistry } from "./PostgresEventHandlerRegistry"

type PostgresHandlerClassConstructor = new (transactionManager: PostgresTransactionManager) => EventHandler
type PostgresHandlerFunctionConstructor = (transactionManager: PostgresTransactionManager) => EventHandler

export const assemblePostgresBundle = async (
    postgresConfig: PoolConfig,
    handlerTypes: Record<string, PostgresHandlerClassConstructor | PostgresHandlerFunctionConstructor>
) => {
    const pool = new Pool(postgresConfig)
    const eventStore = new PostgresEventStore(pool)
    await eventStore.install()

    const transactionManager = new PostgresTransactionManager(pool)
    const handlers = Object.entries(handlerTypes).reduce((acc, [key, HandlerType]) => {
        acc[key] =
            typeof HandlerType === "function"
                ? (<PostgresHandlerFunctionConstructor>HandlerType)(transactionManager)
                : new (<PostgresHandlerClassConstructor>HandlerType)(transactionManager)
        return acc
    }, {})

    const handlerRegistry = new PostgresEventHandlerRegistry(transactionManager, handlers)
    await handlerRegistry.install()

    return {
        pool,
        eventStore: new PostgresEventStore(pool),
        handlerRegistry
    }
}
