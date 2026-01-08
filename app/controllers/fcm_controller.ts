import type { HttpContext } from '@adonisjs/core/http'
import PushNotificationService from '#services/push_notification_service'
import FcmToken from '#models/fcm_token'

export default class FcmController {

  async register({ request, response }: HttpContext) {
    const user = request.user!
    const { token, deviceType, deviceName } = request.only(['token', 'deviceType', 'deviceName'])

    if (!token) {
      return response.badRequest({ error: 'FCM token is required' })
    }

    const fcmToken = await PushNotificationService.registerToken(
      user.id,
      token,
      deviceType,
      deviceName
    )

    return response.ok({
      message: 'FCM token registered successfully',
      tokenId: fcmToken.id,
    })
  }


  async remove({ request, response }: HttpContext) {
    const user = request.user!
    const { token } = request.only(['token'])

    if (!token) {
      return response.badRequest({ error: 'FCM token is required' })
    }

    await PushNotificationService.removeToken(user.id, token)

    return response.ok({
      message: 'FCM token removed successfully',
    })
  }


  async list({ request, response }: HttpContext) {
    const user = request.user!

    const tokens = await FcmToken.query()
      .where('userId', user.id)
      .where('isActive', true)
      .select(['id', 'deviceType', 'deviceName', 'lastUsedAt', 'createdAt'])

    return response.ok({ tokens })
  }
}
