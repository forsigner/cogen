import { Command, flags } from '@oclif/command'
import { join, resolve, isAbsolute } from 'path'
import { loadCogenrc } from './load-cogenrc'
import { CogenConfig } from './typings'

export default class Cogen extends Command {
  static description = 'Generate your code'

  static flags = {
    // add --version flag to show CLI version
    version: flags.version({ char: 'v' }),
    help: flags.help({ char: 'h' }),
    plugin: flags.string({ char: 'p' }),
  }

  private formatBaseDir(opt: CogenConfig): string {
    const cwd = process.cwd()
    let baseDir: string = opt.baseDir!

    if (!opt.baseDir) baseDir = cwd
    if (!isAbsolute(baseDir)) baseDir = resolve(cwd, baseDir)

    return baseDir
  }

  async run() {
    try {
      const { flags } = this.parse(Cogen)
      const cmdPluginName = flags.plugin // run single plugin

      const opt = loadCogenrc() // Generatedrc config

      opt.baseDir = this.formatBaseDir(opt)

      if (!opt.generatedDir) {
        opt.generatedDir = join(opt.baseDir, 'generated')
      }

      /** run all plugins */
      for (const plugin of opt.plugins! || []) {
        if (cmdPluginName) {
          if (typeof plugin !== 'string') continue
          if (plugin !== cmdPluginName) continue
          require(plugin).default(opt)
          break
        } else {
          if (typeof plugin === 'string') {
            require(plugin).default(opt)
            continue
          } else if (typeof plugin === 'function') {
            plugin(opt)
          }
        }
      }
    } catch (error) {
      console.log(error)
    }
  }
}

export * from './typings'
