const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'

export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: {
    id: number
    name: string
    email: string
    avatar?: string
  }
  message: string
}

export interface UploadResponse {
  message: string
  upload: {
    id: number
    url: string
    originalName: string
    fileSize: number
    createdAt: string
  }
}

export interface UserData {
  id: number
  fullName: string
  email: string
  loginType: string
  providerId: string
  avatarUrl: string | null
  role: 'user' | 'admin'
  lastLogin: string
  registeredAt: string
}

export interface UserListResponse {
  data: UserData[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
    firstPage: number
  }
}

export interface UserStatsResponse {
  total: number
  emailUsers: number
  googleUsers: number
  adminUsers: number
}

export interface UserFilters {
  page?: number
  limit?: number
  search?: string
  loginType?: 'email' | 'google' | 'all'
  sortBy?: 'createdAt' | 'email' | 'provider' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
  startDate?: string
  endDate?: string
}

export interface NotificationData {
  id: number
  title: string
  body: string
  type: string
  data: Record<string, string> | null
  isRead: boolean
  createdAt: string
}

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('auth_token')
  }

  private getHeaders(includeContentType = true): HeadersInit {
    const headers: HeadersInit = {}
    if (includeContentType) {
      headers['Content-Type'] = 'application/json'
    }
    const token = this.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || `API Error: ${response.status}`)
    }

    return response.json()
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || `API Error: ${response.status}`)
    }

    return response.json()
  }

  async uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(false),
      credentials: 'include',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }))
      throw new Error(error.error || `API Error: ${response.status}`)
    }

    return response.json()
  }

  async downloadFile(endpoint: string, filename: string): Promise<void> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(false),
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Download failed' }))
      throw new Error(error.error || `API Error: ${response.status}`)
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  // Auth methods
  async login(data: LoginData): Promise<AuthResponse> {
    return this.post('/auth/login', data)
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    return this.post('/auth/register', data)
  }

  // Upload methods
  async uploadImage(file: File): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('image', file)
    return this.uploadFile('/api/upload/image', formData)
  }

  async getUploads(): Promise<{ uploads: UploadResponse['upload'][] }> {
    return this.get('/api/uploads')
  }

  // User Management methods (Admin only)
  async getUsers(filters: UserFilters = {}): Promise<UserListResponse> {
    const params = new URLSearchParams()
    if (filters.page) params.append('page', String(filters.page))
    if (filters.limit) params.append('limit', String(filters.limit))
    if (filters.search) params.append('search', filters.search)
    if (filters.loginType) params.append('loginType', filters.loginType)
    if (filters.sortBy) params.append('sortBy', filters.sortBy)
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)

    const queryString = params.toString()
    return this.get(`/api/admin/users${queryString ? `?${queryString}` : ''}`)
  }

  async getUserStats(): Promise<UserStatsResponse> {
    return this.get('/api/admin/users/stats')
  }

  async exportUsersExcel(filters: UserFilters = {}): Promise<void> {
    const params = new URLSearchParams()
    if (filters.search) params.append('search', filters.search)
    if (filters.loginType) params.append('loginType', filters.loginType)
    if (filters.sortBy) params.append('sortBy', filters.sortBy)
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)

    const queryString = params.toString()
    const endpoint = `/api/admin/users/export/excel${queryString ? `?${queryString}` : ''}`
    await this.downloadFile(endpoint, `users-export-${Date.now()}.xlsx`)
  }

  async exportUsersPdf(filters: UserFilters = {}): Promise<void> {
    const params = new URLSearchParams()
    if (filters.search) params.append('search', filters.search)
    if (filters.loginType) params.append('loginType', filters.loginType)
    if (filters.sortBy) params.append('sortBy', filters.sortBy)
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)

    const queryString = params.toString()
    const endpoint = `/api/admin/users/export/pdf${queryString ? `?${queryString}` : ''}`
    await this.downloadFile(endpoint, `users-export-${Date.now()}.pdf`)
  }

  async grantAdmin(userId: number): Promise<{ message: string; user: UserData }> {
    return this.post(`/api/admin/users/${userId}/grant-admin`, {})
  }

  async revokeAdmin(userId: number): Promise<{ message: string; user: UserData }> {
    return this.post(`/api/admin/users/${userId}/revoke-admin`, {})
  }

  // Notification methods
  async getNotifications(page = 1, limit = 20): Promise<{
    data: NotificationData[]
    meta: { total: number; currentPage: number; lastPage: number }
  }> {
    return this.get(`/api/notifications?page=${page}&limit=${limit}`)
  }

  async getUnreadCount(): Promise<{ count: number }> {
    return this.get('/api/notifications/unread-count')
  }

  async markNotificationAsRead(id: number): Promise<{ message: string }> {
    return this.post(`/api/notifications/${id}/read`, {})
  }

  async markAllNotificationsAsRead(): Promise<{ message: string }> {
    return this.post('/api/notifications/read-all', {})
  }

  getGoogleAuthUrl(): string {
    return `${API_URL}/auth/google`
  }

  getImageUrl(path: string): string {
    return `${API_URL}${path}`
  }
}

export const api = new ApiService()
