import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'fcm_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.string('token', 500).notNullable()
      table.string('device_type', 50).nullable()
      table.string('device_name', 100).nullable()
      table.boolean('is_active').defaultTo(true)
      table.timestamp('last_used_at').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['user_id', 'token'])
      table.index(['user_id', 'is_active'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
