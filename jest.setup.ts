import { getPostgreSqlContainer } from "./jest.testPgDbPool"

const setup = async () => {
    console.log("JEST SETUP!")
    await getPostgreSqlContainer()
}

export default setup
