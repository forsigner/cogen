import {
  Project,
  VariableDeclarationKind,
  MethodDeclarationStructure,
  OptionalKind,
} from 'ts-morph'

import { pascal, upper } from 'case'
import get from 'lodash.get'
import { join } from 'path'
import { readFileSync } from 'fs'
import { parse, ObjectTypeDefinitionNode } from 'graphql'
import saveSourceFile from '../utils/saveSourceFile'
import { formatNamedImports } from '../utils/formatNamedImports'
import { ConfigItem, StookGraphqlConfig } from '../types'
import { getObjectType } from '../utils/getObjectType'
import { CogenConfig } from '@cogen/cli'

type Operation = 'Query' | 'Mutation'

function getStatements(gqlName: string, objectType: string): string {
  return `mutate(${gqlName}, (state: Result<${objectType}>)  => {
  fn(state.data)
})
`
}

/**
 * 生产 mutator
 *
 * @export
 * @param {string} gqlConstantModule
 * @param {string[]} mutatorConfig
 */
export async function generateMutator(
  config: CogenConfig,
  stookGraphql: StookGraphqlConfig,
  mutatorConfig: string[] = [],
  gqlConfig: ConfigItem[],
) {
  const project = new Project()
  const { generatedDir = '' } = config
  const httpModule = stookGraphql.httpModule!
  const gqlConstantModule = stookGraphql.gqlConstantModule!

  const outPath = join(generatedDir, `mutator.ts`)
  const sdlPath = join(generatedDir, 'schema.graphql')
  const sdl = parse(readFileSync(sdlPath, { encoding: 'utf8' })) // GraphQL sdl string
  const sourceFile = project.createSourceFile(outPath, undefined, { overwrite: true })
  const methods: OptionalKind<MethodDeclarationStructure>[] = []
  const objectTypes: string[] = []
  const gqlNames: string[] = [] // graphQL query name, 例如： USERS、USERS_CONECTION

  // 有效的 alias config
  const aliasConfigs = gqlConfig.filter((i) => mutatorConfig.includes(i.alias || ''))

  // 把 alias 也转换成 name
  const realNames = mutatorConfig.map((name) => {
    const find = gqlConfig.find((i) => i.alias === name)
    return find ? find.name : name
  })

  for (const def of sdl.definitions) {
    // 端点的名称，如 Query,User,Users
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

      // 生产别名的 Hooks
      for (const item of matchingAliasConfigs) {
        const gqlName = upper(item.alias || '', '_')
        gqlNames.push(gqlName)
        const statements = getStatements(gqlName, objectType)
        methods.push({
          name: `mutate${pascal(item.alias || '')}`,
          returnType: 'void',
          parameters: [
            {
              name: 'fn',
              type: `(state: ${objectType}) => void`,
            },
          ],
          statements,
        })
      }

      // 非别名的 mutator
      const statements = getStatements(gqlName, objectType)
      methods.push({
        name: `mutate${pascal(queryName)}`,
        returnType: 'void',
        parameters: [
          {
            name: 'fn',
            type: `(state: ${objectType}) => void`,
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
      namedImports: ['Result'],
    })

    // import stook
    sourceFile.addImportDeclaration({
      moduleSpecifier: 'stook',
      namedImports: ['mutate'],
    })
    sourceFile.addImportDeclaration({
      moduleSpecifier: gqlConstantModule,
      namedImports: [...formatNamedImports(gqlNames)],
    })

    sourceFile.addImportDeclaration({
      moduleSpecifier: '@generated/types',
      namedImports: [...formatNamedImports(objectTypes)],
    })
  }

  sourceFile.addClass({
    name: 'MutatorService',
    methods,
  })

  sourceFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: 'Mutator',
        initializer: `new MutatorService()`,
      },
    ],
    isExported: true,
  })

  await saveSourceFile(sourceFile)
}
