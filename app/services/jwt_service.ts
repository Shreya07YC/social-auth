import jwt from 'jsonwebtoken'
import env from '#start/env'
import User from '#models/user'

interface JwtPayload {
  userId: number
  email: string
}

export default class JwtService {
  private static secret = env.get('JWT_SECRET')
  private static expiresIn = '7d'

  static generateToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email!,
    }
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn })
  }

  static verifyToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, this.secret) as JwtPayload
    } catch {
      return null
    }
  }

  static async getUserFromToken(token: string): Promise<User | null> {
    const payload = this.verifyToken(token)
    if (!payload) return null
    return User.find(payload.userId)
  }
}
