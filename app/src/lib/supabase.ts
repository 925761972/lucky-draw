import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// 如果缺少环境变量，创建一个假的 client 防止报错
// Realtime 功能在本地将不可用，但在配置了环境变量的 Vercel 环境下正常工作
export const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : {
      from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
      channel: () => {
        const ch = {
          on: () => ch,
          subscribe: () => {}
        }
        return ch
      },
      removeChannel: () => {},
    } as any

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('Supabase env vars missing. Realtime features disabled. Please create .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}
