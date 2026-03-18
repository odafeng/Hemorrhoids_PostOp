# 已知限制與技術決策

## iOS 推播通知

**限制**：iOS Safari 僅在 iOS 16.4+ 且 PWA 模式下（加入主畫面後）支援 Web Push。

**對策**：
1. 加入 `IOSInstallPrompt` 元件，引導 iOS 用戶「加入主畫面」
2. PWA manifest 已配置完整（`manifest.json` + meta tags）
3. 對於不支援推播的情境，app 仍依賴每次開啟時的 UI 提醒

**影響**：
- 收案時需要在知情同意書中說明此限制
- 建議在 Onboarding 流程中協助病人加入主畫面

---

## System Prompt 維護

**架構**：
- 唯一來源：`shared/system-prompt.json`
- `api-proxy.mjs`：在 runtime 讀取 JSON（自動同步）
- `supabase/functions/ai-chat/index.ts`：inline 副本（Supabase Edge Function 無法 import 上層目錄）

**更新流程**：
1. 修改 `shared/system-prompt.json`
2. 手動同步 `supabase/functions/ai-chat/index.ts` 中的 inline prompt
3. 重新部署 Edge Function：`supabase functions deploy ai-chat --no-verify-jwt`

---

## Researcher 帳號建立

目前沒有自助 Researcher 註冊流程。Researcher/PI 帳號需要：
1. 在 Supabase Dashboard → Authentication → Users 手動建立
2. 設定 `user_metadata.role = 'researcher'` 或 `'pi'`

---

## Rate Limiting

Edge Function 的 rate limiting 是 per-instance in-memory。
Supabase Edge Functions 可能在多個 instance 上運行，限制不是全域的。
對 pilot study 規模（10-30 人）足夠。
