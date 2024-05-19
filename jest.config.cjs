module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '^.+\\.(ts)$': ['ts-jest', { tsconfig: 'tsconfig.json' }]
    },
    testMatch: [
        "**/**/*.tests.ts",
        "**/**/*.tests.int.ts",
    ],
    testTimeout: 10000
};
