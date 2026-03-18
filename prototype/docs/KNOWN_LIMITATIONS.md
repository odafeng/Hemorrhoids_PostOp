# 已知限制與技術決策

## iOS 推播通知

**限制**：iOS Safari 僅在 iOS 16.4+ 且 PWA 模式下（加入主畫面後）支援 Web Push。

**對策**：
1. `IOSInstallPrompt` 元件引導 iOS 用戶「加入主畫面」
2. PWA manifest 已配置完整
3. Server-driven `check-adherence` cron 每日產生 `pending_notifications`，App 開啟時自動讀取

**影響**：
- 收案時需要在知情同意書中說明此限制
- 建議在 Onboarding 流程中協助病人加入主畫面

---

## System Prompt 維護

**架構**：
- 唯一來源：`shared/system-prompt.json`
- 同步機制：`npm run sync-prompt` → 自動產生 `supabase/functions/ai-chat/_prompt.ts`
- CI 中 `predeploy` script 自動執行同步

**更新流程**：
1. 修改 `shared/system-prompt.json`
2. 執行 `npm run sync-prompt`（或部署時自動同步）
3. 重新部署 Edge Function：`supabase functions deploy ai-chat`

---

## Researcher 帳號建立

目前沒有自助 Researcher 註冊流程。Researcher/PI 帳號需要：
1. 在 Supabase Dashboard → Authentication → Users 手動建立
2. 設定 `user_metadata.role = 'researcher'` 或 `'pi'`

---

## Rate Limiting

Edge Function 的 rate limiting 是 per-instance in-memory（20 req/min per IP）。
Supabase Edge Functions 可能在多個 instance 上運行，限制不是全域的。
對 100 人規模研究足夠，若需更嚴格可升級為 Redis-based。

---

## PII 對照表

`pii_patients` 表需手動由研究者在 Supabase SQL Editor 執行 INSERT。
目前無 UI 介面管理 PII 對照。此為 IRB 設計決策：降低 PII 洩露風險。
