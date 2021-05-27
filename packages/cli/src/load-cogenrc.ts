import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import * as ts from 'typescript'
import { CogenConfig } from './typings'
const requireFromString = require('require-from-string')

export function loadCogenrc(): CogenConfig {
  const cwd = process.cwd()
  const configPath = join(cwd, '.cogenrc.ts')

  if (!existsSync(configPath)) return {} as CogenConfig
  const fileString = readFileSync(configPath, { encoding: 'utf8' })
  const code = ts.transpile(fileString)
  const obj = requireFromString(code)
  return obj.default
}
