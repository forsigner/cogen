import {
  Project,
  VariableDeclarationKind,
  MethodDeclarationStructure,
  PropertyDeclarationStructure,
  OptionalKind,
} from 'ts-morph'
import { last } from 'lodash'
import { capital } from 'case'
import { join, sep } from 'path'
import { readdirSync } from 'fs'
import { saveSourceFile } from './saveSourceFile'

export function generateRouterlService(generatedDir: string, pagesDir: string) {
  const project = new Project()
  const outPath = join(generatedDir, `routerService.tsx`)
  const sourceFile = project.createSourceFile(outPath, undefined, { overwrite: true })
  const properties: OptionalKind<PropertyDeclarationStructure>[] = []

  sourceFile.addImportDeclaration({
    moduleSpecifier: '@generated/RootNavigation',
    namedImports: ['navigate', 'goBack'],
  })

  const paths = readdirSync(pagesDir)
  const methods: OptionalKind<MethodDeclarationStructure>[] = []

  properties.push({
    name: 'goBack',
    initializer: 'goBack',
  })

  for (const item of paths) {
    const pageName = last(item.split(sep))?.replace('.tsx', '') as string
    const PageName = capital(pageName, '')

    properties.push({
      name: PageName,
      initializer: `'${PageName}'`,
    })

    methods.push({
      name: 'to' + PageName,
      parameters: [{ name: 'params?', type: 'any' }],
      statements: `params ? navigate('${PageName}', params) : navigate('${PageName}')`,
    })
  }

  sourceFile.addClass({
    name: 'RouterService',
    properties,
    methods,
  })

  sourceFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: 'routerService',
        initializer: `new RouterService()`,
      },
    ],
    isExported: true,
  })

  saveSourceFile(sourceFile)
}
