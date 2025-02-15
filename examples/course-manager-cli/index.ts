import { Pool } from "pg"
import "source-map-support/register"
import { startCli } from "./src/Cli"
import { installPostgresCourseSubscriptionsRepository } from "./src/postgresCourseSubscriptionRepository/PostgresCourseSubscriptionRespository"
import { Api, setupHandlers } from "./src/api/Api"
import { HandlerCatchup, PostgresEventStore } from "@dcb-es/event-store-postgres"
;(async () => {
    const postgresConfig = {
        host: "localhost",
        port: 5432,
        user: "postgres",
        password: "postgres",
        database: "dcb_test_1"
    }

    const pool = new Pool(postgresConfig)
    const installClient = await pool.connect()
    await installClient.query("BEGIN transaction isolation level serializable")
    const eventStore = new PostgresEventStore(installClient)
    await eventStore.ensureInstalled()

    const handlerCatchup = new HandlerCatchup(installClient, eventStore)
    await handlerCatchup.ensureInstalled(Object.keys(setupHandlers(installClient)))
    await installPostgresCourseSubscriptionsRepository(installClient)
    await installClient.query("COMMIT")
    installClient.release()

    const api = new Api(pool)

    await startCli(api)
})()
