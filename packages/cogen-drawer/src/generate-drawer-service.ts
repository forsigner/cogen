import {
  Project,
  VariableDeclarationKind,
  MethodDeclarationStructure,
  PropertyDeclarationStructure,
  OptionalKind,
} from 'ts-morph'
import { last } from 'lodash'
import { join, sep } from 'path'
import { readdirSync, existsSync } from 'fs'
import { saveSourceFile } from './saveSourceFile'

export function generateDrawerService(
  generatedDir: string,
  drawersDir: string,
  moduleSpecifier: string,
) {
  const project = new Project()
  const outPath = join(generatedDir, 'drawerService.tsx')
  const paths = existsSync(drawersDir) ? readdirSync(drawersDir) : []
  const sourceFile = project.createSourceFile(outPath, undefined, {
    overwrite: true,
  })

  sourceFile.addImportDeclaration({
    moduleSpecifier,
    namedImports: ['drawerStore'],
  })

  sourceFile.addVariableStatements([
    {
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: 'open',
          initializer: 'drawerStore.open',
        },
        {
          name: 'close',
          initializer: 'drawerStore.close',
        },
        {
          name: 'get',
          initializer: 'drawerStore.get',
        },
      ],
    },
  ])

  const methods: OptionalKind<MethodDeclarationStructure>[] = []
  const properties: OptionalKind<PropertyDeclarationStructure>[] = []

  for (const item of paths) {
    const drawerName = last(item.split(sep))?.replace('.tsx', '') as string

    properties.push({
      name: drawerName,
      initializer: `'${drawerName}'`,
    })

    methods.push({
      name: 'open' + drawerName,
      parameters: [{ name: 'data?', type: 'any' }],
      statements: `data ? open('${drawerName}', data) : open('${drawerName}')`,
    })

    methods.push({
      name: 'close' + drawerName,
      statements: `close('${drawerName}')`,
    })

    methods.push({
      name: 'get' + drawerName + '<T>',
      returnType: '{ visible: boolean; data: T; name: string }',
      statements: `return get('${drawerName}') as any`,
    })
  }

  sourceFile.addClass({
    name: 'DrawerService',
    properties,
    methods,
  })

  sourceFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: 'drawerService',
        initializer: `new DrawerService()`,
      },
    ],
    isExported: true,
  })

  saveSourceFile(sourceFile)
}
