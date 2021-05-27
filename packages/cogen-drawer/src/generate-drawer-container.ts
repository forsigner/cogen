import { Project, VariableDeclarationKind } from 'ts-morph'
import { join, sep } from 'path'
import { last } from 'lodash'
import { readdirSync, existsSync } from 'fs'
import { saveSourceFile } from './saveSourceFile'

export function generateDrawerContainer(
  generatedDir: string,
  drawersDir: string,
  moduleSpecifier: string,
) {
  const project = new Project()
  const outPath = join(generatedDir, `DrawerContainer.tsx`)
  const sourceFile = project.createSourceFile(outPath, undefined, {
    overwrite: true,
  })
  const paths = existsSync(drawersDir) ? readdirSync(drawersDir) : []

  sourceFile.addImportDeclarations([
    {
      moduleSpecifier: 'react',
      defaultImport: 'React',
    },
    {
      moduleSpecifier,
      namedImports: ['Drawers', 'DrawerConfig'],
    },
  ])

  let configString = ''
  for (const item of paths) {
    const drawerName = last(item.split(sep))?.replace('.tsx', '')

    configString += `{
      name: '${drawerName}',
      component: ${drawerName},
    },`

    // import Drawer Component
    sourceFile.addImportDeclaration({
      moduleSpecifier: `@drawers/${drawerName}`,
      defaultImport: drawerName,
    })
  }

  const configInitializer = `[${configString}]`

  sourceFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: 'config',
        type: 'DrawerConfig',
        initializer: configInitializer,
      },
    ],
    isExported: true,
  })

  // 组件
  sourceFile.addFunction({
    name: 'DrawerContainer',
    statements: `
      return (
          <Drawers config={config}></Drawers>
      )
    `,
    isExported: true,
  })

  saveSourceFile(sourceFile)
}
