// .vscode-test.unit.mjs
import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  // run compiled unit tests
  files: [
    'out/test/unit/**/*.spec.js',
    'out/test/unit/**/*.test.js'
  ]
});