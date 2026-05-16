// Hardcoded admin allowlist. Lowercase-compared to user.email.
// To add an admin: add their email here and redeploy.
export const ADMIN_EMAILS = [
  'luckbao@icloud.com',
  'jaxfamilytravels7@gmail.com',
] as const

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase() as typeof ADMIN_EMAILS[number])
}
