import { useState, useEffect } from 'react'
import { supabase, getSessionId } from '../utils/supabase'

export function useFavourites() {
  const [favourites, setFavourites] = useState(new Set())
  const sessionId = getSessionId()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('favourites')
        .select('hawker_id')
        .eq('session_id', sessionId)
      if (data) setFavourites(new Set(data.map(r => r.hawker_id)))
    }
    load()
  }, [])

  async function toggleFavourite(hawker) {
    const isFav = favourites.has(hawker.id)
    if (isFav) {
      await supabase.from('favourites').delete()
        .eq('session_id', sessionId).eq('hawker_id', hawker.id)
      setFavourites(prev => { const n = new Set(prev); n.delete(hawker.id); return n })
    } else {
      await supabase.from('favourites').insert({
        session_id: sessionId, hawker_id: hawker.id, hawker_name: hawker.name
      })
      setFavourites(prev => new Set([...prev, hawker.id]))
    }
  }

  return { favourites, toggleFavourite }
}