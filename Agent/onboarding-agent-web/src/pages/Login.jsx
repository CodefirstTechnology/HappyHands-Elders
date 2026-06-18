import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../context/AuthContext'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(
    () =>
      (location.state?.forbidden
        ? 'You do not have access to this portal. Sign in with a coordinator or admin account.'
        : '') || '',
  )
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    setError('')
    try {
      const user = await login(data.email, data.password)
      if (!['COORDINATOR', 'ADMIN'].includes(user.role)) {
        localStorage.clear()
        setError(
          'This portal is for coordinators and admins only. Caregivers and parents must use the mobile app.',
        )
        return
      }
      if (user.role === 'ADMIN') navigate('/admin')
      else navigate('/')
    } catch (e) {
      setError(e.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-15%] w-[420px] h-[420px] rounded-full bg-secondary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-5%] left-[-10%] w-[320px] h-[320px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="glass-card w-full max-w-md p-10 z-10">
        <p className="text-sm font-semibold text-secondary mb-1">Coordinator & Admin Portal</p>
        <h1 className="text-3xl font-bold text-primary tracking-tight mb-2">ChildCare</h1>
        <p className="text-on-surface-variant text-sm mb-8">
          Onboard and verify caregivers. Trusted by families across India.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-on-surface-variant ml-1">Email</label>
            <input
              {...register('email')}
              type="email"
              className="input-ghost w-full mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-on-surface-variant ml-1">Password</label>
            <div className="relative mt-1">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                className="input-ghost w-full pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="btn-gradient w-full py-3.5 mt-2">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs text-on-surface-variant/80 mt-8 text-center leading-relaxed">
          Secure access for authorised coordinators only. Caregiver accounts are created here, not in the mobile app.
        </p>
      </div>
    </div>
  )
}
