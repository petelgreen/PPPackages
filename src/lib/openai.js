import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
})

const SYSTEM_PROMPT = `You are a package delivery information extractor. You handle messages in any language including Hebrew, English, and mixed.
Extract the following fields from the delivery message and return ONLY valid JSON, no markdown, no explanation.

Fields:
- name: string — a short 1-4 word name describing what the package likely contains, inferred from the sender/context (e.g. "Nike Shoes", "iPhone Charger", "Amazon Books"). If unknown, use "Package".
- icon: string — a single emoji that best represents the package contents based on the name (e.g. 👟 for shoes, 📱 for electronics, 📦 for unknown). Must be exactly one emoji character.
- trackingId: string — the tracking number or package ID (null if not found)
- pickupLocation: string — where the package must be picked up, e.g. "Front Desk", "Locker 4B", "Post Office on Main St" (null if not found)
- address: string — the full street address of the pickup location. First look for it in the message. If not explicitly stated, infer it from the pickup location name and any context clues (building name, city, carrier, etc.). Only set to null if you truly cannot determine any address.
- openingTimes: string — the opening hours of the pickup location (e.g. "Mon–Fri 9am–6pm, Sat 10am–4pm"). First look in the message. If not stated, infer from the pickup location type and carrier (e.g. typical UPS Store or USPS hours). Only set to null if you truly cannot determine any hours.
- carrier: string — the shipping carrier or sender name, e.g. "UPS", "FedEx", "Amazon", "USPS" (null if not found)
- arrivalDate: string — the date the package arrived or is expected, in ISO 8601 format YYYY-MM-DD (null if not found)
- approvalLink: string — a URL link to approve or confirm package arrival/pickup (null if not found). Look for any http/https URL that seems related to confirming, approving, or tracking the delivery.
- trackingLink: string — a URL specifically for tracking the current delivery status/location (null if not found). Distinct from approvalLink. Look for carrier tracking links (ups.com/track, fedex.com/tracking, usps.com/track, il.dhl.com, etc.) or any URL with words like "track", "tracking", "shipment", "parcel".
- pickupCode: string — a PIN, code, or password required to pick up or unlock the package at the pickup point (null if not found). Look for phrases like "pickup code", "PIN", "access code", "locker code", "verification code", etc.
- isHomeDelivery: boolean — true if the package is being delivered directly to the recipient's home address (not a pickup point the recipient must go to).
  English hints: "will be delivered to you", "out for delivery", "delivery to your address", "delivered to your door", "your doorstep", "home delivery", "arriving today", "delivery attempt", "left at your door".
  Hebrew hints: "תימסר אליך" (will be delivered to you), "ימסר אליך", "עד הבית" (to your home), "לכתובת" (to the address), "מסירה לביתך", "שליחות עד הבית", "כץ עד הבית", "חבילה תימסר", "תימסר בימים הקרובים".
  Strong signal: if the message contains a street address (street name + number + city) as the DESTINATION (not a store/post-office), that is home delivery.
  Set to false only if the message explicitly asks the recipient to go pick up the package at a location.

If a field cannot be determined, set it to null.`

export async function suggestIcon(name) {
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You pick a single emoji that best represents a package name. Return ONLY valid JSON: {"icon": "<emoji>"}. Must be exactly one emoji.',
      },
      { role: 'user', content: name },
    ],
  })
  const parsed = JSON.parse(response.choices[0].message.content)
  return parsed.icon ?? '📦'
}

export async function extractPackageInfo(rawMessage) {
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: rawMessage },
    ],
  })

  const parsed = JSON.parse(response.choices[0].message.content)
  return {
    name: parsed.name ?? 'Package',
    icon: parsed.icon ?? '📦',
    trackingId: parsed.trackingId ?? null,
    pickupLocation: parsed.pickupLocation ?? null,
    address: parsed.address ?? null,
    openingTimes: parsed.openingTimes ?? null,
    carrier: parsed.carrier ?? null,
    arrivalDate: parsed.arrivalDate ?? null,
    approvalLink: parsed.approvalLink ?? null,
    trackingLink: parsed.trackingLink ?? null,
    pickupCode: parsed.pickupCode ?? null,
    isHomeDelivery: parsed.isHomeDelivery ?? false,
  }
}

