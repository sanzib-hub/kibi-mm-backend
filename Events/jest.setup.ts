import type { Config } from 'jest';
import { describe, it, expect } from 'vitest';


const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Make Jest see your current filename style and also standard ones:
  testMatch: [
    "**/_tests_/**/*Test.ts",
    "**/_tests_/**/*.test.ts",
    "**/*.test.ts",
    "**/*.spec.ts"
  ],
  moduleFileExtensions: ['ts','tsx','js','json'],
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  setupFiles: ['dotenv/config'],           // so .env(.test) is loaded before tests
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  clearMocks: true,
  restoreMocks: true,
  // If your DB/Redis can’t handle parallelism yet:
  maxWorkers: 1
};

export default config;
