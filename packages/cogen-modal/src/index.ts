import { join, resolve, isAbsolute } from 'path'
import { generateModalContainer } from './generate-modal-container'
import { generateModalService } from './generate-modal-service'
import { CogenConfig } from '@cogen/cli'
import { ModalConfig } from './typings'

export default (options: Required<CogenConfig> & { modal: ModalConfig }) => {
  const { modal: modalConfig = {}, generatedDir, baseDir } = options
  const cwd = process.cwd()
  let { moduleSpecifier = '@peajs/modal', modalsDir = join(baseDir, 'modals') } = modalConfig

  if (!isAbsolute(modalsDir)) modalsDir = resolve(cwd, modalsDir)

  generateModalContainer(generatedDir, modalsDir, moduleSpecifier)
  generateModalService(generatedDir, modalsDir, moduleSpecifier)
}

export * from './typings'
