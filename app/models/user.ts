import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, beforeSave } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import bcrypt from 'bcrypt'
import Upload from '#models/upload'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fullName: string | null

  @column()
  declare email: string | null

  @column({ serializeAs: null })
  declare password: string | null

  @column()
  declare provider: string | null

  @column()
  declare providerId: string | null

  @column()
  declare avatarUrl: string | null

  @column()
  declare role: 'user' | 'admin'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => Upload)
  declare uploads: HasMany<typeof Upload>

  @beforeSave()
  static async hashPassword(user: User) {
    if (user.$dirty.password && user.password) {
      user.password = await bcrypt.hash(user.password, 10)
    }
  }

  async verifyPassword(plainPassword: string): Promise<boolean> {
    if (!this.password) return false
    return bcrypt.compare(plainPassword, this.password)
  }
}
