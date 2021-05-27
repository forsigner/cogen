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
import { GqlConfig, StookGraphqlConfig } from '../types'
import { getObjectType } from '../utils/getObjectType'
import { CogenConfig } from '@cogen/cli'

type Operation = 'Query' | 'Mutation'

function getStatements(
  field: FieldDefinitionNode,
  action: string,
  gqlName: string,
  variable: string,
): string {
  let statements: string
  const args = field.arguments || []
  const objectType = getObjectType(field)
  const firstArgName = get(args[0], 'name.value')

  // 无参数
  if (!args.length) {
    statements = `return ${action}<${objectType}, ${variable}>(${gqlName}, { ...opt, variables: args })`
    // 只有个参数并且叫 input
  } else if (args.length === 1 && firstArgName === 'input') {
    statements = `
          return ${action}<${objectType}, ${variable}>(${gqlName}, { ...opt, variables: () => {
            const params = typeof args === 'function' ? args() : args
            return { input: params } as any
          }})
        `
    // 多参数,或者不叫 input
  } else {
    statements = `return ${action}<${objectType}, ${variable}>(${gqlName}, { ...opt, variables: args })`
  }
  return statements
}

/**
 * 获取参数，如果是类似 {input: {...}} 的单 input 类型，去除input嵌套
 * @param field
 * @param operation
 * @param gqlName
 */
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
 * 获取参数，保留input嵌套
 * TODO: 需完善
 * @param field
 * @param operation
 * @param gqlName
 */
function getVariableType(field: FieldDefinitionNode, operation: string, gqlName: string): string {
  const args = field.arguments || []
  let argsType: string
  // 无参数
  if (!args.length) {
    argsType = 'any'
  } else {
    argsType = `${capital(operation)}${pascal(gqlName)}Args`
  }
  return argsType
}

export async function generateHooks(
  config: CogenConfig,
  stookGraphql: StookGraphqlConfig,
  hooksConfig: string[],
  gqlConfig: GqlConfig,
) {
  const { generatedDir = '' } = config

  const httpModule = stookGraphql.httpModule!
  const gqlConstantModule = stookGraphql.gqlConstantModule!

  const project = new Project()
  const outPath = join(generatedDir, `hooks.ts`)
  const sdlPath = join(generatedDir, 'schema.graphql')
  const sdl = parse(readFileSync(sdlPath, { encoding: 'utf8' })) // GraphQL sdl string
  const sourceFile = project.createSourceFile(outPath, undefined, { overwrite: true })
  const methods: OptionalKind<MethodDeclarationStructure>[] = []
  const argTypes: string[] = [] // GraphQL 的arg类型参数
  const gqlNames: string[] = [] // graphQL query name, 例如： USERS、USERS_CONECTION

  const aliasConfigs = gqlConfig.filter((i) => hooksConfig.includes(i.alias || ''))
  let objectTypes: string[] = []

  // 把 alias 也转换成 name
  const realNames = hooksConfig.map((name) => {
    const find = gqlConfig.find((i) => i.alias === name)
    return find ? find.name : name
  })

  for (const def of sdl.definitions) {
    const operation: Operation = get(def, 'name.value')
    const objectType = def as ObjectTypeDefinitionNode

    // 只处理跟节点 Query、Mutation
    if (!['Query', 'Mutation'].includes(operation)) continue
    if (!objectType.fields || !objectType.fields.length) continue

    for (const field of objectType.fields) {
      const queryName = field.name.value // 节点名称

      if (!realNames.includes(queryName)) continue

      const gqlName = upper(queryName, '_')
      gqlNames.push(gqlName)

      const action = operation === 'Query' ? 'useQuery' : 'useMutation'

      const argsType = getArgsType(field, operation, gqlName)
      const variableType = getVariableType(field, operation, gqlName)

      const statements = getStatements(field, action, gqlName, variableType)

      const objectType = getObjectType(field).replace('[]', '')

      if (objectType) {
        // 过滤掉
        if (['number', 'boolean'].includes(objectType)) {
          // do nothing
        } else {
          if (!objectTypes.includes(objectType)) objectTypes.push(objectType)
        }
      }

      if (argsType !== 'any') {
        if (!argTypes.includes(argsType)) argTypes.push(argsType)
        if (!argTypes.includes(variableType)) argTypes.push(variableType)
      }

      const matchingAliasConfigs = aliasConfigs.filter((i) => i.name === queryName)

      // 生产别名的 Hooks
      for (const item of matchingAliasConfigs) {
        const gqlName = upper(item.alias || '', '_')
        gqlNames.push(gqlName)
        const statements = getStatements(field, action, gqlName, variableType)
        methods.push({
          name: `use${pascal(item.alias || '')}`,
          parameters: [
            {
              name: 'args?',
              // TODO: 处理函数
              type: `${argsType} | (() => ${argsType})`,
            },
            {
              name: 'opt',
              type: 'Options = {}',
            },
          ],
          statements,
        })
      }

      // 非别名的hooks
      methods.push({
        name: `use${pascal(gqlName)}`,
        parameters: [
          {
            name: 'args?',
            // TODO: 处理函数
            type: `${argsType} | (() => ${argsType})`,
          },
          {
            name: 'opt',
            type: 'Options = {}',
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
      namedImports: ['Options', 'useQuery', 'useMutation'],
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
    name: 'HooksService',
    methods,
  })

  sourceFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: 'Hooks',
        initializer: `new HooksService()`,
      },
    ],
    isExported: true,
  })

  await saveSourceFile(sourceFile)
}
