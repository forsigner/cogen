import { join, resolve, isAbsolute } from 'path'
import { generateDrawerContainer } from './generate-drawer-container'
import { generateDrawerService } from './generate-drawer-service'
import { CogenConfig } from '@cogen/cli'
import { DrawerConfig } from './typings'

export default (options: Required<CogenConfig> & { modal: DrawerConfig }) => {
  const { drawer: drawerConfig = {}, generatedDir, baseDir } = options
  const cwd = process.cwd()
  let { moduleSpecifier = '@peajs/drawer', drawersDir = join(baseDir, 'drawers') } = drawerConfig

  if (!isAbsolute(drawersDir)) drawersDir = resolve(cwd, drawersDir)

  generateDrawerContainer(generatedDir, drawersDir, moduleSpecifier)
  generateDrawerService(generatedDir, drawersDir, moduleSpecifier)
}

export * from './typings'
