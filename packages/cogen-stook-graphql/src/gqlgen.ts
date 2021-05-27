import { Source, buildSchema, GraphQLObjectType } from 'graphql'
import fs from 'fs'
import path from 'path'
import { GqlConfig, GraphQLData, GenerateQueryParams } from './types'
import { CogenConfig } from '@cogen/cli'

let gqlSchema: any

function initGqlSchema(generatedDir = '') {
  const schemaFilePath = path.join(generatedDir, 'schema.graphql')
  const typeDef = fs.readFileSync(schemaFilePath, 'utf-8')
  const source = new Source(typeDef)
  gqlSchema = buildSchema(source)
}

/**
 * Generate variables string
 * @param dict dictionary of arguments
 */
const getArgsToVarsStr = (dict: any) =>
  Object.entries(dict)
    .map(([varName, arg]: any) => `${arg.name}: $${varName}`)
    .join(', ')

/**
 * Generate types string
 * @param dict dictionary of arguments
 */
const getVarsToTypesStr = (dict: any) =>
  Object.entries(dict)
    .map(([varName, arg]: any) => `$${varName}: ${arg.type}`)
    .join(', ')

/**
 * Compile arguments dictionary for a field
 * @param field current field object
 * @param duplicateArgCounts map for deduping argument name collisions
 * @param allArgsDict dictionary of all arguments
 */
const getFieldArgsDict = (field: any, duplicateArgCounts: any, allArgsDict: any = {}) =>
  field.args.reduce((o: any, arg: any) => {
    if (arg.name in duplicateArgCounts) {
      const index = duplicateArgCounts[arg.name] + 1
      duplicateArgCounts[arg.name] = index
      o[`${arg.name}${index}`] = arg
    } else if (allArgsDict[arg.name]) {
      duplicateArgCounts[arg.name] = 1
      o[`${arg.name}1`] = arg
    } else {
      o[arg.name] = arg
    }
    return o
  }, {})

export function generate(config: CogenConfig, gqlConfig: GqlConfig): GraphQLData {
  // TODO
  initGqlSchema(config.generatedDir)
  const types = ['Query', 'Mutation', 'Subscription']
  return types.reduce(
    (result, type) => result.concat(generateByType(type, gqlConfig)),
    [] as GraphQLData,
  )
}

export function generateByType(type: string, config: GqlConfig): GraphQLData {
  const data: GraphQLData = []
  const objectType: GraphQLObjectType = (gqlSchema as any)[`get${type}Type`]()

  if (!objectType) return []
  const fields = objectType.getFields()

  // 所有端点的名称
  const fieldKeys = Object.keys(fields)

  // 那配置中有效的端点
  const validConfig = config.filter((i) => fieldKeys.includes(i.name))

  validConfig.forEach((item) => {
    const nameType = gqlSchema.getType(type)

    if (nameType && 'getFields' in nameType) {
      const field = nameType.getFields()[item.name]

      if (field && 'isDeprecated' in field && !field.isDeprecated) {
        const queryResult = generateQuery({
          curName: item.name,
          curParentType: type,
          depthLimit: item.depthLimit || 2,
          excludes: item.excludes || [],
          trace: '',
        })

        const varsToTypesStr = getVarsToTypesStr(queryResult.argumentsDict)
        let query = queryResult.queryStr
        query = `${type.toLowerCase()} ${item.alias || item.name}${
          varsToTypesStr ? `(${varsToTypesStr})` : ''
        }{\n${query}\n}`
        data.push({ name: item.alias || item.name, query })
      }
    }
  })
  return data
}

function generateQuery(params: GenerateQueryParams): any {
  const {
    curName,
    curParentType,
    curParentName,
    argumentsDict = {},
    duplicateArgCounts = {},
    crossReferenceKeyList = [],
    curDepth = 1,
    depthLimit = 2,
    excludes = [],
  } = params
  let trace = params.trace

  if (excludes.includes(trace)) return { queryStr: '', argumentsDict: [] }

  trace += trace ? `.${curName}` : `${curName}`

  const queryType: any = gqlSchema.getType(curParentType)
  const field = queryType.getFields()[curName]

  const curTypeName = field.type.inspect().replace(/[[\]!]/g, '')
  const curType: any = gqlSchema.getType(curTypeName)

  let queryStr = ''
  let childQuery = ''

  if (curType.getFields) {
    const crossReferenceKey = `${curParentName}To${curName}Key`

    // if (crossReferenceKeyList.indexOf(crossReferenceKey) !== -1 || curDepth > depthLimit) return ''
    if (curDepth > depthLimit) return ''

    crossReferenceKeyList.push(crossReferenceKey)
    const childKeys = Object.keys(curType.getFields())

    childQuery = childKeys
      .filter((fieldName) => {
        /* Exclude deprecated fields */
        const fieldTrace = trace ? `${trace}.${fieldName}` : fieldName
        if (excludes.includes(fieldTrace)) return false

        const queryType: any = gqlSchema.getType(curType)
        const fieldSchema = queryType.getFields()[fieldName]
        if (excludes.includes(fieldName)) return false
        return !fieldSchema.isDeprecated
      })
      .map(
        (cur) =>
          generateQuery({
            curName: cur,
            curParentType: curType,
            curParentName: curName,
            argumentsDict: argumentsDict,
            duplicateArgCounts: duplicateArgCounts,
            crossReferenceKeyList: crossReferenceKeyList,
            curDepth: curDepth + 1,
            depthLimit,
            excludes,
            trace,
          }).queryStr,
      )
      .filter((cur) => cur)
      .join('\n')
  }

  if (!(curType.getFields && !childQuery)) {
    queryStr = `${'    '.repeat(curDepth)}${field.name}`
    if (field.args.length > 0) {
      const dict = getFieldArgsDict(field, duplicateArgCounts, argumentsDict)
      Object.assign(argumentsDict, dict)
      queryStr += `(${getArgsToVarsStr(dict)})`
    }
    if (childQuery) {
      queryStr += `{\n${childQuery}\n${'    '.repeat(curDepth)}}`
    }
  }

  /* Union types */
  if (curType.astNode && curType.astNode.kind === 'UnionTypeDefinition') {
    const types = curType.getTypes()
    if (types && types.length) {
      const indent = `${'    '.repeat(curDepth)}`
      const fragIndent = `${'    '.repeat(curDepth + 1)}`
      queryStr += '{\n'

      for (let i = 0, len = types.length; i < len; i++) {
        const valueTypeName = types[i]
        const valueType: any = gqlSchema.getType(valueTypeName)
        const unionChildQuery = Object.keys(valueType.getFields())
          .map(
            (cur) =>
              generateQuery({
                curName: cur,
                curParentType: valueType,
                curParentName: curName,
                argumentsDict: argumentsDict,
                duplicateArgCounts: duplicateArgCounts,
                crossReferenceKeyList: crossReferenceKeyList,
                curDepth: curDepth + 2,
                depthLimit: 2,
                excludes,
                trace,
              }).queryStr,
          )
          .filter((cur) => cur)
          .join('\n')
        queryStr += `${fragIndent}... on ${valueTypeName} {\n${unionChildQuery}\n${fragIndent}}\n`
      }
      queryStr += `${indent}}`
    }
  }

  return { queryStr, argumentsDict }
}
