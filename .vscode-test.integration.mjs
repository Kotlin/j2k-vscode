// .vscode-test.integration.mjs
import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  // run compiled integration tests
  files: 'out/test/integration/**/*.test.js'
});
