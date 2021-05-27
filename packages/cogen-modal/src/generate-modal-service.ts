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

export function generateModalService(
  generatedDir: string,
  modalsDir: string,
  moduleSpecifier: string,
) {
  const project = new Project()
  const outPath = join(generatedDir, `modalService.tsx`)
  const sourceFile = project.createSourceFile(outPath, undefined, { overwrite: true })
  const properties: OptionalKind<PropertyDeclarationStructure>[] = []

  sourceFile.addImportDeclaration({
    moduleSpecifier,
    namedImports: ['modalStore'],
  })

  sourceFile.addVariableStatements([
    {
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: 'open',
          initializer: 'modalStore.open',
        },
        {
          name: 'close',
          initializer: 'modalStore.close',
        },
        {
          name: 'get',
          initializer: 'modalStore.get',
        },
      ],
    },
  ])

  const paths = existsSync(modalsDir) ? readdirSync(modalsDir) : []
  const methods: OptionalKind<MethodDeclarationStructure>[] = []

  for (const item of paths) {
    const modalName = last(item.split(sep))?.replace('.tsx', '') as string

    properties.push({
      name: modalName,
      initializer: `'${modalName}'`,
    })

    methods.push({
      name: 'open' + modalName,
      parameters: [{ name: 'data?', type: 'any' }],
      statements: `data ? open('${modalName}', data) : open('${modalName}')`,
    })

    methods.push({
      name: 'close' + modalName,
      statements: `close('${modalName}')`,
    })

    methods.push({
      name: 'get' + modalName + '<T>',
      returnType: '{ visible: boolean; data: T; name: string }',
      statements: `return get('${modalName}') as any`,
    })
  }

  sourceFile.addClass({
    name: 'ModalService',
    properties,
    methods,
  })

  sourceFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: 'modalService',
        initializer: `new ModalService()`,
      },
    ],
    isExported: true,
  })

  saveSourceFile(sourceFile)
}
