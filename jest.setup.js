const PostgreSqlContainer = require("@testcontainers/postgresql").PostgreSqlContainer
const { Client, Pool } = require('pg')
const { v4: uuidv4 } = require('uuid')

module.exports = async () => {
    const pgContainer = await new PostgreSqlContainer().withDatabase("postgres").start()
    global.__PGCONTAINER = pgContainer
    global.__GET_TEST_PG_DATABASE_URI = async () => {
        const dbName = `test_${uuidv4().split("-").join("")}`
        const baseUri = pgContainer.getConnectionUri()
        const client = new Pool({
            connectionString: baseUri
        })

        await client.query(`CREATE DATABASE "${dbName}"`)
        await client.end()

        return baseUri.replace("/postgres", `/${dbName}`)
    }
}