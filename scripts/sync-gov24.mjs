// 정부24 공공서비스 → Supabase grants 테이블 동기화
//
// 실행 (프로젝트 루트에서):
//   node --env-file=.env scripts/sync-gov24.mjs --dry-run   가져와서 변환 결과만 확인 (DB 안 건드림)
//   node --env-file=.env scripts/sync-gov24.mjs             DB 에 저장 (upsert)
//
// 필요한 .env 값 (VITE_ 를 붙이지 않는다 — 브라우저에 들어가면 안 되는 키)
//   DATA_GO_KR_KEY             공공데이터포털 인증키 (Decoding)
//   SUPABASE_SERVICE_ROLE_KEY  저장할 때만 필요 (Dashboard → Project Settings → API → service_role)
//   VITE_SUPABASE_URL          이미 있는 값

import { writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { buildSigunguIndex, isForIndividuals, toGrantRow } from './gov24/transform.mjs'

const API_BASE = 'https://api.odcloud.kr/api/gov24/v3'
const PER_PAGE = 1000
const UPSERT_CHUNK = 500
const dryRun = process.argv.includes('--dry-run')

const serviceKey = process.env.DATA_GO_KR_KEY?.trim()
if (!serviceKey) {
  console.error('DATA_GO_KR_KEY 가 .env 에 없어요.')
  process.exit(1)
}

async function fetchAll(path) {
  const rows = []
  for (let page = 1; ; page += 1) {
    const params = new URLSearchParams({ page, perPage: PER_PAGE, serviceKey })
    const res = await fetch(`${API_BASE}${path}?${params}`)
    if (!res.ok) throw new Error(`${path} page ${page}: HTTP ${res.status} ${await res.text()}`)
    const body = await res.json()
    rows.push(...body.data)
    process.stdout.write(`\r  ${path} ${rows.length}/${body.totalCount}`)
    if (rows.length >= body.totalCount || body.data.length === 0) break
  }
  process.stdout.write('\n')
  return rows
}

function countBy(rows, key) {
  const counts = {}
  for (const row of rows) counts[row[key]] = (counts[row[key]] ?? 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
}

async function main() {
  console.log('정부24 공공서비스 가져오는 중...')
  const [list, details, conditions] = await Promise.all([
    fetchAll('/serviceList'),
    fetchAll('/serviceDetail'),
    fetchAll('/supportConditions'),
  ])

  const detailById = new Map(details.map((row) => [row['서비스ID'], row]))
  const condById = new Map(conditions.map((row) => [row['서비스ID'], row]))

  const sigunguIndex = buildSigunguIndex(list)
  const rows = list
    .filter(isForIndividuals)
    .map((item) =>
      toGrantRow(item, detailById.get(item['서비스ID']), condById.get(item['서비스ID']), sigunguIndex),
    )

  const withDocs = rows.filter((row) => row.documents.length > 0).length
  const withDeadline = rows.filter((row) => row.deadline).length
  const withAge = rows.filter((row) => row.age_min !== null || row.age_max !== null).length
  console.log(`\n전체 ${list.length}개 중 개인/가구 대상 ${rows.length}개`)
  console.log(`  서류 목록 있음 ${withDocs} · 마감일 있음 ${withDeadline} · 나이 조건 있음 ${withAge}`)
  console.log('  카테고리', countBy(rows, 'category'))
  console.log('  전국/지역', countBy(rows, 'region_sido').slice(0, 8))

  if (dryRun) {
    const out = process.env.SYNC_SAMPLE_PATH ?? 'gov24-sample.json'
    writeFileSync(out, JSON.stringify(rows.slice(0, 40), null, 2))
    console.log(`\n--dry-run: DB 는 건드리지 않았어요. 샘플 40개 → ${out}`)
    return
  }

  const url = process.env.VITE_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !serviceRole) {
    console.error('\nDB 에 저장하려면 .env 에 SUPABASE_SERVICE_ROLE_KEY 가 필요해요.')
    process.exit(1)
  }
  const admin = createClient(url, serviceRole, { auth: { persistSession: false } })

  console.log('\nSupabase 에 저장 중...')
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK)
    const { error } = await admin.from('grants').upsert(chunk, { onConflict: 'external_id' })
    if (error) throw new Error(`upsert 실패 (${i}~): ${error.message}`)
    process.stdout.write(`\r  ${Math.min(i + UPSERT_CHUNK, rows.length)}/${rows.length}`)
  }
  process.stdout.write('\n')

  // 이번에 없는 정부24 항목(폐지된 서비스)과 예시(seed) 데이터는 숨긴다 — 담아둔 기록이 있을 수 있어 지우지는 않는다
  const current = new Set(rows.map((row) => row.external_id))
  // Supabase 는 한 번에 최대 1000행만 돌려주므로 나눠서 읽는다
  const existing = []
  for (let from = 0; ; from += 1000) {
    const { data, error: listError } = await admin
      .from('grants')
      .select('id, external_id, source')
      .eq('is_active', true)
      .order('id')
      .range(from, from + 999)
    if (listError) throw listError
    existing.push(...data)
    if (data.length < 1000) break
  }
  const stale = existing.filter(
    (row) => (row.source === 'gov24' && !current.has(row.external_id)) || row.source !== 'gov24',
  )
  for (let i = 0; i < stale.length; i += UPSERT_CHUNK) {
    const ids = stale.slice(i, i + UPSERT_CHUNK).map((row) => row.id)
    const { error } = await admin.from('grants').update({ is_active: false }).in('id', ids)
    if (error) throw error
  }
  console.log(`완료: ${rows.length}개 저장, 비활성화 ${stale.length}개`)
}

main().catch((error) => {
  console.error('\n동기화 실패:', error.message)
  process.exit(1)
})
