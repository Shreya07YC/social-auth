import env from '#start/env'

const mailConfig = {
  default: 'smtp',

  mailers: {
    smtp: {
      host: env.get('SMTP_HOST') || 'smtp.gmail.com',
      port: Number(env.get('SMTP_PORT')) || 587,
      secure: Boolean(env.get('SMTP_SECURE')),
      auth: {
        user: env.get('SMTP_USER') || '',
        pass: env.get('SMTP_PASSWORD') || '',
      },
    },
  },

  from: {
    address: env.get('MAIL_FROM_ADDRESS') || 'noreply@example.com',
    name: env.get('MAIL_FROM_NAME') || 'Social Auth App',
  },

  // Throttle settings (in milliseconds)
  throttle: {
    loginEmail: {
      windowMs: Number(env.get('MAIL_THROTTLE_WINDOW_MS')) || 300000, // 5 minutes
      maxPerWindow: Number(env.get('MAIL_THROTTLE_MAX')) || 1,
    },
  },
}

export default mailConfig
