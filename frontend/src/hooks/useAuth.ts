import { useState, useEffect, useCallback } from 'react'
import type { User, AuthState } from '../types/auth'
import { api, type LoginData, type RegisterData } from '../services/api'

const TOKEN_KEY = 'auth_token'

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem(TOKEN_KEY),
    isLoading: true,
    isAuthenticated: false,
  })

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setState((prev) => ({ ...prev, isLoading: false, isAuthenticated: false }))
      return
    }

    try {
      const data = await api.get<{ user: User }>('/api/me')
      setState({
        user: data.user,
        token,
        isLoading: false,
        isAuthenticated: true,
      })
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      setState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      })
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const loginWithGoogle = useCallback(() => {
    window.location.href = api.getGoogleAuthUrl()
  }, [])

  const loginWithEmail = useCallback(async (data: LoginData) => {
    const response = await api.login(data)
    localStorage.setItem(TOKEN_KEY, response.token)
    setState({
      user: response.user as User,
      token: response.token,
      isLoading: false,
      isAuthenticated: true,
    })
    return response
  }, [])

  const register = useCallback(async (data: RegisterData) => {
    const response = await api.register(data)
    localStorage.setItem(TOKEN_KEY, response.token)
    setState({
      user: response.user as User,
      token: response.token,
      isLoading: false,
      isAuthenticated: true,
    })
    return response
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setState({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    })
  }, [])

  const setToken = useCallback(
    (token: string) => {
      localStorage.setItem(TOKEN_KEY, token)
      setState((prev) => ({ ...prev, token }))
      fetchUser()
    },
    [fetchUser]
  )

  return {
    ...state,
    loginWithGoogle,
    loginWithEmail,
    register,
    logout,
    setToken,
    refetch: fetchUser,
  }
}
