// AI Agent — OpenAI 를 대신 호출하는 서버 함수 (Supabase Edge Function)
//
// 브라우저는 OpenAI 키를 모른다. 이 함수만 Supabase Secrets 의 OPENAI_API_KEY 를 쓴다.
//   1) 로그인한 사용자인지 확인
//   2) 하루 호출 횟수 제한 (ai_usage 테이블)
//   3) 내 프로필 + DB 의 지원금 후보를 읽어서
//   4) "후보 안에서만" 답하도록 OpenAI 에 요청
//
// 필요한 Secrets (Dashboard → Edge Functions → Secrets)
//   OPENAI_API_KEY  (필수)
//   OPENAI_MODEL    (선택, 기본 gpt-4o-mini — OpenAI 문서에서 현재 모델명을 확인해 바꿔도 된다)
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY 는 Supabase 가 자동으로 넣어준다.

import { createClient } from "npm:@supabase/supabase-js@2";

const DAILY_LIMIT = 30;
const MAX_HISTORY = 12;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_CANDIDATES = 30;
// 첨부 이미지(data URL) 최대 길이 — 화면에서 1280px JPEG 로 줄여 보내므로 보통 300KB 안쪽
const MAX_IMAGE_DATA_URL_LENGTH = 3_000_000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ChatMessage = { role: "user" | "assistant"; content: string; image?: string };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function isImageDataUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^data:image\/(jpeg|png|webp|gif);base64,/.test(value) &&
    value.length <= MAX_IMAGE_DATA_URL_LENGTH
  );
}

// 브라우저가 보낸 대화 기록을 믿지 않고 형식/길이를 정리한다
// 이미지는 마지막 사용자 메시지에 붙은 것만 쓴다
function sanitizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  const cleaned = input
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        (m.content.trim() !== "" || (m.role === "user" && isImageDataUrl(m.image))),
    )
    .slice(-MAX_HISTORY);
  return cleaned.map((m, index) => ({
    role: m.role,
    content: m.content.slice(0, MAX_MESSAGE_LENGTH),
    ...(index === cleaned.length - 1 && m.role === "user" && isImageDataUrl(m.image)
      ? { image: m.image }
      : {}),
  }));
}

// OpenAI 형식으로 변환 — 이미지가 있으면 텍스트 + 이미지 파트로 보낸다
function toOpenAIMessage(m: ChatMessage) {
  if (!m.image) return { role: m.role, content: m.content };
  return {
    role: m.role,
    content: [
      { type: "text", text: m.content || "이 이미지를 보고 도와주세요." },
      { type: "image_url", image_url: { url: m.image, detail: "auto" } },
    ],
  };
}

