/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  moduleFileExtensions: ["ts", "js"],
  testMatch: ["**/?(*.)+(spec|test).[tj]s"],
  verbose: true,
  collectCoverage: false,
  coverageDirectory: "coverage",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: [
    '**/__tests__/**/*.test.ts',     // ✅ notice the double underscore
    '**/__test__/**/*.test.ts',      // ✅ your folder is named __test__
  ],


};
