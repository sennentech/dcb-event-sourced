import type { Config } from "@jest/types"

const config: Config.InitialOptions = {
    preset: "ts-jest",
    testEnvironment: "node",
    transform: {
        "^.+\\.(ts)$": ["ts-jest", { tsconfig: "tsconfig.json" }]
    },
    testMatch: ["**/**/*.tests.ts", "**/**/*.tests.int.ts"]
}

export default config
