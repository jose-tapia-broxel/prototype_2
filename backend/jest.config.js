/**
 * Jest Configuration for Backend Integration Tests
 * Phase 6: Integration & Testing
 */
module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Test environment
  testEnvironment: 'node',

  // Root directory
  rootDir: 'src',

  // Test file patterns
  testRegex: '.*\\.spec\\.ts$',

  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'ts'],

  // Transform TypeScript files
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },

  // Collect coverage
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.spec.ts',
    '!**/*.module.ts',
    '!main.ts',
    '!**/index.ts',
    '!**/*.interface.ts',
    '!**/*.dto.ts',
    '!**/*.entity.ts',
  ],

  // Coverage directory
  coverageDirectory: '../coverage',

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },

  // Module name mapping for absolute imports
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
  },

  // Setup files
  setupFilesAfterEnv: [],

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Global teardown
  globalTeardown: undefined,

  // Display individual test results with the test suite hierarchy
  displayName: {
    name: 'Backend Integration Tests',
    color: 'blue',
  },
};
