import { join, resolve, isAbsolute } from 'path'
import { generateRootNavigation } from './generate-root-navigation'
import { generateRouterlService } from './generate-router-service'
import { PluginOptions } from '@cogen/cli'
import { Config } from './typings'

export default (options = {} as PluginOptions) => {
  const config: Config = options.config.reactNativeRouter || {}
  const cwd = process.cwd()
  let { generatedDir = join(cwd, 'src', 'generated') } = options
  let { pagesDir = join(cwd, 'src', 'pages') } = config || {}

  if (!isAbsolute(generatedDir)) generatedDir = resolve(cwd, generatedDir)
  if (!isAbsolute(pagesDir)) pagesDir = resolve(cwd, pagesDir)

  generateRootNavigation(generatedDir)
  generateRouterlService(generatedDir, pagesDir)
}

export * from './typings'
