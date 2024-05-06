module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
      '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }]
    },
    testMatch: [
      "**/eventStore/**/*.tests.ts",
      "**/eventHandling/**/*.tests.ts",
      "**/courseManager/**/*.tests.ts"
    ]
  };
  