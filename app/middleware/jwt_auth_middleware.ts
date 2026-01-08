import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import JwtService from '#services/jwt_service'

export default class JwtAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const authHeader = ctx.request.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ctx.response.unauthorized({ error: 'Missing or invalid authorization header' })
    }

    const token = authHeader.substring(7)
    const user = await JwtService.getUserFromToken(token)

    if (!user) {
      return ctx.response.unauthorized({ error: 'Invalid or expired token' })
    }

    ctx.request.user = user
    return next()
  }
}

declare module '@adonisjs/core/http' {
  interface Request {
    user?: import('#models/user').default
  }
}
