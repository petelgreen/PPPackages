import express from 'express'
import axios from 'axios'
import { wrapper } from 'axios-cookiejar-support'
import { CookieJar } from 'tough-cookie'

const router = express.Router()

// In-memory session store: userId → { jar, axiosInstance }
const sessions = new Map()

function createSession() {
  const jar = new CookieJar()
  const instance = wrapper(axios.create({ jar, withCredentials: true }))
  return { jar, instance }
}

function normalizeParcel(raw) {
  return {
    name: raw.itemDescription || raw.description || raw.ItemDescription || raw.Description || 'Israel Post Package',
    trackingId: raw.barcode || raw.itemCode || raw.Barcode || raw.ItemCode || null,
    israelPostId: raw.barcode || raw.itemCode || raw.Barcode || raw.ItemCode || null,
    carrier: 'Israel Post',
    arrivalDate: raw.expectedDeliveryDate || raw.ExpectedDeliveryDate || raw.arrivalDate || null,
    pickupLocation: raw.branchName || raw.BranchName || raw.pickupLocation || null,
    address: raw.branchAddress || raw.BranchAddress || raw.address || null,
    isHomeDelivery: raw.isHomeDelivery ?? raw.IsHomeDelivery ?? false,
    status: mapStatus(raw.statusCode || raw.StatusCode || raw.status || raw.Status),
    source: 'israelPost',
    icon: '📮',
  }
}

function mapStatus(raw) {
  if (!raw) return 'pending'
  const s = String(raw).toLowerCase()
  if (s.includes('delivered') || s.includes('נמסר') || s.includes('נאסף')) return 'picked'
  if (s.includes('transit') || s.includes('בדרך') || s.includes('בטיפול') || s.includes('נשלח')) return 'in-transit'
  return 'pending'
}

// POST /api/israelpost/login
// Body: { username, password, userId }
router.post('/login', async (req, res) => {
  const { username, password, userId } = req.body
  if (!username || !password || !userId) {
    return res.status(400).json({ error: 'username, password and userId are required' })
  }

  const session = createSession()

  try {
    // Step 1: fetch the login page to get any CSRF tokens / cookies
    await session.instance.get('https://israelpost.co.il/%D7%94%D7%96%D7%93%D7%94%D7%95%D7%AA/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    })

    // Step 2: POST credentials
    const loginRes = await session.instance.post(
      'https://israelpost.co.il/umbraco/surface/LoginSurface/MemberLogin',
      new URLSearchParams({ Username: username, Password: password }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'X-Requested-With': 'XMLHttpRequest',
          Referer: 'https://israelpost.co.il/%D7%94%D7%96%D7%93%D7%94%D7%95%D7%AA/',
        },
      }
    )

    const data = loginRes.data
    // Login failure: Israel Post may return { success: false } or redirect to login page
    if (data && data.success === false) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    if (typeof data === 'string' && data.includes('Login')) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Store session
    sessions.set(userId, session)
    return res.json({ success: true })
  } catch (err) {
    console.error('Israel Post login error:', err.message)
    return res.status(502).json({ error: 'Could not reach Israel Post. Try again.' })
  }
})

// GET /api/israelpost/packages
// Header: x-user-id
router.get('/packages', async (req, res) => {
  const userId = req.headers['x-user-id']
  if (!userId) {
    return res.status(400).json({ error: 'x-user-id header required' })
  }

  const session = sessions.get(userId)
  if (!session) {
    return res.status(401).json({ error: 'Not logged in', code: 'NOT_LOGGED_IN' })
  }

  try {
    const packagesRes = await session.instance.get(
      'https://israelpost.co.il/umbraco/api/TrackerApi/GetParcelsByIdentity',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'application/json',
        },
      }
    )

    const data = packagesRes.data

    // Handle various response shapes
    let rawParcels = []
    if (Array.isArray(data)) {
      rawParcels = data
    } else if (data && Array.isArray(data.items)) {
      rawParcels = data.items
    } else if (data && Array.isArray(data.parcels)) {
      rawParcels = data.parcels
    } else if (data && Array.isArray(data.data)) {
      rawParcels = data.data
    } else if (data && Array.isArray(data.result)) {
      rawParcels = data.result
    }

    const parcels = rawParcels.map(normalizeParcel)
    return res.json({ parcels })
  } catch (err) {
    console.error('Israel Post packages error:', err.message)
    // If we got a 401/403, the session expired
    if (err.response?.status === 401 || err.response?.status === 403) {
      sessions.delete(userId)
      return res.status(401).json({ error: 'Session expired', code: 'NOT_LOGGED_IN' })
    }
    return res.status(502).json({ error: 'Could not fetch packages from Israel Post.' })
  }
})

export default router
