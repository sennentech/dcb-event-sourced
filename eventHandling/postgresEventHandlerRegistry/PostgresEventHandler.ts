import { EventHandler } from "../EventHandler"
import { PostgresEventHandlerRegistry } from "./PostgresEventHandlerRegistry"
import { PostgresTransactionManager } from "./PostgresTransactionManager"

export type PostgresEventHandlerConstructor = new (transactionManager: PostgresTransactionManager) => EventHandler
