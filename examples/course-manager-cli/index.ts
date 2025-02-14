import { Pool } from "pg"
import "source-map-support/register"
import { startCli } from "./src/Cli"
import { ensureEventStoreInstalled, ensureHandlersInstalled } from "@dcb-es/event-store-postgres"
import { installPostgresCourseSubscriptionsRepository } from "./src/postgresCourseSubscriptionRepository/PostgresCourseSubscriptionRespository"
import { EventSourcedApi, setupHandlers } from "./src/api/Api"
    ; (async () => {
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

        await ensureEventStoreInstalled(pool)
        await ensureHandlersInstalled(pool, Object.keys(setupHandlers(installClient)))
        await installPostgresCourseSubscriptionsRepository(installClient)
        await installClient.query("COMMIT")
        installClient.release()

        const api = EventSourcedApi(pool)

        await startCli(api)
    })()