export async function lookupLocationInfo(locationName, context = '') {
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a pickup location info assistant. Given a pickup location name and optional context, return your best guess for its address and opening hours. Return ONLY valid JSON:
- address: string — full street address, or best guess based on the name/context. null only if truly unguessable.
- openingTimes: string — opening hours (e.g. "Mon–Fri 9am–6pm, Sat 10am–4pm"). Infer from location type if unknown. null only if truly unguessable.`,
      },
      { role: 'user', content: `Location: ${locationName}\nContext: ${context}` },
    ],
  })
  const parsed = JSON.parse(response.choices[0].message.content)
  return {
    address: parsed.address ?? null,
    openingTimes: parsed.openingTimes ?? null,
  }
}

const TRACKING_PAGE_PROMPT = `You are a delivery tracking page parser. Extract tracking status from raw HTML and return ONLY valid JSON, no markdown, no explanation.

Fields:
- arrivalDate: string — the current estimated or actual delivery/arrival date in ISO 8601 format YYYY-MM-DD (null if not found)
- pickupLocation: string — the pickup location name if the package is held for collection (null if not found or home delivery)
- carrier: string — the shipping carrier name, e.g. "UPS", "FedEx", "USPS", "DHL" (null if not found)
- status: string — one of: "pending", "in-transit", "delivered", "picked" — infer from page content. Use "delivered" if delivered to address, "picked" if picked up from a location, "in-transit" if still moving, "pending" if not yet shipped. (null if not determinable)
- pickupCode: string — a PIN or code required to collect the package (null if not found)

If a field cannot be determined, set it to null.`

const CARRIER_TRACKING_URLS = {
  'ups':         (id) => `https://www.ups.com/track?tracknum=${id}`,
  'fedex':       (id) => `https://www.fedex.com/fedextrack/?trknbr=${id}`,
  'usps':        (id) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${id}`,
  'dhl':         (id) => `https://www.dhl.com/en/express/tracking.html?AWB=${id}&brand=DHL`,
  'dhl israel':  (id) => `https://il.dhl.com/en/express/tracking.html?AWB=${id}&brand=DHL`,
  'israel post': (id) => `https://israelpost.co.il/content.aspx?id=688&code=${id}`,
  'israelpost':  (id) => `https://israelpost.co.il/content.aspx?id=688&code=${id}`,
  'tnt':         (id) => `https://www.tnt.com/express/en_us/site/shipping-tools/track.html?searchType=CON&cons=${id}`,
  'aramex':      (id) => `https://www.aramex.com/us/en/track/results?ShipmentNumber=${id}`,
  'gls':         (id) => `https://gls-group.com/track/${id}`,
}

export function buildTrackingLink(carrier, trackingId) {
  if (!carrier || !trackingId) return null
  const key = carrier.toLowerCase().trim()
  for (const [pattern, builder] of Object.entries(CARRIER_TRACKING_URLS)) {
    if (key.includes(pattern)) return builder(trackingId)
  }
  return null
}

export async function parseTrackingPage(html) {
  const truncated = html.slice(0, 12000)
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: TRACKING_PAGE_PROMPT },
      { role: 'user', content: truncated },
    ],
  })
  const parsed = JSON.parse(response.choices[0].message.content)
  return {
    arrivalDate: parsed.arrivalDate ?? null,
    pickupLocation: parsed.pickupLocation ?? null,
    carrier: parsed.carrier ?? null,
    status: parsed.status ?? null,
    pickupCode: parsed.pickupCode ?? null,
  }
}
