import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql"
import { Pool, Client } from "pg"
import { v4 as uuid } from "uuid"

type ExtendedGlobal = typeof global & { __PG_CONTAINER_INSTANCE: StartedPostgreSqlContainer }

export const getPostgreSqlContainer = async (): Promise<StartedPostgreSqlContainer> => {
    if (!(<ExtendedGlobal>global).__PG_CONTAINER_INSTANCE) {
        ;(<ExtendedGlobal>global).__PG_CONTAINER_INSTANCE = await new PostgreSqlContainer("postgres:17")
            .withDatabase("postgres")
            .start()
    }
    return (<ExtendedGlobal>global).__PG_CONTAINER_INSTANCE
}

export const getTestPgDatabasePool = async (): Promise<Pool> => {
    const pgContainer = await getPostgreSqlContainer()
    const dbName = `test_${uuid().split("-").join("")}`
    const baseUri = pgContainer.getConnectionUri()
    const client = new Client({
        connectionString: baseUri
    })
    await client.connect()

    await client.query(`CREATE DATABASE "${dbName}"`)
    await client.end()

    return new Pool({
        connectionString: baseUri.replace("/postgres", `/${dbName}`),
        max: 100
    })
}
