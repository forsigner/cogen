import './global.less'

import { config, applyMiddleware } from 'stook-graphql'

applyMiddleware(async (ctx, next) => {
  await next()
  if (typeof ctx.body !== 'object') return
  if (Object.keys(ctx.body).length === 1) {
    ctx.body = ctx.body[Object.keys(ctx.body)[0]]
  }
})

const endpoint = 'https://graphql.anilist.co'

config({ endpoint })
