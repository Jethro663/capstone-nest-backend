module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
        },
      },
    ],
  },
  moduleNameMapper: {
    "\\.(png|jpg|jpeg|gif|webp)$": "<rootDir>/src/__mocks__/assetMock.js",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  clearMocks: true,
};
