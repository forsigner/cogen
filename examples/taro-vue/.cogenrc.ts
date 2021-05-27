import { CogenConfig } from '@cogen/cli'
const path = require('path')

const cogenrc: CogenConfig = {
  configDir: './gconfig',
  generatedDir: path.resolve(__dirname, 'src', 'service'),
  plugins: [
    'cogen-taro-router'
  ],
}

export default cogenrc
