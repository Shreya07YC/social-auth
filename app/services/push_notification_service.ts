import admin from 'firebase-admin'
import firebaseConfig from '#config/firebase'
import FcmToken from '#models/fcm_token'
import Notification from '#models/notification'
import User from '#models/user'

let firebaseInitialized = false

function initializeFirebase() {
  if (firebaseInitialized) return true
  if (admin.apps.length > 0) {
    firebaseInitialized = true
    return true
  }

  if (firebaseConfig.projectId && firebaseConfig.clientEmail && firebaseConfig.privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: firebaseConfig.projectId,
          clientEmail: firebaseConfig.clientEmail,
          privateKey: firebaseConfig.privateKey,
        }),
      })
      firebaseInitialized = true
      console.log('Firebase Admin SDK initialized successfully')
      return true
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error)
      return false
    }
  }
  
  console.warn('Firebase not configured - push notifications disabled')
  return false
}

interface NotificationPayload {
  title: string
  body: string
  data?: Record<string, string>
  imageUrl?: string
}

export default class PushNotificationService {

  private static isConfigured(): boolean {
    return initializeFirebase()
  }


  static async sendToToken(token: string, payload: NotificationPayload): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('Firebase not configured, skipping push notification')
      return false
    }

    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        webpush: {
          notification: {
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
          },
          fcmOptions: {
            link: payload.data?.link || '/',
          },
        },
      }

      await admin.messaging().send(message)
      return true
    } catch (error: unknown) {
      const err = error as { code?: string }
      console.error('FCM send error:', error)
      
      if (err.code === 'messaging/invalid-registration-token' ||
          err.code === 'messaging/registration-token-not-registered') {
        await this.deactivateToken(token)
      }
      return false
    }
  }


  static async sendToTokens(tokens: string[], payload: NotificationPayload): Promise<{ success: number; failure: number }> {
    if (!this.isConfigured() || tokens.length === 0) {
      return { success: 0, failure: 0 }
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        webpush: {
          notification: {
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
          },
        },
      }

      const response = await admin.messaging().sendEachForMulticast(message)
      
      response.responses.forEach(async (resp, idx) => {
        if (!resp.success && resp.error) {
          const code = resp.error.code
          if (code === 'messaging/invalid-registration-token' ||
              code === 'messaging/registration-token-not-registered') {
            await this.deactivateToken(tokens[idx])
          }
        }
      })

      return {
        success: response.successCount,
        failure: response.failureCount,
      }
    } catch (error) {
      console.error('FCM multicast error:', error)
      return { success: 0, failure: tokens.length }
    }
  }


  static async notifyAdmins(payload: NotificationPayload): Promise<void> {
    const adminTokens = await FcmToken.query()
      .whereHas('user', (query) => {
        query.where('role', 'admin')
      })
      .where('isActive', true)

    if (adminTokens.length === 0) {
      console.log('No active admin FCM tokens found')
      return
    }

    const tokens = adminTokens.map((t) => t.token)
    const result = await this.sendToTokens(tokens, payload)
    console.log(`Admin notification sent: ${result.success} success, ${result.failure} failed`)
  }


  static async notifyUser(userId: number, payload: NotificationPayload): Promise<void> {
    const userTokens = await FcmToken.query()
      .where('userId', userId)
      .where('isActive', true)

    if (userTokens.length === 0) return

    const tokens = userTokens.map((t) => t.token)
    await this.sendToTokens(tokens, payload)
  }


  private static async deactivateToken(token: string): Promise<void> {
    await FcmToken.query().where('token', token).update({ isActive: false })
  }


  static async registerToken(
    userId: number,
    token: string,
    deviceType?: string,
    deviceName?: string
  ): Promise<FcmToken> {
    const fcmToken = await FcmToken.updateOrCreate(
      { userId, token },
      {
        userId,
        token,
        deviceType: deviceType || 'web',
        deviceName: deviceName || null,
        isActive: true,
        lastUsedAt: (await import('luxon')).DateTime.now(),
      }
    )

    return fcmToken
  }


  static async removeToken(userId: number, token: string): Promise<void> {
    await FcmToken.query()
      .where('userId', userId)
      .where('token', token)
      .delete()
  }


  static async onUserRegistered(user: User, provider: string): Promise<void> {
    const payload = {
      title: '🎉 New User Registered',
      body: `${user.fullName || user.email} just signed up via ${provider}`,
      data: {
        type: 'new_user',
        userId: String(user.id),
        link: '/admin/users',
      },
    }

    await Notification.create({
      title: payload.title,
      body: payload.body,
      type: 'new_user',
      data: payload.data,
      forAdmins: true,
    })

    await this.notifyAdmins(payload)
  }


  static async onUserLogin(user: User): Promise<void> {
    const payload = {
      title: '👤 User Login',
      body: `${user.fullName || user.email} just logged in`,
      data: {
        type: 'user_login',
        userId: String(user.id),
        link: '/admin/users',
      },
    }

    await Notification.create({
      title: payload.title,
      body: payload.body,
      type: 'user_login',
      data: payload.data,
      forAdmins: true,
    })

    await this.notifyAdmins(payload)
  }


  static async onExcelExport(adminUser: User): Promise<void> {
    const payload = {
      title: '📊 Excel Export Downloaded',
      body: `${adminUser.fullName || adminUser.email} downloaded user data export`,
      data: {
        type: 'excel_export',
        adminId: String(adminUser.id),
        link: '/admin/users',
      },
    }

    await Notification.create({
      title: payload.title,
      body: payload.body,
      type: 'excel_export',
      data: payload.data,
      forAdmins: true,
    })

    await this.notifyAdmins(payload)
  }
}
