import { join } from 'path'
import { generateRouterlService } from './generate-router-service'
import { CogenConfig } from '@cogen/cli'
import { UmiRouterConfig } from './typings'
import { loadRoutesConfig } from './load-routes-config'

export default (options: Required<CogenConfig> & { umiRouter: UmiRouterConfig }) => {
  const { umiRouter: umiRouterConfig = {}, generatedDir } = options

  const cwd = process.cwd()
  let { umiConfigPath = join(cwd, '.umirc.ts') } = umiRouterConfig

  const routesConfig = loadRoutesConfig(umiConfigPath)

  generateRouterlService(generatedDir, routesConfig)
}

export * from './typings'
