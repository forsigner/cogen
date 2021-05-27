import { CogenConfig } from '@cogen/cli'

const cogenrc: CogenConfig = {
  baseDir: './src',
  plugins: ['cogen-stook-graphql', 'cogen-umi-router', 'cogen-modal'],
  stookGraphql: {
    codegen: {
      schema: [
        {
          // 'https://graphql.anilist.co': {},
          'http://localhost:5001/graphql': {},
        },
      ],
      generates: {
        [process.cwd() + '/src/generated/types.d.ts']: {
          plugins: ['typescript'],
        },
        [process.cwd() + '/src/generated/schema.graphql']: {
          plugins: ['schema-ast'],
        },
      },
    },

    gql: [
      // {
      //   name: 'User',
      //   actions: ['query', 'useQuery', 'mutator', 'refetch'],
      // },

      {
        name: 'users',
        actions: ['query', 'useQuery', 'mutator', 'refetch'],
      },
    ],
  },
}

export default cogenrc
