import { resolve, parse } from 'path'
import fg from 'fast-glob'
import deepmerge from 'deepmerge'

import { Platforms, platforms } from './platforms'
import { importModule } from './import-module'
import { Shape, TokensMap, ThemeTokens, Meta } from './types'

type ThemeLayers = Shape<
  Shape<
    {
      name: string
      tokens: TokensMap
    } & Meta
  >
>

export async function getThemeLayers(
  source: string,
  options: { platforms?: Platforms } = {},
): Promise<ThemeLayers> {
  const result: ThemeLayers = {}
  const files = await fg(source)
  for (const fileName of files) {
    const fn = await importModule<ThemeTokens>(resolve(fileName))
    const maybeFn = fn()
    const data = typeof maybeFn === 'function' ? maybeFn() : maybeFn
    const { name } = parse(fileName)
    for (const [platform, levels] of platforms) {
      if (options.platforms !== undefined && !options.platforms.includes(platform)) {
        continue
      }
      const composedLevels = []
      for (const level of levels) {
        if (data[level] !== undefined) {
          composedLevels.push(data[level])
        }
      }
      if (result[platform] === undefined) {
        result[platform] = {}
      }
      const { meta, ...tokens } = deepmerge.all<TokensMap & Meta>(composedLevels)
      result[platform][fileName] = {
        meta,
        name,
        tokens,
      }
    }
  }
  return result
}
