# Prototype — 痔瘡術後追蹤 PWA

React + Vite 前端 + Supabase 後端 + Sentry 監控。

## 部署步驟

### 1. Supabase 設定

```bash
# 安裝 Supabase CLI
npm install -g supabase

# 登入並連結專案
supabase login
supabase link --project-ref <your-project-ref>

# 套用 schema（首次）
psql <SUPABASE_DB_URL> -f db/schema.sql

# 之後的 migration
supabase db push
```

### 2. Edge Functions 部署

```bash
# 先同步 system prompt
npm run sync-prompt

# 部署 Edge Functions
supabase functions deploy ai-chat              # JWT 驗證（gateway + function 雙層）
supabase functions deploy patient-onboard      # JWT 驗證
supabase functions deploy check-adherence --no-verify-jwt  # 用 CRON_SECRET 驗證
```

Edge Function 環境變數（在 Supabase Dashboard → Edge Functions → Settings 設定）：

| 變數 | 說明 |
|------|------|
| `CLAUDE_API_KEY` | Claude API key（Anthropic） |
| `CRON_SECRET` | check-adherence cron 驗證密碼 |

### 3. 前端部署（Vercel）

```bash
npm install
vercel --prod
```

Vercel 環境變數（在 Vercel Dashboard → Settings → Environment Variables 設定）：

| 變數 | 說明 |
|------|------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_INVITE_CODE` | 註冊邀請碼（預設 `HEMORRHOID2026`） |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN |

### 4. GitHub Secrets（for CI + Cron）

在 GitHub → Settings → Secrets and variables → **Actions** 設定：

| Secret | 說明 |
|--------|------|
| `SUPABASE_URL` | Supabase project URL |
| `CRON_SECRET` | 與 Edge Function env 相同的密碼 |

### 5. 研究者帳號

在 Supabase Dashboard → Authentication → Users → Add User：

```json
{ "role": "researcher", "study_id": "RESEARCHER-001" }
```

## 開發

```bash
npm run dev            # 開發模式 (port 5173)
npm test               # 100 unit tests
npm run build          # Production build
npm run sync-prompt    # 同步 system prompt → Edge Function
```

## System Prompt 維護

- **唯一來源**：`shared/system-prompt.json`
- **同步機制**：`npm run sync-prompt` → 自動產生 `supabase/functions/ai-chat/_prompt.ts`
- **CI 自動**：deploy 前會自動執行 `predeploy` script 同步

## 測試

```
9 test files, 100+ tests:
├── alerts.test.js          — 17 alert rules
├── high-risk.test.js       — 11 auth + edge cases + errorLogger
├── mockAI.test.js          — 14 mock AI responses
├── storage.test.js         — 16 localStorage operations
├── schemaAlignment.test.js — schema contract smoke tests (DB ↔ frontend ↔ migrations)
├── AIChat.test.jsx         — 7 AI chat UI
├── Dashboard.test.jsx      — 10 dashboard rendering
├── History.test.jsx        — 7 history display
├── Login.test.jsx          — 8 login/register flow
└── SymptomReport.test.jsx  — 10 symptom report form
```

## Schema 來源

- **唯一真相（Source of Truth）**：`supabase/migrations/` 目錄下的 ordered migration files
- **db/schema.sql**：僅供參考（reference only），可能與最新 migration 有差異
- **Schema Contract**：`src/utils/schemaContract.js` 定義 frontend ↔ DB 欄位對應，CI 會自動驗證
- 若需最新完整 schema：`supabase db dump --schema public > db/schema_snapshot.sql`
