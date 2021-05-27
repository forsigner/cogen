import {
  Project,
  VariableDeclarationKind,
  MethodDeclarationStructure,
  PropertyDeclarationStructure,
  OptionalKind,
} from 'ts-morph'
import { last } from 'lodash'
import { join, sep, resolve } from 'path'
import { readdirSync } from 'fs'
import { saveSourceFile } from './saveSourceFile'

export function generateModalService(
  generatedDir: string,
  modalsDir: string,
  moduleSpecifier: string,
  modalsSpecifier: string
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
        {
          name: 'set',
          initializer: 'modalStore.set',
        },
      ],
    },
  ])

  const paths = readdirSync(modalsDir)
  const methods: OptionalKind<MethodDeclarationStructure>[] = []

  for (const item of paths) {
    const modalName = last(item.split(sep))?.replace('.tsx', '') as string
    const modalDataType = `${modalName}ModalData`

    // 添加类型
    const source = new Project().addSourceFileAtPath(resolve(modalsDir, item))
    const hasExportType = source.getInterface('ModalData')
    const dataType = hasExportType ? modalDataType : 'any'

    if (hasExportType) {
      // 添加类型申明
      sourceFile.addImportDeclaration({
        moduleSpecifier: `${modalsSpecifier}/${modalName}`,
        namedImports: [`ModalData as ${modalDataType}`],
      })
    }

    properties.push({
      name: modalName,
      initializer: `'${modalName}'`,
    })

    methods.push({
      name: 'open' + modalName,
      parameters: [{ name: 'data?', type: dataType }],
      statements: `data ? open('${modalName}', data) : open('${modalName}')`,
    })

    methods.push({
      name: 'close' + modalName,
      statements: `close('${modalName}')`,
    })

    methods.push({
      name: 'get' + modalName,
      returnType: `{ visible: boolean; data: ${dataType} ; name: string }`,
      statements: `return get('${modalName}') as any`,
    })

    methods.push({
      name: 'set' + modalName,
      parameters: [{ name: 'data?', type: dataType }],
      statements: `set('${modalName}', data) as any`,
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
