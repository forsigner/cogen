import { existsSync, readFileSync } from 'fs'
import * as ts from 'typescript'

const requireFromString = require('require-from-string')

export function loadRoutesConfig(umiConfigPath: string) {
  if (!existsSync(umiConfigPath)) return

  const fileString = readFileSync(umiConfigPath, { encoding: 'utf8' })
  const code = ts.transpile(fileString)
  const obj = requireFromString(code)
  return obj?.default.routes
}
