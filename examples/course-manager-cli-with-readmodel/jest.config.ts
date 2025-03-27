import type { Config } from "@jest/types"

const config: Config.InitialOptions = {
    preset: "ts-jest",
    testEnvironment: "node",
    transform: {
        "^.+\\.(ts)$": ["ts-jest", { tsconfig: "tsconfig.json" }]
    },
    testMatch: ["**/**/*.tests.ts", "**/**/*.tests.int.ts"],
    testTimeout: 60000,
    slowTestThreshold: 20,

    globalSetup: "./jest.setup.ts",
    globalTeardown: "./jest.teardown.ts"
}

export default config
