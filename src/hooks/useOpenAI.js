import { useState } from 'react'
import { extractPackageInfo } from '../lib/openai'

export function useOpenAI() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function extract(rawMessage) {
    setLoading(true)
    setError(null)
    try {
      const result = await extractPackageInfo(rawMessage)
      return result
    } catch (err) {
      setError(err.message || 'Failed to extract package info')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { extract, loading, error }
}
