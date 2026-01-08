import { messaging, getToken, onMessage } from '../config/firebase'
import { api } from './api'

const VAPID_KEY = 'BHF-9B1u-Fy58k63VUixFUkQMWCQ2BV_NCtCieJwI-CURDTbmQ7gpGtf0ccqtZP7Nq0LKxbVbLX4SqK_8TPlTgY'

export interface NotificationPayload {
  title: string
  body: string
  data?: Record<string, string>
}

class PushNotificationService {
  private initialized = false


  async initialize(): Promise<boolean> {
    if (this.initialized) return true
    if (!messaging) {
      console.warn('Firebase Messaging not available')
      return false
    }

    try {

      const permission = await Notification.requestPermission()
      
      if (permission !== 'granted') {
        console.log('Notification permission denied')
        return false
      }

      const token = await this.getToken()
      if (token) {
        await this.registerToken(token)
        this.initialized = true
        
        this.setupForegroundListener()
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('Failed to initialize push notifications:', error)
      return false
    }
  }


  async getToken(): Promise<string | null> {
    if (!messaging) return null

    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      })
      
      return token
    } catch (error) {
      console.error('Failed to get FCM token:', error)
      return null
    }
  }

  async registerToken(token: string): Promise<void> {
    try {
      await api.post('/api/fcm/register', {
        token,
        deviceType: 'web',
        deviceName: navigator.userAgent.substring(0, 100),
      })
      console.log('FCM token registered with backend')
    } catch (error) {
      console.error('Failed to register FCM token:', error)
    }
  }


  async removeToken(): Promise<void> {
    if (!messaging) return

    try {
      const token = await this.getToken()
      if (token) {
        await api.post('/api/fcm/remove', { token })
        console.log('FCM token removed from backend')
      }
    } catch (error) {
      console.error('Failed to remove FCM token:', error)
    }
  }


  private setupForegroundListener(): void {
    if (!messaging) return

    onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload)
      
      if (payload.notification) {
        this.showNotification({
          title: payload.notification.title || 'New Notification',
          body: payload.notification.body || '',
          data: payload.data as Record<string, string>,
        })
      }
    })
  }


  showNotification(payload: NotificationPayload): void {
    if (Notification.permission !== 'granted') return

    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: payload.data,
    })

    notification.onclick = () => {
      window.focus()
      if (payload.data?.link) {
        window.location.href = payload.data.link
      }
      notification.close()
    }
  }


  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator
  }


  getPermissionStatus(): NotificationPermission {
    return Notification.permission
  }
}

export const pushNotificationService = new PushNotificationService()
