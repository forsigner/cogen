import { Project, VariableDeclarationKind } from 'ts-morph'
import { join, sep } from 'path'
import { last } from 'lodash'
import { readdirSync } from 'fs'
import { saveSourceFile } from './saveSourceFile'

export function generateModalContainer(
  generatedDir: string,
  modalsDir: string,
  moduleSpecifier: string,
) {
  const project = new Project()
  const outPath = join(generatedDir, `ModalContainer.tsx`)
  const sourceFile = project.createSourceFile(outPath, undefined, { overwrite: true })
  const paths = readdirSync(modalsDir)

  sourceFile.addImportDeclarations([
    {
      moduleSpecifier: 'react',
      defaultImport: 'React',
    },
    {
      moduleSpecifier,
      namedImports: ['Modals', 'ModalConfig'],
    },
  ])

  let configString = ''
  for (const item of paths) {
    const modalName = last(item.split(sep))?.replace('.tsx', '')

    configString += `{
      name: '${modalName}',
      component: ${modalName},
    },`

    // import Modal Component
    sourceFile.addImportDeclaration({
      moduleSpecifier: `@modals/${modalName}`,
      defaultImport: modalName,
    })
  }

  const configInitializer = `[${configString}]`

  sourceFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: 'config',
        type: 'ModalConfig',
        initializer: configInitializer,
      },
    ],
    isExported: true,
  })

  // 组件
  sourceFile.addFunction({
    name: 'ModalContainer',
    statements: `
      return (
          <Modals config={config}></Modals>
      )
    `,
    isExported: true,
  })

  saveSourceFile(sourceFile)
}
