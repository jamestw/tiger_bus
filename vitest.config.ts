import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./tests/support/setup-env.ts'],
    // Test files share one real Postgres test database (see tests/support/test-db.ts).
    // resetTestDb() truncates every table, so parallel files stomp on each other's
    // fixtures mid-test. Run files sequentially to keep the shared DB isolated.
    fileParallelism: false,
  },
})
