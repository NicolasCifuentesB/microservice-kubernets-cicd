import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  roots: ['<rootDir>/src'],

  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts'
  ],

  moduleFileExtensions: [
    'ts',
    'js',
    'json'
  ],

  collectCoverage: true,
  coverageDirectory: 'coverage',

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/app.ts',
    '!src/config/*.ts',
    '!src/**/index.ts'
  ],

  coverageReporters: [
    'text',
    'lcov',
    'html',
    'clover'
  ],

  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  clearMocks: true,
  verbose: true
};

export default config;