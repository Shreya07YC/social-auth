import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class SetAdmin extends BaseCommand {
  static commandName = 'set:admin'
  static description = 'Set a user as admin by email'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ description: 'Email of the user to make admin' })
  declare email: string

  async run() {
    const { default: User } = await import('#models/user')
    
    const user = await User.findBy('email', this.email)
    
    if (!user) {
      this.logger.error(`User with email "${this.email}" not found`)
      return
    }

    user.role = 'admin'
    await user.save()

    this.logger.success(`User "${user.fullName}" (${user.email}) is now an admin!`)
  }
}
