import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE').nullable()
      table.string('title', 255).notNullable()
      table.text('body').notNullable()
      table.string('type', 50).notNullable() 
      table.json('data').nullable()
      table.boolean('is_read').defaultTo(false)
      table.boolean('for_admins').defaultTo(false) 
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.index(['user_id', 'is_read'])
      table.index(['for_admins', 'is_read'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
