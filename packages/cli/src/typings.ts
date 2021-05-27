export interface CogenConfig {
  /**
   * default is root dir "./", you can set to './src'
   */
  baseDir?: string

  /**
   * set generated dir,
   */
  generatedDir?: string

  /**
   * plugin name list
   */
  plugins?: (string | Function)[]

  [key: string]: any
}
