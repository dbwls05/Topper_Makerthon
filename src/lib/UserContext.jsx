import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { refreshSavedGrants } from './savedGrants.js'

// Supabase 미설정(데모 모드)일 때만 쓰는 이름. 로그인하면 회원가입 때 저장한 이름을 쓴다.
const DEMO_USER_NAME = '게스트'

const UserContext = createContext({
  name: DEMO_USER_NAME,
  givenName: DEMO_USER_NAME,
  email: '',
  isLoggedIn: false,
  loading: true,
  signOut: async () => {},
})

// "조은지" → "은지" 처럼 인사말에 쓸 이름. 한글 3~4자 이름만 성을 떼고, 나머지는 그대로 쓴다.
export function toGivenName(name) {
  return /^[가-힣]{3,4}$/.test(name) ? name.slice(1) : name
}

function nameFromUser(user) {
  return user?.user_metadata?.name?.trim() || DEMO_USER_NAME
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  // 새로고침 직후에는 로그인 여부를 아직 모른다. 확인이 끝나기 전에 화면을 보내지 않으려고 쓴다.
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return undefined

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // 로그인/로그아웃하면 "담은 혜택" 목록을 그 사용자 기준으로 다시 불러온다
  const userId = user?.id ?? null
  useEffect(() => {
    refreshSavedGrants().catch(() => {})
  }, [userId])

  const name = nameFromUser(user)
  // 데모 이름('게스트')은 성이 아니므로 로그인한 사용자 이름에만 성을 뗀다
  const value = {
    name,
    givenName: user ? toGivenName(name) : name,
    email: user?.email ?? '',
    isLoggedIn: Boolean(user),
    loading,
    // Supabase 미설정(데모 모드)에서는 로그인 없이도 화면을 볼 수 있게 한다
    demoMode: !supabase,
    signOut: async () => {
      if (supabase) await supabase.auth.signOut()
    },
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useCurrentUser() {
  return useContext(UserContext)
}
