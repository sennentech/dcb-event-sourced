import { Pool } from "pg"
import { PostgresCourseSubscriptionsProjection } from "./src/api/PostgresCourseSubscriptionsProjection"
import "source-map-support/register"
import { startCli } from "./src/Cli"
import { PostgresTransactionManager, PostgresEventHandlerRegistry } from "@dcb-es/event-handling-postgres"
import { PostgresEventStore } from "@dcb-es/event-store-postgres"
import { PostgresCourseSubscriptionsRepository } from "./src/postgresCourseSubscriptionRepository/PostgresCourseSubscriptionRespository"
import { EventSourcedApi } from "./src/api/Api"
(async () => {
    const postgresConfig = {
        host: "localhost",
        port: 5432,
        user: "postgres",
        password: "postgres",
        database: "dcb_test_1"
    }

    const pool = new Pool(postgresConfig)
    const eventStore = new PostgresEventStore(pool)
    await eventStore.install()

    const transactionManager = new PostgresTransactionManager(pool)
    const handlers = {
        CourseProjection: PostgresCourseSubscriptionsProjection(transactionManager)
    }

    const handlerRegistry = new PostgresEventHandlerRegistry(transactionManager, handlers)
    await handlerRegistry.install()

    const repository = new PostgresCourseSubscriptionsRepository(pool)
    await repository.install()
    
    const api = EventSourcedApi(eventStore, repository, handlerRegistry)

    await startCli(api)
})()
