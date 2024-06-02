import { getPostgreSqlContainer } from "./src/jest.testPgDbPool"

const setup = async () => {
    await getPostgreSqlContainer()
}

export default setup
