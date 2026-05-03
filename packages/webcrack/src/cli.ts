#!/usr/bin/env node

import { program } from 'commander';
import debug from 'debug';
import { existsSync, realpathSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { webcrack } from './index.js';

const requireBase = (() => {
  if (!(process.argv[1] && existsSync(process.argv[1]))) {
    return process.execPath;
  }
  try {
    return realpathSync(process.argv[1]);
  } catch (error) {
    debug('webcrack:cli')(
      'Failed to resolve CLI entry path to real filesystem location, using process.execPath (package metadata may be unresolved)',
      error,
    );
    return process.execPath;
  }
})();
const require = createRequire(requireBase);
let version = '0.0.0';
let description = 'Deobfuscate, unminify and unpack bundled javascript';
try {
  const packageJson = require('../package.json') as {
    version?: string;
    description?: string;
  };
  version = packageJson.version ?? version;
  description = packageJson.description ?? description;
} catch (error) {
  debug('webcrack:cli')(
    'Failed to load package metadata, using fallback version 0.0.0 and default description',
    error,
  );
}

debug.enable('webcrack:*');

interface Options {
  force?: boolean;
  output?: string;
  mangle?: boolean;
  jsx: boolean;
  unpack: boolean;
  deobfuscate: boolean;
  unminify: boolean;
}

async function readStdin() {
  let data = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

program
  .version(version)
  .description(description)
  .option('-o, --output <path>', 'output directory for bundled files')
  .option('-f, --force', 'overwrite output directory')
  .option('-m, --mangle', 'mangle variable names')
  .option('--no-jsx', 'do not decompile JSX')
  .option('--no-unpack', 'do not extract modules from the bundle')
  .option('--no-deobfuscate', 'do not deobfuscate the code')
  .option('--no-unminify', 'do not unminify the code')
  .argument('[file]', 'input file, defaults to stdin')
  .action(async (input: string | undefined) => {
    const { output, force, ...options } = program.opts<Options>();
    const code = await (input ? readFile(input, 'utf8') : readStdin());

    if (output) {
      if (force || !existsSync(output)) {
        await rm(output, { recursive: true, force: true });
      } else {
        program.error('output directory already exists');
      }
    }

    const result = await webcrack(code, options);

    if (output) {
      await result.save(output);
    } else {
      console.log(result.code);
      if (result.bundle) {
        debug('webcrack:unpack')(
          'Modules are not displayed in the terminal. Use the --output option to save them to a directory.',
        );
      }
    }
  })
  .parse();
