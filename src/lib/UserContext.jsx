import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// TODO: 로그인 기능이 붙으면 이 임시 이름은 지워도 된다.
// 로그인한 사용자가 있으면 회원가입 때 저장한 user_metadata.name 을 대신 쓴다.
export const TEMP_USER_NAME = '조은지'

const UserContext = createContext({
  name: TEMP_USER_NAME,
  givenName: toGivenName(TEMP_USER_NAME),
  email: '',
  isLoggedIn: false,
  signOut: async () => {},
})

// "조은지" → "은지" 처럼 인사말에 쓸 이름. 한글 3~4자 이름만 성을 떼고, 나머지는 그대로 쓴다.
export function toGivenName(name) {
  return /^[가-힣]{3,4}$/.test(name) ? name.slice(1) : name
}

function nameFromUser(user) {
  return user?.user_metadata?.name?.trim() || TEMP_USER_NAME
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (!supabase) return undefined

    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const name = nameFromUser(user)
  const value = {
    name,
    givenName: toGivenName(name),
    email: user?.email ?? '',
    isLoggedIn: Boolean(user),
    signOut: async () => {
      if (supabase) await supabase.auth.signOut()
    },
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useCurrentUser() {
  return useContext(UserContext)
}
