import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'

export function usePickupLocations(userId) {
  const [locations, setLocations] = useState({}) // { locationName: { openingTimes, ... } }

  useEffect(() => {
    if (!userId) return
    const q = query(collection(db, 'pickupLocations'), where('userId', '==', userId))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const map = {}
      snapshot.docs.forEach((d) => {
        const data = d.data()
        map[data.locationName] = data
      })
      setLocations(map)
    }, console.error)
    return unsubscribe
  }, [userId])

  return locations
}
