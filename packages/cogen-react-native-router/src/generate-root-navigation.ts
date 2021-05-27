import { Project, VariableDeclarationKind } from 'ts-morph'
import { join } from 'path'
import { saveSourceFile } from './saveSourceFile'

export function generateRootNavigation(generatedDir: string) {
  const project = new Project()
  const outPath = join(generatedDir, `RootNavigation.tsx`)
  const sourceFile = project.createSourceFile(outPath, undefined, { overwrite: true })

  sourceFile.addImportDeclaration({
    moduleSpecifier: 'react',
    defaultImport: 'React',
  })

  sourceFile.addVariableStatement({
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: 'navigationRef',
        initializer: 'React.createRef<any>()',
      },
    ],
  })

  sourceFile.addFunction({
    isExported: true,
    name: 'navigate',
    parameters: [
      {
        name: 'name',
        type: 'string',
      },
      {
        name: 'params?',
        type: 'any',
      },
    ],
    statements: `
      // eslint-disable-next-line no-unused-expressions
      navigationRef.current?.navigate(name, params)
    `,
  })

  sourceFile.addFunction({
    isExported: true,
    name: 'goBack',
    statements: `
    // eslint-disable-next-line no-unused-expressions
    navigationRef.current?.goBack()
    `,
  })

  saveSourceFile(sourceFile)
}
