import {
  Project,
  VariableDeclarationKind,
  MethodDeclarationStructure,
  OptionalKind,
} from 'ts-morph'

import { capital, pascal, upper } from 'case'
import get from 'lodash.get'
import { join } from 'path'
import { readFileSync } from 'fs'
import { parse, ObjectTypeDefinitionNode, FieldDefinitionNode } from 'graphql'
import saveSourceFile from '../utils/saveSourceFile'
import { formatNamedImports } from '../utils/formatNamedImports'
import { ConfigItem, StookGraphqlConfig } from '../types'
import { getObjectType } from '../utils/getObjectType'
import { CogenConfig } from '@cogen/cli'

type Operation = 'Query' | 'Mutation'

function getStatements(field: FieldDefinitionNode, gqlName: string): string {
  let statements: string

  const args = field.arguments || []
  const firstArgName = get(args[0], 'name.value')

  // 无参数
  if (!args.length) {
    statements = `
      const key = opt.key ? opt.key : ${gqlName}
      if (!fetcher.get(key))  {
        return console.warn('fetcher找不到' + key) as any
      }
      if (Object.keys(args).length) opt.variables = args
      if (!opt.showLoading) opt.showLoading = false
      return await fetcher.get(key).refetch(opt)
    `
    // 只有个参数并且叫 input
  } else if (args.length === 1 && firstArgName === 'input') {
    statements = `
      const key = opt.key ? opt.key : ${gqlName}
      if (!fetcher.get(key))  {
        return console.warn('fetcher找不到' + key) as any
      }
      if (Object.keys(args).length) opt.variables = {input: args}
      if (!opt.showLoading) opt.showLoading = false
      return await fetcher.get(key).refetch(opt)
    `
    // 多参数,或者不叫 input
  } else {
    statements = `
      const key = opt.key ? opt.key : ${gqlName}
      if (!fetcher.get(key))  {
        return console.warn('fetcher找不到' + key) as any
      }
      if (Object.keys(args).length) opt.variables = args
      if (!opt.showLoading) opt.showLoading = false
      return await fetcher.get(key).refetch(opt)
    `
  }
  return statements
}

function getArgsType(field: FieldDefinitionNode, operation: string, gqlName: string): string {
  const args = field.arguments || []
  const firstArgName = get(args[0], 'name.value')
  let argsType: string
  // 无参数
  if (!args.length) {
    argsType = 'any'
    // 只有个参数并且叫 input
  } else if (args.length === 1 && firstArgName === 'input') {
    argsType = get(args[0], 'type.type.name.value')

    // 多参数,或者不叫 input
  } else {
    argsType = `${capital(operation)}${pascal(gqlName)}Args`
  }
  return argsType
}

/**
 * 自动化生产 refetcher
 *
 * @export
 * @param {string} gqlConstantModule
 * @param {string[]} refetchConfig
 */
export async function generateRefetcher(
  config: CogenConfig,
  stookGraphql: StookGraphqlConfig,
  refetchConfig: string[] = [],
  gqlConfig: ConfigItem[],
) {
  const project = new Project()
  const { generatedDir = '' } = config

  const httpModule = stookGraphql.httpModule!
  const gqlConstantModule = stookGraphql.gqlConstantModule!

  const outPath = join(generatedDir, `refetcher.ts`)
  const sdlPath = join(generatedDir, 'schema.graphql')
  const sdl = parse(readFileSync(sdlPath, { encoding: 'utf8' })) // GraphQL sdl string
  const sourceFile = project.createSourceFile(outPath, undefined, { overwrite: true })
  const methods: OptionalKind<MethodDeclarationStructure>[] = []
  const argTypes: string[] = []
  const objectTypes: string[] = []
  const gqlNames: string[] = [] // graphQL query name, 例如： USERS、USERS_CONECTION

  // 有效的 alias config
  const aliasConfigs = gqlConfig.filter((i) => refetchConfig.includes(i.alias || ''))

  // 把 alias 也转换成 name
  const realNames = refetchConfig.map((name) => {
    const find = gqlConfig.find((i) => i.alias === name)
    return find ? find.name : name
  })

  for (const def of sdl.definitions) {
    const operation: Operation = get(def, 'name.value')
    const objectType = def as ObjectTypeDefinitionNode

    // 只处理跟节点 Query
    if (operation !== 'Query') continue
    if (!objectType.fields || !objectType.fields.length) continue

    for (const field of objectType.fields) {
      const queryName = field.name.value

      if (!realNames.includes(queryName)) continue

      const matchingAliasConfigs = aliasConfigs.filter((i) => i.name === queryName)

      // const action = operation === 'Query' ? 'useQuery' : 'useMutation'

      const gqlName = upper(queryName, '_')
      gqlNames.push(gqlName)

      const objectType = getObjectType(field)

      if (objectType) {
        // 过滤掉
        if (['number', 'boolean'].includes(objectType)) {
          // do nothing
        } else {
          const type = objectType.replace('[]', '')
          if (!objectTypes.includes(type)) objectTypes.push(type)
        }
      }

      const argsType = getArgsType(field, operation, gqlName)
      const statements = getStatements(field, gqlName)

      if (argsType !== 'any') {
        if (!argTypes.includes(argsType) && argsType) {
          argTypes.push(argsType)
        }
        if (!argTypes.includes(objectType) && objectType) {
          argTypes.push(objectType.replace('[]', ''))
        }
      }

      // 生产别名的 Hooks
      for (const item of matchingAliasConfigs) {
        const gqlName = upper(item.alias || '', '_')
        gqlNames.push(gqlName)
        const statements = getStatements(field, gqlName)
        methods.push({
          name: `refetch${pascal(item.alias || '')}`,
          isAsync: true,
          returnType: `Promise<${objectType}>`,
          parameters: [
            {
              name: 'args',
              type: `${argsType} = {} as ${argsType}`,
            },
            {
              name: 'opt',
              type: 'RefetchOptions = {}',
            },
          ],
          statements,
        })
      }

      // 非别名的 refetcher
      methods.push({
        name: `refetch${pascal(queryName)}`,
        isAsync: true,
        returnType: `Promise<${objectType}>`,
        parameters: [
          {
            name: 'args',
            type: `${argsType} = {} as ${argsType}`,
          },
          {
            name: 'opt',
            type: 'RefetchOptions = {}',
          },
        ],
        statements,
      })
    }
  }

  if (methods.length) {
    // import stook-graphql
    sourceFile.addImportDeclaration({
      moduleSpecifier: httpModule,
      namedImports: ['RefetchOptions', 'fetcher'],
    })

    sourceFile.addImportDeclaration({
      moduleSpecifier: '@generated/types',
      namedImports: [...formatNamedImports(objectTypes, argTypes)],
    })

    sourceFile.addImportDeclaration({
      moduleSpecifier: gqlConstantModule,
      namedImports: [...formatNamedImports(gqlNames)],
    })
  }

  sourceFile.addClass({
    name: 'RefetcherService',
    methods,
  })

  sourceFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: 'Refetcher',
        initializer: `new RefetcherService()`,
      },
    ],
    isExported: true,
  })

  await saveSourceFile(sourceFile)
}
