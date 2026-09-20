import { supabase } from './supabaseClient'

// Edge Function 'ai-chat'을 호출하는 얇은 래퍼.
// API 키·시스템 프롬프트는 전부 서버(supabase/functions/ai-chat)에 있고,
// 프론트는 그냥 대화만 넘긴다.
//
// 사용 예:
//   const reply = await askAI([
//     { role: 'user', content: '26살, 서울 노원구, 1인가구, 구직 중이야. 받을 수 있는 지원금 알려줘' },
//   ])
export async function askAI(messages) {
  if (!supabase) {
    throw new Error('Supabase가 연결되지 않았어요. .env 설정을 확인해 주세요.')
  }

  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: { messages },
  })

  if (error) throw error
  return data.reply
}
