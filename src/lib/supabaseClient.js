import { createClient } from '@supabase/supabase-js'

// .env에 두 값이 채워져 있으면 실제 Supabase 클라이언트를 만들고,
// 비어 있으면 null을 내려서 앱 전체가 데모 모드로 동작하게 한다.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null
