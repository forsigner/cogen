import { Types } from '@graphql-codegen/plugin-helpers'

export type CodegenConfig = Types.Config

export interface StookGraphqlConfig {
  /**
   * codegen 的配置
   */
  codegen: Types.Config

  /**
   * 默认为 stook-graphql, 你可以用本地的替换，如 @common/stook-graphql
   */
  httpModule?: string

  /**
   * 生产的gql文件模块，默认为 @generated/gql
   */
  gqlConstantModule?: string

  defaultDepthLimit?: number

  /**
   * gql 节点配置
   */
  gql?: ConfigItem[]
}

export interface ServiceOptions {
  name: string
  baseDirPath?: string
  outPath?: string
}

export type GqlConfig = ConfigItem[]

type Action = 'query' | 'useQuery' | 'useMutation' | 'refetch' | 'mutator'
export interface ConfigItem {
  alias?: string // 生成的变量的名称，比如 SCRIPT
  name: string // graphql 端点名称
  depthLimit?: number // 深度
  excludes?: string[] // 忽略的字段
  actions?: Action[]
}

export type GraphQLData = Array<{
  name: string
  query: string
}>

export interface GenerateQueryParams {
  curName: string
  curParentType: string
  curParentName?: string
  argumentsDict?: { [key: string]: any }
  duplicateArgCounts?: { [key: string]: any }
  crossReferenceKeyList?: string[] // [`${curParentName}To${curName}Key`]
  curDepth?: number
  depthLimit?: number
  excludes?: string[] // 忽略的字段
  trace: string //字段路径
}
