import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import ExcelService from '#services/excel_service'
import PdfService from '#services/pdf_service'
import PushNotificationService from '#services/push_notification_service'

interface UserFilters {
  search?: string
  loginType?: 'email' | 'google' | 'all'
  sortBy?: 'createdAt' | 'email' | 'provider' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
  startDate?: string
  endDate?: string
}

export default class UserManagementController {

  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const search = request.input('search', '')
    const loginType = request.input('loginType', 'all')
    const sortBy = request.input('sortBy', 'createdAt')
    const sortOrder = request.input('sortOrder', 'desc')
    const startDate = request.input('startDate')
    const endDate = request.input('endDate')

    const query = User.query()

    if (search) {
      query.where((builder) => {
        builder.whereILike('email', `%${search}%`).orWhereILike('fullName', `%${search}%`)
      })
    }

    if (loginType && loginType !== 'all') {
      query.where('provider', loginType)
    }

    if (startDate) {
      query.where('createdAt', '>=', startDate)
    }
    if (endDate) {
      query.where('createdAt', '<=', endDate)
    }

    const validSortFields = ['createdAt', 'email', 'provider', 'updatedAt']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt'
    const order = sortOrder === 'asc' ? 'asc' : 'desc'
    query.orderBy(sortField, order)

    const users = await query.paginate(page, limit)

    return response.ok({
      data: users.all().map((user) => this.formatUser(user)),
      meta: {
        total: users.total,
        perPage: users.perPage,
        currentPage: users.currentPage,
        lastPage: users.lastPage,
        firstPage: users.firstPage,
      },
    })
  }


  async exportExcel({ request, response }: HttpContext) {
    const filters = this.getFiltersFromRequest(request)
    const users = await this.getFilteredUsers(filters)

    const buffer = await ExcelService.generateUserExcel(users.map((u) => this.formatUser(u)))

    // Notify admins about Excel export
    const adminUser = request.user
    if (adminUser) {
      PushNotificationService.onExcelExport(adminUser).catch((err) =>
        console.error('Failed to send push notification:', err)
      )
    }

    response.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response.header('Content-Disposition', `attachment; filename=users-export-${Date.now()}.xlsx`)
    return response.send(buffer)
  }


  async exportPdf({ request, response }: HttpContext) {
    const filters = this.getFiltersFromRequest(request)
    const users = await this.getFilteredUsers(filters)

    const buffer = await PdfService.generateUserPdf(users.map((u) => this.formatUser(u)))

    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', `attachment; filename=users-export-${Date.now()}.pdf`)
    return response.send(buffer)
  }

  async stats({ response }: HttpContext) {
    const totalUsers = await User.query().count('* as total')
    const emailUsers = await User.query().where('provider', 'email').count('* as total')
    const googleUsers = await User.query().where('provider', 'google').count('* as total')
    const adminUsers = await User.query().where('role', 'admin').count('* as total')

    return response.ok({
      total: Number(totalUsers[0].$extras.total),
      emailUsers: Number(emailUsers[0].$extras.total),
      googleUsers: Number(googleUsers[0].$extras.total),
      adminUsers: Number(adminUsers[0].$extras.total),
    })
  }


  async grantAdmin({ params, response }: HttpContext) {
    const user = await User.find(params.id)
    
    if (!user) {
      return response.notFound({ error: 'User not found' })
    }

    if (user.role === 'admin') {
      return response.badRequest({ error: 'User is already an admin' })
    }

    user.role = 'admin'
    await user.save()

    return response.ok({
      message: 'Admin access granted successfully',
      user: this.formatUser(user),
    })
  }


  async revokeAdmin({ params, request, response }: HttpContext) {
    const currentUser = request.user
    const user = await User.find(params.id)
    
    if (!user) {
      return response.notFound({ error: 'User not found' })
    }

    if (currentUser && currentUser.id === user.id) {
      return response.badRequest({ error: 'Cannot revoke your own admin access' })
    }

    if (user.role !== 'admin') {
      return response.badRequest({ error: 'User is not an admin' })
    }

    user.role = 'user'
    await user.save()

    return response.ok({
      message: 'Admin access revoked successfully',
      user: this.formatUser(user),
    })
  }

  private getFiltersFromRequest(request: HttpContext['request']): UserFilters {
    return {
      search: request.input('search'),
      loginType: request.input('loginType'),
      sortBy: request.input('sortBy'),
      sortOrder: request.input('sortOrder'),
      startDate: request.input('startDate'),
      endDate: request.input('endDate'),
    }
  }

  private async getFilteredUsers(filters: UserFilters) {
    const query = User.query()

    if (filters.search) {
      query.where((builder) => {
        builder.whereILike('email', `%${filters.search}%`).orWhereILike('fullName', `%${filters.search}%`)
      })
    }

    if (filters.loginType && filters.loginType !== 'all') {
      query.where('provider', filters.loginType)
    }

    if (filters.startDate) {
      query.where('createdAt', '>=', filters.startDate)
    }
    if (filters.endDate) {
      query.where('createdAt', '<=', filters.endDate)
    }

    const sortField = filters.sortBy || 'createdAt'
    const sortOrder = filters.sortOrder || 'desc'
    query.orderBy(sortField, sortOrder)

    return query.exec()
  }

  private formatUser(user: User) {
    return {
      id: user.id,
      fullName: user.fullName || 'N/A',
      email: user.email || 'N/A',
      loginType: user.provider === 'google' ? 'Google Auth' : 'Normal',
      providerId: user.providerId || 'N/A',
      avatarUrl: user.avatarUrl || null,
      role: user.role || 'user',
      lastLogin: user.updatedAt?.toFormat('yyyy-MM-dd HH:mm:ss') || 'N/A',
      registeredAt: user.createdAt?.toFormat('yyyy-MM-dd HH:mm:ss') || 'N/A',
    }
  }
}
