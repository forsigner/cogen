import {
  Project,
  VariableDeclarationKind,
  MethodDeclarationStructure,
  PropertyDeclarationStructure,
  OptionalKind,
} from 'ts-morph'
import { capital, camel } from 'case'
import { join } from 'path'
import { saveSourceFile } from './saveSourceFile'

interface FlatItem {
  pageName: string
  path: string
}

interface RouteItem extends FlatItem {
  component: string
  routes: RouteItem[]
}

/**
 * 生成 routerService
 * @param generatedDir
 * @param routesConfig
 */
export function generateRouterlService(generatedDir: string, routesConfig: RouteItem[]) {
  const project = new Project()
  const outPath = join(generatedDir, `routerService.tsx`)
  const sourceFile = project.createSourceFile(outPath, undefined, { overwrite: true })
  const properties: OptionalKind<PropertyDeclarationStructure>[] = []
  const methods: OptionalKind<MethodDeclarationStructure>[] = []
  const flatItems = flatConfig(routesConfig)

  /**
   * 把树形的 config 扁平化
   * @param routesConfig
   * @param parent
   */
  function flatConfig(routesConfig: RouteItem[], parent = ''): FlatItem[] {
    return routesConfig.reduce<FlatItem[]>((result, item) => {
      const { component, routes } = item
      const name = component.replace(/^@\/(pages|layouts)\//, '') // 去除前缀
      const pageName = capital(camel(name), '') // 变成大驼峰
      const path = parent ? `${parent}/${item.path}` : item.path // 完整 pathname
      const flatItem: FlatItem = { pageName, path }

      if (!routes?.length) return [...result, flatItem]

      const currentParent = parent ? `${parent}/${item.path}` : item.path // 追加父级path
      const childrenData = flatConfig(routes, currentParent)
      return [...result, flatItem, ...childrenData]
    }, [])
  }

  for (const item of flatItems) {
    const { pageName, path } = item
    if (pageName === 'NotFound') continue

    const hasParams = /\/:/.test(path)

    let statements = ''
    if (!hasParams) {
      statements = `history.push('${path}')`
    } else {
      statements = `
        const path = generatePath('${path}', params);
        history.push(path)
      `
    }

    /** 生成 router method */
    methods.push({
      name: 'to' + pageName,
      parameters: hasParams ? [{ name: 'params', type: `ExtractRouteParams<'${path}'>` }] : [],
      statements,
    })
  }

  /** 获取 history 对象 */
  sourceFile.addImportDeclaration({
    moduleSpecifier: '@@/core/history',
    namedImports: ['history'],
  })

  /** react router */
  sourceFile.addImportDeclaration({
    moduleSpecifier: 'react-router',
    namedImports: ['generatePath', 'ExtractRouteParams'],
  })

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
