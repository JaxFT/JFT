'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Check, KeyRound, User as UserIcon } from 'lucide-react'

type Props = {
  initialFullName: string
  email: string
}

export default function AccountEditor({ initialFullName, email }: Props) {
  const router = useRouter()
  const supabase = createClient()

  // ── Name edit state ─────────────────────────────
  const [name, setName] = useState(initialFullName)
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSaved, setNameSaved] = useState(false)

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingName(true)
    setNameError(null)
    setNameSaved(false)
    try {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('Name cannot be empty')

      // Update both the profile row AND user_metadata so navbar/header stay in sync
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      const { error: pErr } = await supabase
        .from('profiles')
        .update({ full_name: trimmed })
        .eq('id', user.id)
      if (pErr) throw new Error(pErr.message)

      const { error: uErr } = await supabase.auth.updateUser({
        data: { full_name: trimmed },
      })
      if (uErr) throw new Error(uErr.message)

      setNameSaved(true)
      router.refresh()
      setTimeout(() => setNameSaved(false), 3000)
    } catch (e) {
      setNameError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSavingName(false)
    }
  }

  // ── Password change state ───────────────────────
  const [showPasswordPanel, setShowPasswordPanel] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingPassword(true)
    setPasswordError(null)
    setPasswordSaved(false)
    try {
      if (newPassword.length < 8) throw new Error('Password must be at least 8 characters')
      if (newPassword !== confirmPassword) throw new Error('Passwords do not match')

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw new Error(error.message)

      setPasswordSaved(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        setPasswordSaved(false)
        setShowPasswordPanel(false)
      }, 2500)
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : 'Could not update password')
    } finally {
      setSavingPassword(false)
    }
  }

  const input = 'w-full text-sm text-gray-900 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'

  return (
    <div className="space-y-6">
      {/* NAME */}
      <form onSubmit={saveName} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserIcon className="w-5 h-5 text-brand-600" />
          <h2 className="font-bold text-gray-900">Your name</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">Email</label>
            <p className="text-sm text-gray-700">{email}</p>
            <p className="text-xs text-gray-400 mt-1">Email can't be changed yet — contact us if you need to update it.</p>
          </div>
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">Full name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className={input}
              placeholder="Your name"
            />
          </div>
          {nameError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{nameError}</p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={savingName || name === initialFullName}
              className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-50"
            >
              {savingName ? (<><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>) : 'Save name'}
            </button>
            {nameSaved && (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                <Check className="w-4 h-4" /> Saved
              </span>
            )}
          </div>
        </div>
      </form>

      {/* PASSWORD */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-gray-900">Password</h2>
          </div>
          {!showPasswordPanel && (
            <button
              type="button"
              onClick={() => setShowPasswordPanel(true)}
              className="text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Change password
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-0">Set a new password for signing in. Minimum 8 characters.</p>

        {showPasswordPanel && (
          <form onSubmit={changePassword} className="space-y-3 mt-5 pt-5 border-t border-gray-100">
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
                className={input}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className={input}
                autoComplete="new-password"
              />
            </div>
            {passwordError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{passwordError}</p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="submit"
                disabled={savingPassword}
                className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-50"
              >
                {savingPassword ? (<><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>) : 'Update password'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordPanel(false)
                  setNewPassword('')
                  setConfirmPassword('')
                  setPasswordError(null)
                }}
                className="text-sm font-medium text-gray-500 hover:text-gray-800"
              >
                Cancel
              </button>
              {passwordSaved && (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                  <Check className="w-4 h-4" /> Password updated
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
