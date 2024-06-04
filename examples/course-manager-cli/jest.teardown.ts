import { getPostgreSqlContainer } from "./jest.testPgDbPool"

const teardown = async () => {
    const pgContainer = await getPostgreSqlContainer()
    if (pgContainer) {
        await pgContainer.stop()
    }
}

export default teardown
