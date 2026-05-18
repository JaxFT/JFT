'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Check, KeyRound, User as UserIcon, Mail } from 'lucide-react'

type Props = {
  initialFullName: string
  email: string
  initialMarketingOptIn: boolean
}

export default function AccountEditor({ initialFullName, email, initialMarketingOptIn }: Props) {
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

  // ── Marketing preference state ──────────────────
  const [marketingOptIn, setMarketingOptIn] = useState(initialMarketingOptIn)
  const [savingMarketing, setSavingMarketing] = useState(false)
  const [marketingError, setMarketingError] = useState<string | null>(null)
  const [marketingSavedAt, setMarketingSavedAt] = useState<number | null>(null)

  const toggleMarketing = async (next: boolean) => {
    // Optimistic: flip UI first, roll back on error.
    const prev = marketingOptIn
    setMarketingOptIn(next)
    setSavingMarketing(true)
    setMarketingError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const { error } = await supabase
        .from('profiles')
        .update({ marketing_opt_in: next })
        .eq('id', user.id)
      if (error) throw new Error(error.message)
      setMarketingSavedAt(Date.now())
      setTimeout(() => setMarketingSavedAt(saved => (saved && Date.now() - saved >= 2500 ? null : saved)), 2600)
      router.refresh()
    } catch (e) {
      setMarketingOptIn(prev)
      setMarketingError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSavingMarketing(false)
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

      {/* MARKETING EMAILS */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-brand-600" />
          <h2 className="font-bold text-gray-900">Email preferences</h2>
        </div>
        <label className="flex items-start gap-3 cursor-pointer select-none rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50">
          <input
            type="checkbox"
            checked={marketingOptIn}
            onChange={e => toggleMarketing(e.target.checked)}
            disabled={savingMarketing}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 shrink-0"
          />
          <span className="flex-1">
            <span className="block text-sm font-semibold text-gray-900">Occasional updates from Jax | Family Travels</span>
            <span className="block text-xs text-gray-500 mt-0.5 leading-relaxed">
              New guides, blog posts, and updates worth sharing. No spam. Unsubscribe any time.
            </span>
          </span>
          <span className="shrink-0 text-xs font-medium text-gray-500 mt-0.5">
            {savingMarketing
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : marketingSavedAt
                ? <span className="inline-flex items-center gap-1 text-brand-700"><Check className="w-3.5 h-3.5" /> Saved</span>
                : null}
          </span>
        </label>
        {marketingError && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-2">{marketingError}</p>
        )}
        <p className="text-xs text-gray-400 mt-3 leading-relaxed">
          This setting only controls marketing updates. We&apos;ll still send account-related emails (login confirmations, purchase receipts) when needed.
        </p>
      </div>

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
