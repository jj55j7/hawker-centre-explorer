import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)

// Generate or retrieve a session ID for anonymous favouriting
export function getSessionId() {
  let id = localStorage.getItem('hawker_session')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('hawker_session', id)
  }
  return id
}