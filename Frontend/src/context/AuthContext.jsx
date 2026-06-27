import React, { createContext, useContext, useState } from 'react'

const AUTH_KEY = 'sales_auth_user'
const USERS_KEY = 'sales_auth_users'

function loadUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || [] } catch { return [] }
}
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}
function loadUser() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || null } catch { return null }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadUser())

  function register({ name, email, password }) {
    const users = loadUsers()
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email already exists.')
    }
    const newUser = { id: Date.now().toString(36), name: name.trim(), email: email.toLowerCase().trim() }
    saveUsers([...users, { ...newUser, password }])
    localStorage.setItem(AUTH_KEY, JSON.stringify(newUser))
    setUser(newUser)
  }

  function login({ email, password }) {
    const users = loadUsers()
    const match = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password
    )
    if (!match) throw new Error('Invalid email or password.')
    const { password: _pw, ...safeUser } = match
    localStorage.setItem(AUTH_KEY, JSON.stringify(safeUser))
    setUser(safeUser)
  }

  function logout() {
    localStorage.removeItem(AUTH_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
