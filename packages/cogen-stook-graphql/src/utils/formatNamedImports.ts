export function formatNamedImports(...args: any[]) {
  const arr = args.reduce((r, c) => {
    return r.concat(c)
  }, [] as string[])

  const uniqData: any[] = Array.from(new Set(arr))

  return uniqData.filter((i) => typeof i == 'string')
}
