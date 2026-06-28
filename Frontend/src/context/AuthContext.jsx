import React, { createContext, useContext, useState } from 'react'
import authService from '../services/authService'
import { resolveAbilities } from '../utils/roles'

const AUTH_KEY = 'sales_auth_user'
const TOKEN_KEY = 'token'

function loadUser() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || null } catch { return null }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadUser())

  function persistSession(token, userData) {
    localStorage.setItem(TOKEN_KEY, token)
    const safeUser = {
      id: userData._id || userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      abilities: userData.role === 'Sales' ? resolveAbilities(userData) : undefined,
    }
    localStorage.setItem(AUTH_KEY, JSON.stringify(safeUser))
    setUser(safeUser)
  }

  async function login({ email, password }) {
    const data = await authService.login({ email, password })
    persistSession(data.token, data.user)
    return data.user
  }

  async function register({ name, email, password, role = 'Receptionist' }) {
    await authService.register({ name, email, password, role })
    return login({ email, password })
  }

  function updateUser(partial) {
    setUser((prev) => {
      const next = { ...prev, ...partial }
      localStorage.setItem(AUTH_KEY, JSON.stringify(next))
      return next
    })
  }

  function logout() {
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
