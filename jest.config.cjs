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
    testTimeout: 60000,
    slowTestThreshold: 20,
    globalSetup: './jest.setup.js',
    globalTeardown: './jest.teardown.js',
};
