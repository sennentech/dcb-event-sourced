import { getPostgreSqlContainer } from "./jest.testPgDbPool"

const setup = async () => {
    await getPostgreSqlContainer()
}

export default setup
