'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Check, KeyRound, User as UserIcon, Mail, AtSign, Instagram } from 'lucide-react'
import {
  validateUsername, validateInstagram,
  normaliseUsername, normaliseInstagram,
} from '@/lib/usernames'

type Props = {
  initialFullName: string
  email: string
  initialMarketingOptIn: boolean
  initialUsername: string | null
  initialInstagramHandle: string | null
  // Admin accounts get an extra Instagram-handle field. Non-admins
  // don't, because the handle is only ever shown to admins on
  // comments and we don't want random users claiming an account is
  // tied to a JFT Instagram they don't own.
  isAdmin: boolean
}

export default function AccountEditor({
  initialFullName,
  email,
  initialMarketingOptIn,
  initialUsername,
  initialInstagramHandle,
  isAdmin,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  // ── Name edit state ─────────────────────────────
  const [name, setName] = useState(initialFullName)
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSaved, setNameSaved] = useState(false)
  const [showNamePanel, setShowNamePanel] = useState(false)

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

      // .select('id') so we can detect a 0-row update (would mean the
      // profile row is somehow missing) instead of silently "succeeding".
      const { data: rows, error: pErr } = await supabase
        .from('profiles')
        .update({ full_name: trimmed })
        .eq('id', user.id)
        .select('id')
      if (pErr) throw new Error(pErr.message)
      if (!rows || rows.length === 0) {
        throw new Error('Profile row not found, please refresh the page and try again.')
      }

      const { error: uErr } = await supabase.auth.updateUser({
        data: { full_name: trimmed },
      })
      if (uErr) throw new Error(uErr.message)

      setNameSaved(true)
      router.refresh()
      setTimeout(() => {
        setNameSaved(false)
        setShowNamePanel(false)
      }, 1500)
    } catch (e) {
      setNameError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSavingName(false)
    }
  }

  // ── Username + Instagram edit state ─────────────
  const [username, setUsername] = useState(initialUsername ?? '')
  const [instagram, setInstagram] = useState(initialInstagramHandle ?? '')
  const [savedUsername, setSavedUsername] = useState(initialUsername)
  const [savedInstagram, setSavedInstagram] = useState(initialInstagramHandle)
  const [showUsernamePanel, setShowUsernamePanel] = useState(false)
  const [savingUsername, setSavingUsername] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [usernameSaved, setUsernameSaved] = useState(false)

  const saveUsername = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingUsername(true)
    setUsernameError(null)
    setUsernameSaved(false)
    try {
      const uCheck = validateUsername(username)
      if (!uCheck.ok) throw new Error(uCheck.error)
      const iCheck = validateInstagram(instagram)
      if (!iCheck.ok) throw new Error(iCheck.error)
      const res = await fetch('/api/account/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: normaliseUsername(username),
          instagram_handle: normaliseInstagram(instagram),
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `Save failed (HTTP ${res.status})`)
      setSavedUsername(body.username)
      setSavedInstagram(body.instagram_handle ?? null)
      setUsernameSaved(true)
      router.refresh()
      setTimeout(() => {
        setUsernameSaved(false)
        setShowUsernamePanel(false)
      }, 1500)
    } catch (e) {
      setUsernameError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSavingUsername(false)
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

  // ── Email change state ──────────────────────────
  const [showEmailPanel, setShowEmailPanel] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  // Pending message — we keep showing it after the API call because
  // the change isn't live until the user confirms via emails sent to
  // BOTH old + new addresses.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const changeEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingEmail(true)
    setEmailError(null)
    try {
      const trimmed = newEmail.trim().toLowerCase()
      if (!trimmed) throw new Error('Email cannot be empty.')
      if (trimmed === email.toLowerCase()) {
        throw new Error('That is your current email.')
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
        throw new Error('That doesn\'t look like a valid email.')
      }

      const { error } = await supabase.auth.updateUser({ email: trimmed })
      if (error) throw new Error(error.message)

      setPendingEmail(trimmed)
      setNewEmail('')
      setShowEmailPanel(false)
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : 'Could not change email')
    } finally {
      setSavingEmail(false)
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
      {/* EMAIL — self-service, with two-sided confirmation. Supabase
          requires the user to click a verification link sent to both
          their old AND new address before the change goes live. */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-gray-900">Email</h2>
          </div>
          {!showEmailPanel && (
            <button
              type="button"
              onClick={() => { setShowEmailPanel(true); setEmailError(null) }}
              className="text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Change email
            </button>
          )}
        </div>
        <p className="text-sm text-gray-700 font-mono break-all">{email}</p>
        {pendingEmail && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-3 leading-relaxed">
            Pending change to <strong className="break-all">{pendingEmail}</strong>. Check both your old and new inboxes
            and click the verification link in each to confirm. Until you do, you stay logged in with your current email.
          </p>
        )}

        {showEmailPanel && (
          <form onSubmit={changeEmail} className="space-y-3 mt-5 pt-5 border-t border-gray-100">
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">New email</label>
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                required
                className={input}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                We&apos;ll send a confirmation link to both your old and new addresses. Both have to be clicked.
              </p>
            </div>
            {emailError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{emailError}</p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="submit"
                disabled={savingEmail || !newEmail.trim()}
                className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-50"
              >
                {savingEmail ? (<><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>) : 'Send confirmation'}
              </button>
              <button
                type="button"
                onClick={() => { setShowEmailPanel(false); setNewEmail(''); setEmailError(null) }}
                className="text-sm font-medium text-gray-500 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
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

      {/* NAME — collapsed by default, matches the Change email /
          Change password pattern. */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-gray-900">Name</h2>
          </div>
          {!showNamePanel && (
            <button
              type="button"
              onClick={() => setShowNamePanel(true)}
              className="text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Change name
            </button>
          )}
        </div>
        <p className="text-sm text-gray-700">{initialFullName || <span className="italic text-gray-400">Not set yet</span>}</p>

        {showNamePanel && (
          <form onSubmit={saveName} className="space-y-3 mt-5 pt-5 border-t border-gray-100">
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
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="submit"
                disabled={savingName || name === initialFullName}
                className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-50"
              >
                {savingName ? (<><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>) : 'Save name'}
              </button>
              <button
                type="button"
                onClick={() => { setShowNamePanel(false); setName(initialFullName); setNameError(null) }}
                className="text-sm font-medium text-gray-500 hover:text-gray-800"
              >
                Cancel
              </button>
              {nameSaved && (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                  <Check className="w-4 h-4" /> Saved
                </span>
              )}
            </div>
          </form>
        )}
      </div>

      {/* USERNAME + INSTAGRAM — shown next to comments and likes on
          blog posts. Collapsed by default, opens to a small edit form
          with the same validation as the comment-box modal. */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <AtSign className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-gray-900">Username</h2>
          </div>
          {!showUsernamePanel && (
            <button
              type="button"
              onClick={() => setShowUsernamePanel(true)}
              className="text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              {savedUsername ? 'Change' : 'Set username'}
            </button>
          )}
        </div>
        <p className="text-sm text-gray-700">
          {savedUsername
            ? <><span className="font-mono">@{savedUsername}</span>{isAdmin && savedInstagram && <span className="text-gray-400"> · <Instagram className="w-3.5 h-3.5 inline mr-0.5" /><span className="font-mono">@{savedInstagram}</span></span>}</>
            : <span className="italic text-gray-400">Not set, pick one to comment on blog posts</span>}
        </p>

        {showUsernamePanel && (
          <form onSubmit={saveUsername} className="space-y-4 mt-5 pt-5 border-t border-gray-100">
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono select-none pointer-events-none">@</span>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className={`${input} !pl-8 !font-mono`}
                  placeholder="wanderingmum"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Don&apos;t include the @, we add that for you. Letters, numbers, period, hyphen, underscore. 3 to 24 chars.</p>
            </div>
            {isAdmin && (
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">Instagram handle <span className="font-normal normal-case tracking-normal text-gray-400">· optional, admin only</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono select-none pointer-events-none">@</span>
                  <input
                    value={instagram}
                    onChange={e => setInstagram(e.target.value)}
                    className={`${input} !pl-8 !font-mono`}
                    placeholder="jax.familytravels"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Don&apos;t include the @, paste just <span className="font-mono">jax.familytravels</span>. Shown beneath your username on your own comments (admin-side only).</p>
              </div>
            )}
            {usernameError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{usernameError}</p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="submit"
                disabled={savingUsername}
                className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-50"
              >
                {savingUsername ? (<><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>) : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUsernamePanel(false)
                  setUsername(savedUsername ?? '')
                  setInstagram(savedInstagram ?? '')
                  setUsernameError(null)
                }}
                className="text-sm font-medium text-gray-500 hover:text-gray-800"
              >
                Cancel
              </button>
              {usernameSaved && (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                  <Check className="w-4 h-4" /> Saved
                </span>
              )}
            </div>
          </form>
        )}
      </div>

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
    </div>
  )
}
