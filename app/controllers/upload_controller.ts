import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { cuid } from '@adonisjs/core/helpers'
import Upload from '#models/upload'

export default class UploadController {

  async uploadImage({ request, response }: HttpContext) {
    const user = request.user
    if (!user) {
      return response.unauthorized({ error: 'Not authenticated' })
    }

    const image = request.file('image', {
      size: '5mb',
      extnames: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    })

    if (!image) {
      return response.badRequest({ error: 'Please upload an image file' })
    }

    if (!image.isValid) {
      return response.badRequest({ error: image.errors[0]?.message || 'Invalid image file' })
    }

    const fileName = `${cuid()}.${image.extname}`

    await image.move(app.makePath('public/uploads'), {
      name: fileName,
    })

    if (!image.fileName) {
      return response.internalServerError({ error: 'Failed to save image' })
    }

    const upload = await Upload.create({
      userId: user.id,
      imagePath: `/uploads/${image.fileName}`,
      originalName: image.clientName,
      fileSize: image.size,
    })

    return response.created({
      message: 'Image uploaded successfully',
      upload: {
        id: upload.id,
        url: `/uploads/${image.fileName}`,
        originalName: upload.originalName,
        fileSize: upload.fileSize,
        createdAt: upload.createdAt,
      },
    })
  }


  async getUserUploads({ request, response }: HttpContext) {
    const user = request.user
    if (!user) {
      return response.unauthorized({ error: 'Not authenticated' })
    }

    const uploads = await Upload.query()
      .where('userId', user.id)
      .orderBy('createdAt', 'desc')

    return response.ok({
      uploads: uploads.map((upload) => ({
        id: upload.id,
        url: upload.imagePath,
        originalName: upload.originalName,
        fileSize: upload.fileSize,
        createdAt: upload.createdAt,
      })),
    })
  }
}
