import type { HttpContext } from '@adonisjs/core/http'
import Notification from '#models/notification'

export default class NotificationController {

  async index({ request, response }: HttpContext) {
    const user = request.user!
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)

    let query = Notification.query().orderBy('createdAt', 'desc')

    if (user.role === 'admin') {
      query = query.where('forAdmins', true)
    } else {
      
      query = query.where('userId', user.id)
    }

    const notifications = await query.paginate(page, limit)

    return response.ok({
      data: notifications.all().map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        type: n.type,
        data: n.data,
        isRead: n.isRead,
        createdAt: n.createdAt.toISO(),
      })),
      meta: {
        total: notifications.total,
        currentPage: notifications.currentPage,
        lastPage: notifications.lastPage,
      },
    })
  }

  async unreadCount({ request, response }: HttpContext) {
    const user = request.user!

    let query = Notification.query().where('isRead', false)

    if (user.role === 'admin') {
      query = query.where('forAdmins', true)
    } else {
      query = query.where('userId', user.id)
    }

    const result = await query.count('* as total')
    const count = Number(result[0].$extras.total)

    return response.ok({ count })
  }


  async markAsRead({ params, request, response }: HttpContext) {
    const user = request.user!
    const notification = await Notification.find(params.id)

    if (!notification) {
      return response.notFound({ error: 'Notification not found' })
    }

    if (notification.forAdmins && user.role !== 'admin') {
      return response.forbidden({ error: 'Access denied' })
    }
    if (!notification.forAdmins && notification.userId !== user.id) {
      return response.forbidden({ error: 'Access denied' })
    }

    notification.isRead = true
    await notification.save()

    return response.ok({ message: 'Notification marked as read' })
  }


  async markAllAsRead({ request, response }: HttpContext) {
    const user = request.user!

    if (user.role === 'admin') {
      await Notification.query()
        .where('forAdmins', true)
        .where('isRead', false)
        .update({ isRead: true })
    } else {
      await Notification.query()
        .where('userId', user.id)
        .where('isRead', false)
        .update({ isRead: true })
    }

    return response.ok({ message: 'All notifications marked as read' })
  }
}
