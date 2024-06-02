// import { Pool, PoolConfig } from "pg"
// import { PostgresTransactionManager } from "./PostgresTransactionManager"
// import {
//     PostgresEventHandlerRegistry,
//     PostgresHandlerClassConstructor,
//     PostgresHandlerFunctionConstructor
// } from "./PostgresEventHandlerRegistry"

// export const assemblePostgresBundle = async (
//     postgresConfig: PoolConfig,
//     handlerTypes: Record<string, PostgresHandlerClassConstructor | PostgresHandlerFunctionConstructor>
// ) => {
//     const pool = new Pool(postgresConfig)
//     const eventStore = new PostgresEventStore(pool)
//     await eventStore.install()

//     const transactionManager = new PostgresTransactionManager(pool)
//     const handlers = Object.entries(handlerTypes).reduce((acc, [key, HandlerType]) => {
//         acc[key] =
//             typeof HandlerType === "function" //support both class and function (closure) patterns
//                 ? (<PostgresHandlerFunctionConstructor>HandlerType)(transactionManager)
//                 : new (<PostgresHandlerClassConstructor>HandlerType)(transactionManager)
//         return acc
//     }, {})

//     const handlerRegistry = new PostgresEventHandlerRegistry(transactionManager, handlers)
//     await handlerRegistry.install()

//     return {
//         pool,
//         eventStore: new PostgresEventStore(pool),
//         handlerRegistry
//     }
// }