function buildSystemPrompt(
  profile: Record<string, unknown> | null,
  grants: unknown[],
) {
  return `너는 "NUDGE"라는 한국 공공 지원금 안내 도우미야.
사용자의 상황에 맞는 지원금을 찾아주고, 신청 준비를 도와줘.

규칙
- 아래 [지원금 목록]에 있는 지원금만 추천하거나 언급해. 목록에 없는 제도를 지어내지 마.
- 금액, 자격 조건, 마감일은 목록에 적힌 내용만 말해. 모르면 "공고문에서 확인이 필요해요"라고 해.
- 맞는 지원금이 목록에 없으면 솔직하게 없다고 말하고, 프로필에서 더 알려주면 좋은 정보를 물어봐.
- 자격 판단은 참고용이며 최종 확인은 공식 공고/기관에서 해야 한다고 필요할 때 짧게 안내해.
- 한국어로, 친근한 존댓말로, 핵심만 짧게 답해. 추천할 때는 지원금 이름과 이유를 함께 말해.
- 사용자가 이미지(서류 사진, 공고문 캡처 등)를 보내면 내용을 읽고 어떤 서류/공고인지, 무엇을 확인·준비하면 되는지 설명해. 주민등록번호 같은 개인정보는 답변에 옮겨 적지 마.
- 지원금 이름은 목록의 title 과 똑같이 써. 강조할 부분은 **굵게** 로 감싸. 문단 사이는 빈 줄로 나눠.

[사용자 프로필]
${JSON.stringify(profile ?? {}, null, 0)}

[지원금 목록] (오늘 ${today()} 기준 신청 가능한 것)
${JSON.stringify(grants, null, 0)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST")
    return json({ error: "지원하지 않는 요청이에요." }, 405);

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey)
    return json({ error: "서버에 OPENAI_API_KEY 가 설정되지 않았어요." }, 500);

  // 1) 로그인 확인 — 사용자 토큰으로 만든 클라이언트라 RLS 가 그대로 적용된다
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: authHeader } },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "로그인이 필요해요." }, 401);

  const body = await req.json().catch(() => ({}));
  const messages = sanitizeMessages(body.messages);
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return json({ error: "질문을 입력해 주세요." }, 400);
  }

  // 2) 하루 호출 제한 — ai_usage 는 service_role 로만 접근
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: usage } = await admin
    .from("ai_usage")
    .select("count")
    .eq("user_id", user.id)
    .eq("day", today())
    .maybeSingle();
  const used = usage?.count ?? 0;
  if (used >= DAILY_LIMIT) {
    return json(
      {
        error: `오늘 AI 질문 횟수(${DAILY_LIMIT}회)를 모두 썼어요. 내일 다시 이용해 주세요.`,
      },
      429,
    );
  }
  await admin
    .from("ai_usage")
    .upsert({ user_id: user.id, day: today(), count: used + 1 });

  // 3) 프로필 + 지원금 후보
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "region, birth_year, income_level, household_type, employment_status, interests",
    )
    .eq("id", user.id)
    .maybeSingle();

  let grantsQuery = supabase
    .from("grants")
    .select(
      "id, category, title, description, agency, region, deadline, benefit, apply_url, documents",
    )
    .eq("is_active", true)
    .or(`deadline.is.null,deadline.gte.${today()}`)
    .limit(MAX_CANDIDATES);
  if (profile?.region) {
    grantsQuery = grantsQuery.in("region", ["전국", profile.region]);
  }
  const { data: grants, error: grantsError } = await grantsQuery;
  if (grantsError)
    return json(
      { error: `지원금 목록을 불러오지 못했어요: ${grantsError.message}` },
      500,
    );

  // 4) OpenAI 호출
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 800,
      messages: [
        { role: "system", content: buildSystemPrompt(profile, grants ?? []) },
        ...messages.map(toOpenAIMessage),
      ],
    }),
  });

  if (!openaiRes.ok) {
    const detail = await openaiRes.text();
    console.error("OpenAI error", openaiRes.status, detail);

    // OpenAI 에러 코드로 원인을 구분한다 (429 도 '잔액 없음'과 '요청 과다'는 다르다)
    let code = "";
    try {
      code = JSON.parse(detail)?.error?.code ?? "";
    } catch {
      // 본문이 JSON 이 아니면 상태 코드로만 판단
    }

    // 실패한 요청은 하루 사용 횟수에서 빼준다
    await admin
      .from("ai_usage")
      .upsert({ user_id: user.id, day: today(), count: used });

    const message =
      code === "insufficient_quota"
        ? "OpenAI 계정에 크레딧(잔액)이 없어요. platform.openai.com → Billing 에서 크레딧을 충전해 주세요."
        : code === "model_not_found"
          ? "설정한 OpenAI 모델을 쓸 수 없어요. OPENAI_MODEL 값을 확인해 주세요."
          : openaiRes.status === 401
            ? "OpenAI API 키가 올바르지 않아요."
            : openaiRes.status === 429
              ? "OpenAI 요청이 너무 많아요. 잠시 후 다시 시도해 주세요."
              : `AI 응답을 받지 못했어요. (OpenAI ${openaiRes.status}${code ? ` ${code}` : ""})`;
    return json({ error: message, code }, 502);
  }

  const completion = await openaiRes.json();
  const reply = completion.choices?.[0]?.message?.content?.trim() ?? "";

  // 답변에 이름이 나온 지원금은 화면에서 카드로 보여준다
  const mentioned = (grants ?? [])
    .filter((grant) => reply.includes(grant.title))
    .slice(0, 3)
    .map((grant) => ({ id: grant.id, title: grant.title, benefit: grant.benefit ?? "" }));

  return json({ reply, grants: mentioned, remaining: DAILY_LIMIT - used - 1 });
});
