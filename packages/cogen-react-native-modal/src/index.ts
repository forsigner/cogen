import { join, resolve, isAbsolute } from 'path'
import { generateModalContainer } from './generate-modal-container'
import { generateModalService } from './generate-modal-service'
import { PluginOptions } from '@cogen/cli'
import { Config } from './typings'

export default (options = {} as PluginOptions) => {
  const modalConfig: Config = options.config.antdModal || {}
  const cwd = process.cwd()
  let { generatedDir = join(cwd, 'src', 'generated') } = options
  let { modalsDir = join(cwd, 'src', 'modals') } = modalConfig || {}
  const { moduleSpecifier = '@peajs/modal' } = modalConfig

  if (!isAbsolute(generatedDir)) generatedDir = resolve(cwd, generatedDir)
  if (!isAbsolute(modalsDir)) modalsDir = resolve(cwd, modalsDir)

  generateModalContainer(generatedDir, modalsDir, moduleSpecifier)
  generateModalService(generatedDir, modalsDir, moduleSpecifier)
}

export * from './typings'
