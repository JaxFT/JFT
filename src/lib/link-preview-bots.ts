// Messaging/social apps fetch a short link server-side to build the
// preview card the instant it's pasted or sent, before any human
// actually taps it. Without filtering these out, a campaign's "click"
// count would include every bot unfurl alongside real visitors.
const BOT_UA_PATTERNS = [
  /facebookexternalhit/i,
  /Facebot/i,
  /Instagram/i,
  /WhatsApp/i,
  /Twitterbot/i,
  /LinkedInBot/i,
  /TelegramBot/i,
  /Slackbot/i,
  /Discordbot/i,
  /SkypeUriPreview/i,
  /redditbot/i,
  /Applebot/i,
  /Googlebot/i,
  /bingbot/i,
  /YandexBot/i,
  /Pinterest/i,
  /vkShare/i,
]

export function isLinkPreviewBot(userAgent: string | null): boolean {
  if (!userAgent) return false
  return BOT_UA_PATTERNS.some(re => re.test(userAgent))
}
