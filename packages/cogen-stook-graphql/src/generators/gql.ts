import { Project, VariableDeclarationKind } from 'ts-morph'
import { join } from 'path'
import { upper } from 'case'

import saveSourceFile from '../utils/saveSourceFile'
import { generate } from '../gqlgen'
import { GqlConfig } from '../types'
import { CogenConfig } from '@cogen/cli'

function genGQL(outPath: string, data: any) {
  const project = new Project()
  const sourceFile = project.createSourceFile(outPath, undefined, {
    overwrite: true,
  })

  // import gql-tag
  sourceFile.addImportDeclaration({
    moduleSpecifier: 'gql-tag',
    defaultImport: 'gql',
  })

  for (const item of data) {
    sourceFile.addVariableStatement({
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: upper(item.name, '_'),
          initializer: 'gql' + '`' + '\n' + item.query + '\n' + '`',
        },
      ],
      isExported: true,
    })
  }

  saveSourceFile(sourceFile)
}

export function generateGql(config: CogenConfig, gqlConfigItem: GqlConfig) {
  const { generatedDir = '' } = config
  if (!gqlConfigItem || !gqlConfigItem.length) return
  const data = generate(config, gqlConfigItem)

  const outPath = join(generatedDir, 'gql.ts')
  genGQL(outPath, data)
}
