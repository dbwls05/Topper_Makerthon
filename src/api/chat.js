import { supabase } from '../lib/supabaseClient.js'

// AI Agent 대화 기록 (chat_sessions / chat_messages)
// 로그인한 사용자의 대화만 다룬다. RLS 가 본인 것만 보이도록 막아준다.

const TITLE_MAX = 40

function toMessage(row) {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    grants: row.grants ?? [],
    hasImage: row.has_image,
  }
}

/** 첫 질문으로 대화 제목을 만든다 */
export function titleFromQuestion(text) {
  const clean = text.trim().replace(/\s+/g, ' ')
  if (!clean) return '새 대화'
  return clean.length > TITLE_MAX ? `${clean.slice(0, TITLE_MAX - 1)}…` : clean
}

/** 내 대화 목록 (최근 대화 순) */
export async function listChatSessions() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('id, title, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

/** 대화 하나의 메시지들 */
export async function getChatMessages(sessionId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, grants, has_image')
    .eq('session_id', sessionId)
    .order('id', { ascending: true })
  if (error) throw error
  return data.map(toMessage)
}

/** 새 대화 만들기 */
export async function createChatSession(title = '새 대화') {
  if (!supabase) throw new Error('Supabase 가 연결되지 않았어요.')
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요해요.')

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ user_id: user.id, title })
    .select('id, title, updated_at')
    .single()
  if (error) throw error
  return data
}

/** 메시지 저장 */
export async function addChatMessage(sessionId, message) {
  if (!supabase) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      user_id: user.id,
      role: message.role,
      content: message.content ?? '',
      grants: message.grants ?? [],
      has_image: Boolean(message.image),
    })
    .select('id, role, content, grants, has_image')
    .single()
  if (error) throw error
  return toMessage(data)
}

/** 대화 제목 바꾸기 */
export async function renameChatSession(sessionId, title) {
  if (!supabase) return
  const { error } = await supabase.from('chat_sessions').update({ title }).eq('id', sessionId)
  if (error) throw error
}

/** 대화 삭제 (메시지도 같이 지워진다) */
export async function deleteChatSession(sessionId) {
  if (!supabase) return
  const { error } = await supabase.from('chat_sessions').delete().eq('id', sessionId)
  if (error) throw error
}
