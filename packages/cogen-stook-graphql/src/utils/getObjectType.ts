import { FieldDefinitionNode } from 'graphql'
import get from 'lodash.get'

/**
 * 获取返回类型
 * @param field
 */
export function getObjectType(field: FieldDefinitionNode): string {
  // TODO:  可能不准
  function checkIsListType(field: FieldDefinitionNode) {
    const kinds = [
      // get(field, 'type.type.type.type.type.kind'),
      // get(field, 'type.type.type.type.kind'),
      // get(field, 'type.type.type.kind'),
      get(field, 'type.type.kind'),
      get(field, 'type.kind'),
    ]
    return kinds.includes('ListType')
  }

  // TODO: 这个暂时没找到规律
  function getType(field: FieldDefinitionNode) {
    return (
      get(field, 'type.type.type.type.type.name.value') ||
      get(field, 'type.type.type.type.name.value') ||
      get(field, 'type.type.type.name.value') ||
      get(field, 'type.type.name.value') ||
      get(field, 'type.name.value')
    )
  }
  const type = getType(field)
  const isListType = checkIsListType(field)

  let objectType: string
  if (isListType) {
    // TODO: 没考虑 Boolean Float 等
    objectType = `${type}[]`
  } else if (type === 'Boolean') {
    objectType = 'boolean'
  } else if (type === 'Float') {
    objectType = 'number'
  } else {
    objectType = type
  }

  return objectType
}
