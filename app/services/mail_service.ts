import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import edge from 'edge.js'
import mailConfig from '#config/mail'
import User from '#models/user'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

interface EmailOptions {
  to: string
  subject: string
  template: string
  data: Record<string, unknown>
}

interface ThrottleEntry {
  count: number
  firstSentAt: number
}

export default class MailService {
  private static transporter: Transporter | null = null
  private static throttleCache: Map<string, ThrottleEntry> = new Map()
  private static edgeConfigured = false


  private static getTransporter(): Transporter {
    if (!this.transporter) {
      const smtpConfig = mailConfig.mailers.smtp
      this.transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.auth.user,
          pass: smtpConfig.auth.pass,
        },
      } as nodemailer.TransportOptions)
    }
    return this.transporter
  }


  private static setupEdge(): void {
    if (this.edgeConfigured) return
    
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const viewsPath = path.resolve(__dirname, '../../resources/views')
    
    edge.mount(viewsPath)
    this.edgeConfigured = true
  }


  private static async renderTemplate(template: string, data: Record<string, unknown>): Promise<string> {
    this.setupEdge()
    return edge.render(template, data)
  }


  private static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const html = await this.renderTemplate(options.template, options.data)
      const transporter = this.getTransporter()

      await transporter.sendMail({
        from: `"${mailConfig.from.name}" <${mailConfig.from.address}>`,
        to: options.to,
        subject: options.subject,
        html,
      })

      console.log(`Email sent successfully to ${options.to}: ${options.subject}`)
      return true
    } catch (error) {
      console.error('Failed to send email:', error)
      return false
    }
  }


  private static shouldThrottleLoginEmail(userId: number): boolean {
    const key = `login_email_${userId}`
    const now = Date.now()
    const { windowMs, maxPerWindow } = mailConfig.throttle.loginEmail
    
    const entry = this.throttleCache.get(key)
    
    if (!entry) {
      return false
    }

    if (now - entry.firstSentAt > windowMs) {
      this.throttleCache.delete(key)
      return false
    }

    return entry.count >= maxPerWindow
  }


  private static recordLoginEmailSent(userId: number): void {
    const key = `login_email_${userId}`
    const now = Date.now()
    const entry = this.throttleCache.get(key)

    if (!entry || now - entry.firstSentAt > mailConfig.throttle.loginEmail.windowMs) {
      this.throttleCache.set(key, { count: 1, firstSentAt: now })
    } else {
      entry.count++
    }
  }


  static async sendWelcomeEmail(user: User): Promise<boolean> {
    if (!user.email) {
      console.warn('Cannot send welcome email: user has no email')
      return false
    }

    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to Social Auth App!',
      template: 'emails/welcome',
      data: {
        userName: user.fullName || 'there',
        userEmail: user.email,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
        year: new Date().getFullYear(),
      },
    })
  }


  static async sendLoginSuccessEmail(user: User, metadata?: { ipAddress?: string; userAgent?: string }): Promise<boolean> {
    if (!user.email) {
      console.warn('Cannot send login email: user has no email')
      return false
    }

    if (this.shouldThrottleLoginEmail(user.id)) {
      console.log(`Login email throttled for user ${user.id}`)
      return false
    }

    const success = await this.sendEmail({
      to: user.email,
      subject: 'New Login to Your Account',
      template: 'emails/login-success',
      data: {
        userName: user.fullName || 'there',
        userEmail: user.email,
        loginTime: new Date().toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        }),
        ipAddress: metadata?.ipAddress || 'Unknown',
        userAgent: metadata?.userAgent || 'Unknown',
        securityUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings/security`,
        year: new Date().getFullYear(),
      },
    })

    if (success) {
      this.recordLoginEmailSent(user.id)
    }

    return success
  }


  static async verifyConnection(): Promise<boolean> {
    try {
      const transporter = this.getTransporter()
      await transporter.verify()
      console.log('SMTP connection verified successfully')
      return true
    } catch (error) {
      console.error('SMTP connection verification failed:', error)
      return false
    }
  }


  static clearThrottleCache(): void {
    this.throttleCache.clear()
  }
}
