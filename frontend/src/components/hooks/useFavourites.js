import { useState, useEffect } from 'react'
import { supabase, getSessionId } from '../utils/supabase'

export function useFavourites() {
  const [favourites, setFavourites] = useState(new Set())
  const sessionId = getSessionId()

  // Load existing favourites on mount
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('favourites')
        .select('hawker_id')
        .eq('session_id', sessionId)

      if (data) {
        setFavourites(new Set(data.map(r => r.hawker_id)))
      }
    }
    load()
  }, [])

  async function toggleFavourite(hawker) {
    const isFav = favourites.has(hawker.id)

    if (isFav) {
      // Remove
      await supabase
        .from('favourites')
        .delete()
        .eq('session_id', sessionId)
        .eq('hawker_id', hawker.id)

      setFavourites(prev => {
        const next = new Set(prev)
        next.delete(hawker.id)
        return next
      })
    } else {
      // Add
      await supabase
        .from('favourites')
        .insert({ session_id: sessionId, hawker_id: hawker.id, hawker_name: hawker.name })

      setFavourites(prev => new Set([...prev, hawker.id]))
    }
  }

  return { favourites, toggleFavourite }
}