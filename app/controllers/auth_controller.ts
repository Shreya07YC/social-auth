import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import JwtService from '#services/jwt_service'
import MailService from '#services/mail_service'
import PushNotificationService from '#services/push_notification_service'
import { registerValidator, loginValidator } from '#validators/auth_validator'
import env from '#start/env'

export default class AuthController {

  private getRequestMetadata(request: HttpContext['request']) {
    return {
      ipAddress: request.ip(),
      userAgent: request.header('user-agent') || 'Unknown',
    }
  }

  async register({ request, response }: HttpContext) {
    const data = await request.validateUsing(registerValidator)

    const existingUser = await User.findBy('email', data.email)
    if (existingUser) {
      return response.conflict({ error: 'Email already registered' })
    }

    const user = await User.create({
      fullName: data.name,
      email: data.email,
      password: data.password,
      provider: 'email',
    })

    const token = JwtService.generateToken(user)

    const metadata = this.getRequestMetadata(request)
    this.sendRegistrationEmails(user, metadata)

    // Notify admins about new registration
    PushNotificationService.onUserRegistered(user, 'Email').catch((err) =>
      console.error('Failed to send push notification:', err)
    )

    return response.created({
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
      },
    })
  }


  async login({ request, response }: HttpContext) {
    try {
      const data = await request.validateUsing(loginValidator)

      const user = await User.findBy('email', data.email)
      if (!user) {
        return response.unauthorized({ error: 'Invalid email or password' })
      }

      if (!user.password) {
        return response.unauthorized({
          error: 'This account uses Google login. Please sign in with Google.',
        })
      }

      const isValid = await user.verifyPassword(data.password)
      if (!isValid) {
        return response.unauthorized({ error: 'Invalid email or password' })
      }

      const token = JwtService.generateToken(user)

      const metadata = this.getRequestMetadata(request)
      MailService.sendLoginSuccessEmail(user, metadata).catch((err) =>
        console.error('Failed to send login email:', err)
      )

      // Notify admins about user login
      PushNotificationService.onUserLogin(user).catch((err) =>
        console.error('Failed to send push notification:', err)
      )

      return response.ok({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.fullName,
          email: user.email,
          avatar: user.avatarUrl,
        },
      })
    } catch (error) {
      console.error('Login error:', error)
      return response.badRequest({ error: 'Login failed. Please check your credentials.' })
    }
  }

  async redirectToGoogle({ ally }: HttpContext) {
    return ally.use('google').redirect((request) => {
      request.param('prompt', 'select_account')
      request.param('access_type', 'offline')
    })
  }


  async handleGoogleCallback({ ally, request, response }: HttpContext) {
    const frontendUrl = env.get('FRONTEND_URL')
    const google = ally.use('google')

    if (google.accessDenied()) {
      return response.redirect(`${frontendUrl}/login?error=access_denied`)
    }

    if (google.stateMisMatch()) {
      return response.redirect(`${frontendUrl}/login?error=state_mismatch`)
    }

    if (google.hasError()) {
      console.error('Google OAuth error:', google.getError())
      return response.redirect(`${frontendUrl}/login?error=oauth_error`)
    }

    try {
      const googleUser = await google.user()
      const metadata = this.getRequestMetadata(request)

      let user = await User.findBy('email', googleUser.email)
      let isNewUser = false

      if (user) {
        user.providerId = googleUser.id
        user.avatarUrl = googleUser.avatarUrl
        user.fullName = googleUser.name
        if (!user.provider) user.provider = 'google'
        await user.save()
      } else {
        isNewUser = true
        user = await User.create({
          fullName: googleUser.name,
          email: googleUser.email,
          provider: 'google',
          providerId: googleUser.id,
          avatarUrl: googleUser.avatarUrl,
        })
      }

      const token = JwtService.generateToken(user)

      if (isNewUser) {
        this.sendRegistrationEmails(user, metadata)
        // Notify admins about new Google registration
        PushNotificationService.onUserRegistered(user, 'Google').catch((err) =>
          console.error('Failed to send push notification:', err)
        )
      } else {
        MailService.sendLoginSuccessEmail(user, metadata).catch((err) =>
          console.error('Failed to send login email:', err)
        )
        // Notify admins about Google login
        PushNotificationService.onUserLogin(user).catch((err) =>
          console.error('Failed to send push notification:', err)
        )
      }

      return response.redirect(`${frontendUrl}/auth/callback?token=${token}`)
    } catch (error) {
      console.error('Error during Google authentication:', error)
      return response.redirect(`${frontendUrl}/login?error=server_error`)
    }
  }
  private async sendRegistrationEmails(
    user: User,
    metadata: { ipAddress: string; userAgent: string }
  ): Promise<void> {
    try {
      await MailService.sendWelcomeEmail(user)
      await MailService.sendLoginSuccessEmail(user, metadata)
    } catch (error) {
      console.error('Failed to send registration emails:', error)
    }
  }

  async me({ request, response }: HttpContext) {
    const user = request.user
    if (!user) {
      return response.unauthorized({ error: 'Not authenticated' })
    }

    return response.ok({
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
        avatar: user.avatarUrl,
        provider: user.provider,
      },
    })
  }

  async verifyToken({ request, response }: HttpContext) {
    const user = request.user
    if (!user) {
      return response.unauthorized({ valid: false })
    }
    return response.ok({ valid: true, userId: user.id })
  }
}
