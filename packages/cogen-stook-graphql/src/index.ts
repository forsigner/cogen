import { generate } from '@graphql-codegen/cli'
import { CogenConfig } from '@cogen/cli'
import { StookGraphqlConfig } from './types'
import { generateGql } from './generators/gql'
import { generateHooks } from './generators/hooks'
import { generateApi } from './generators/api'
import { generateRefetcher } from './generators/refetcher'
import { generateMutator } from './generators/mutator'
import { generateNames } from './generators/names'

export * from './types'

type Config = Required<CogenConfig> & { stookGraphql: StookGraphqlConfig }

export default async (config: Config) => {
  const { stookGraphql } = config
  if (!stookGraphql) return
  const codegenConfig = stookGraphql.codegen

  // use graphql-codegen
  await generate(codegenConfig, true)

  const {
    gql = [],
    // defaultDepthLimit = 2,
  } = stookGraphql

  if (!stookGraphql.httpModule) {
    stookGraphql.httpModule = 'stook-graphql'
  }

  if (!stookGraphql.gqlConstantModule) {
    stookGraphql.gqlConstantModule = '@generated/gql'
  }

  const hooksConfig = gql
    .filter((i) => i.actions?.includes('useQuery') || i.actions?.includes('useMutation'))
    .map((i) => i.alias || i.name) as string[]

  const mutatorConfig = gql
    .filter((i) => i.actions?.includes('mutator'))
    .map((i) => i.alias || i.name) as string[]

  const queryConfig = gql
    .filter((item) => item.actions?.includes('query'))
    .map((item) => item.alias || item.name)

  const refetchConfig = gql
    .filter((i) => i.actions?.includes('refetch'))
    .map((i) => i.alias || i.name)

  const promises = [
    generateGql(config, gql),
    generateNames(config),
    generateHooks(config, stookGraphql, hooksConfig, gql),
    generateMutator(config, stookGraphql, mutatorConfig, gql),
    generateApi(config, stookGraphql, queryConfig),
    generateRefetcher(config, stookGraphql, refetchConfig, gql),
  ]

  await Promise.all(promises)
}
