import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AuthController = () => import('#controllers/auth_controller')
const UploadController = () => import('#controllers/upload_controller')
const UserManagementController = () => import('#controllers/user_management_controller')
const FcmController = () => import('#controllers/fcm_controller')
const NotificationController = () => import('#controllers/notification_controller')

router.get('/', async () => {
  return { status: 'ok', message: 'Social Auth API is running' }
})

router.get('/test-hash', async () => {
  const bcrypt = (await import('bcrypt')).default
  const password = 'test123'
  const hashed = await bcrypt.hash(password, 10)
  const verified = await bcrypt.compare(password, hashed)
  return { password, hashed, verified }
})

router.get('/reset-users', async () => {
  const User = (await import('#models/user')).default
  await User.query().delete()
  return { message: 'All users deleted. Please register again.' }
})

router.post('/auth/register', [AuthController, 'register'])
router.post('/auth/login', [AuthController, 'login'])

router.get('/auth/google', [AuthController, 'redirectToGoogle'])
router.get('/auth/google/callback', [AuthController, 'handleGoogleCallback'])

router
  .group(() => {
    router.get('/me', [AuthController, 'me'])
    router.get('/verify', [AuthController, 'verifyToken'])
    router.post('/upload/image', [UploadController, 'uploadImage'])
    router.get('/uploads', [UploadController, 'getUserUploads'])
    
    router.post('/fcm/register', [FcmController, 'register'])
    router.post('/fcm/remove', [FcmController, 'remove'])
    router.get('/fcm/tokens', [FcmController, 'list'])

    router.get('/notifications', [NotificationController, 'index'])
    router.get('/notifications/unread-count', [NotificationController, 'unreadCount'])
    router.post('/notifications/:id/read', [NotificationController, 'markAsRead'])
    router.post('/notifications/read-all', [NotificationController, 'markAllAsRead'])
  })
  .prefix('/api')
  .use(middleware.jwtAuth())


  router.get('/api/admin/users/export/excel', [UserManagementController, 'exportExcel'])

router
  .group(() => {
    router.get('/users', [UserManagementController, 'index'])
    router.get('/users/stats', [UserManagementController, 'stats'])
    // router.get('/users/export/excel', [UserManagementController, 'exportExcel'])
    router.get('/users/export/pdf', [UserManagementController, 'exportPdf'])
    router.post('/users/:id/grant-admin', [UserManagementController, 'grantAdmin'])
    router.post('/users/:id/revoke-admin', [UserManagementController, 'revokeAdmin'])
  })
  .prefix('/api/admin')
  .use([middleware.jwtAuth(), middleware.admin()])
