import { CogenConfig } from '@cogen/cli'

const cogenrc: CogenConfig = {
  // baseDir: process.cwd(),
  baseDir: './',
  configDir: './gconfig',
  plugins: ['cogen-modal', 'cogen-drawer'],
  modal: {
    //
  },
}

export default cogenrc
