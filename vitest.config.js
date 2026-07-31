// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `node`, not `jsdom`: every suite here is pure logic or a source-file read.
    // The config asked for jsdom without it ever being a dependency, which made
    // the whole suite fail to collect.
    environment: 'node',
    globals: true,
  },
});
