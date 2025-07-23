import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// Build an **absolute file URL** to the stub
const stubUrl = pathToFileURL(resolve('./test/vscode-mock.ts'));

// alias the specifier _before_ any user import happens
register('vscode', stubUrl);