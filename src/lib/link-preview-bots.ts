// Messaging/social apps fetch a short link server-side to build the
// preview card the instant it's pasted or sent, before any human
// actually taps it. Without filtering these out, a campaign's "click"
// count would include every bot unfurl alongside real visitors.
//
// Only match dedicated crawler/bot signatures here, never a bare app
// name. Apps with their own in-app browser (Instagram, Pinterest, ...)
// stamp that same app name onto the UA of a REAL human's browsing
// session too, so a bare "Instagram" match silently drops genuine
// clicks made by tapping the link inside the app, not just the
// automated preview fetch. Meta's actual crawler for both Facebook
// and Instagram link previews identifies as facebookexternalhit, so
// that one pattern already covers Instagram without the false positive.
const BOT_UA_PATTERNS = [
  /facebookexternalhit/i,
  /Facebot/i,
  /WhatsApp\/[\d.]/i,
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
  /Pinterest\/[\d.]+ *\(\+https/i,
  /vkShare/i,
]

export function isLinkPreviewBot(userAgent: string | null): boolean {
  if (!userAgent) return false
  return BOT_UA_PATTERNS.some(re => re.test(userAgent))
}
