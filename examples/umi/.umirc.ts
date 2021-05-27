import { defineConfig } from 'umi'
import { join } from 'path'

function resolve(path: string) {
  return join(__dirname, 'src', path)
}

export default defineConfig({
  nodeModulesTransform: {
    type: 'none',
  },
  routes: [
    { path: '/', component: '@/pages/index' },
    {
      path: '/users/:id',
      component: '@/pages/user',
    },
  ],

  alias: {
    '@modals': resolve('modals/'),
    '@drawers': resolve('drawers/'),
    '@generated': resolve('generated/'),
  },
})
