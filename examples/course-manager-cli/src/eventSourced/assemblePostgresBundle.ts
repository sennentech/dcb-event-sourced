import {
    PostgresHandlerClassConstructor,
    PostgresHandlerFunctionConstructor,
    PostgresTransactionManager,
    PostgresEventHandlerRegistry
} from "@dcb-es/event-handling-postgres"
import { PostgresEventStore } from "@dcb-es/event-store-postgres"
import { Pool, PoolConfig } from "pg"


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
            typeof HandlerType === "function" //support both class and function (closure) patterns
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
