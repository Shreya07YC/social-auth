export interface User {
  id: number
  name: string
  email: string
  avatar: string | null
  provider: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
}
