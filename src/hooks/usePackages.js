import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'

export function usePackages(userId) {
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) {
      setPackages([])
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'packages'),
      where('userId', '==', userId)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
        setPackages(docs)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [userId])

  return { packages, loading, error }
}
