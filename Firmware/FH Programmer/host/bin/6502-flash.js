#!/usr/bin/env node
// `6502-flash`, the host side of the Flash Helper.
//
// This file is the entry point and nothing else: argument handling and every
// command live in `src/cli.js`, so that the tests can call `main()` directly
// rather than spawning a process.

import { readFile } from 'node:fs/promises'

import { UserError, main } from '../src/cli.js'

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

try {
  await main(process.argv.slice(2), { version: pkg.version })
} catch (err) {
  // A UserError's message is the whole report; anything else is a bug here and
  // keeps its stack, because that is what would be needed to fix it.
  console.error(`6502-flash: ${err.message}`)
  if (!(err instanceof UserError) && process.env.DEBUG) console.error(err)
  process.exitCode = 1
}
