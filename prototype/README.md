# Prototype — 痔瘡術後追蹤 PWA

React + Vite 前端 + Supabase 後端。

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
supabase functions deploy ai-chat --no-verify-jwt
supabase functions deploy patient-onboard --no-verify-jwt
```

Edge Function 環境變數（在 Supabase Dashboard 設定）：
- `ANTHROPIC_API_KEY` — Claude API key

### 3. 前端部署（Vercel）

```bash
npm install
vercel --prod
```

前端環境變數（在 Vercel Dashboard 設定）：
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_INVITE_CODE`

### 4. Researcher 帳號

在 Supabase Dashboard → Authentication → Users 手動建立：
- `user_metadata.role = 'researcher'`（或 `'pi'`）

## 開發

```bash
npm run dev       # 開發模式
npx vitest run    # 跑 89 個測試
npm run build     # Production build
```

## System Prompt 維護

唯一來源：`shared/system-prompt.json`

`api-proxy.mjs`（已刪除）和 Edge Function `ai-chat/index.ts` 都使用此 prompt。
Edge Function 因為 Supabase 限制，prompt 是 inline 的 — 修改時需手動同步。
