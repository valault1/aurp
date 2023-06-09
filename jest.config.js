/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^src(.*)$": "<rootDir>/src$1",
    "^domains(.*)$": "<rootDir>/src/domains$1",
    "^components(.*)$": "<rootDir>/src/components$1",
    "^shared(.*)$": "<rootDir>/src/shared$1",
    "^api(.*)$": "<rootDir>/src/api$1",
  },
  "transform": {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
};
