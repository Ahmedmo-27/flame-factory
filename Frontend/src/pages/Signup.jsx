import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDefaultRoute } from '../utils/roles'

export default function Signup() {
  const { register } = useAuth()
  const navigate     = useNavigate()

  const [form,    setForm]    = useState({ name: '', email: '', password: '', confirm: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setError('')
  }

  function validate() {
    if (!form.name.trim())    return 'Please enter your name.'
    if (!form.email.trim())   return 'Please enter your email address.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email address.'
    if (form.password.length < 6) return 'Password must be at least 6 characters.'
    if (form.password !== form.confirm) return 'Passwords do not match.'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true)
    try {
      const loggedIn = await register({ name: form.name, email: form.email, password: form.password })
      navigate(getDefaultRoute(loggedIn.role), { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🔥</div>
          <div className="auth-logo-text">Flame Factory</div>
        </div>

        <h1 className="auth-title">Create an account</h1>
        <p className="auth-subtitle">Get started — it only takes a minute</p>

        {error && (
          <div className="auth-error">
            <span>⚠</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-field">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              type="text"
              placeholder="Ahmed Hassan"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              autoComplete="name"
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              type="password"
              placeholder="Re-enter your password"
              value={form.confirm}
              onChange={(e) => set('confirm', e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
