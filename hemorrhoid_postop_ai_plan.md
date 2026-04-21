# 以手機應用程式為基礎之痔瘡手術術後症狀監測與數位衛教系統（結合AI輔助）的前瞻性試驗

---

## 一、背景與重要性（Background）

痔瘡手術（hemorrhoidectomy 或 stapled hemorrhoidopexy）術後常見症狀包括疼痛、出血、排便困難與傷口不適，且具有明顯時間序列變化，例如疼痛通常於術後第2至第5天達高峰。

目前術後衛教多依賴紙本與口頭說明，病人資訊保留率有限。臨床上常見病人因症狀不確定性產生焦慮，進而增加非必要門診或急診就醫，亦造成醫療資源負擔。

因此，建立一套結構化、可持續追蹤之術後症狀回報系統，並結合數位衛教工具，有望提升病人依從性與術後照護品質。

---

## 二、研究目的（Objectives）

### Primary Objective
在痔瘡術後 30 天追蹤情境下，評估病人自述結果（patient-reported outcome, PRO）回報完成率隨術後天數之**衰減曲線（adherence decay curve）**，以描述術後急性期數位健康介入之依從性模式。

本研究聚焦於此一指標，理由為：既有 adherence 文獻多來自慢病或腫瘤追蹤，**外科急性術後（前 30 天）之 PRO adherence decay curve 在文獻中仍缺乏實證數據**；此一參數對後續 RCT 設計（sample size 計算、dropout 估計、回報頻率最佳化）具直接價值。

### Secondary Objectives
- 評估病人滿意度與系統可用性（Likert 問卷）
- 產生後續 RCT 所需之設計參數：adherence decay parameters、dropout rate

### Exploratory Objectives
- 術後症狀時間序列軌跡描述（NRS / 出血 / 排便 / 傷口）
- Digital divide 探索：年齡與 adherence 之關聯

---

## 三、研究設計（Study Design）

- 設計類型：前瞻性單中心 pilot feasibility study
- 研究對象：接受痔瘡手術之成年患者

### 樣本數

本研究為 pilot feasibility study，樣本數設定參考先導型數位健康研究常用規模，目的在估計招募可行性、使用接受度與問卷完成率，並取得後續正式比較研究之參數估計值，因此以 **30–50 例**作為初步目標。

預設可行性門檻（go / no-go criteria）：

| 項目 | 門檻 | 依據 |
|------|------|------|
| App 啟用率（activation rate） | ≥ 80% | 招募可行性基本指標 |
| POD 7 每日回報完成率 | ≥ 60% | 既有外科術後 PRO 文獻之下限估計 |
| POD 14 累積完成率 | ≥ 50% | 考量 novelty effect 衰減後之保守估計 |

未達門檻不表示研究失敗，而是作為後續 protocol 修正（回報頻率、提醒策略、UI 優化）之依據。

### 納入條件
- 年滿18歲
- 接受痔瘡手術
- 可使用智慧型手機

### 排除條件
- 無法操作手機者
- 認知功能障礙者

### 介入方式
病人於術後下載並使用本研究開發之手機應用程式，依以下頻率填寫結構化症狀問卷：

- **術後第 0–7 天**：每日回報
- **術後第 8–14 天**：每 2 天回報一次
- **術後第 15–30 天（視需要延伸）**：每週回報 1–2 次

回報頻率可依症狀嚴重度與恢復進程進行調整，以降低問卷疲勞並提升依從性。

### 研究限制與未來方向

本研究第一階段以單臂 feasibility pilot study 為主，未設置對照組，因此無法直接比較介入效果與標準照護之差異。若初步結果支持系統之可行性與接受度，將進一步設計納入 historical control 或同期非隨機對照之比較研究，以評估其對醫療利用與病人結果之影響。

---

## 四、系統設計（System Design）

### (A) 症狀回報模組

每次填寫結構化問卷（預計30秒內完成），採混合式設計（hybrid approach），能使用既有驗證工具之項目即引用，無法直接套用之項目則由研究團隊依臨床需求設計（study-specific structured symptom items）：

- 疼痛分數：採 **Numeric Rating Scale (NRS) 0–10**（validated instrument）
- 出血程度（無 / 少量 / 持續 / 血塊）──由臨床團隊定義之分級
- 排便狀況（正常 / 困難 / 未排）──研究專用結構化題項
- 發燒（是 / 否，體溫 ≥ 38°C 為發燒）──客觀生理項目
- 傷口狀況（腫脹 / 分泌物 / 無異常）──研究專用結構化題項
- 病人滿意度與系統可用性：採 **5-point Likert scale** 及參考 **System Usability Scale (SUS)** 概念之簡短問卷，於術後第 14 天或研究結束時評估

上述研究專用題項（出血分級、排便狀況、傷口狀況）將於研究開始前由 2–3 位具相關經驗之大腸直腸外科醫師進行內容效度審查（content validity review），以確保臨床適切性與可理解性。

---

### (B) 規則引擎（Rule-based Alerts）

系統內建預設警示條件（由臨床團隊定義之操作型定義），**以 Server-side PostgreSQL Trigger（`fn_check_alerts()`）實作**，於每次症狀回報 INSERT 後自動執行，不可被前端繞過：

- **疼痛警示**：NRS ≥ 8 且連續 3 次以上回報
- **出血警示**：連續 2 次回報為「持續」或任一次出現「血塊」
- **排便警示**：連續 ≥ 3 天回報「未排」
- **發燒警示**：任一次回報體溫 ≥ 38°C

當符合任一警示條件時，系統自動於 `alerts` 資料表建立紀錄，並同時寫入 `audit_trail` 稽核表。研究者 Dashboard 即時顯示所有未處理警示。

另設有 **Server-driven Adherence Check**：透過 GitHub Actions 排程，每日台灣時間 12:00 及 20:00 呼叫 `check-adherence` Edge Function，檢查所有 active patients 是否已完成當日回報。未回報者自動產生 `pending_notifications` 提醒紀錄。

上述警示閾值於研究開始前由研究團隊依臨床判斷設定，並可依實際運行狀況進行調整。

---

### (C) AI 衛教模組

AI 模組採用 **Anthropic Claude API**（claude-3-5-haiku 模型），透過 Supabase Edge Function（`ai-chat`）代理呼叫，前端不暴露 API Key。

**功能：**
- 提供術後衛教內容（疼痛管理、傷口照護、排便、飲食等）
- 將醫學資訊轉為病人易理解之繁體中文
- 支援多輪對話（最近 20 則歷史訊息）
- 可接收去識別化近期症狀摘要作為對話背景

**重要聲明：**

本系統之 AI 僅用於衛教與資訊呈現，不提供診斷或治療建議。

#### 安全機制

- **JWT 雙層驗證**：Supabase Gateway 先驗證 JWT → Edge Function 再以 `auth.getUser()` 驗證
- **無匿名 fallback**：未登入使用者無法存取 AI 功能
- **Rate limiting**：Supabase Edge Function 內建頻率限制
- **AI request metrics**：每次請求記錄 latency、status、token 使用量至 `ai_request_logs` 表

#### AI 內容邊界（Guardrails）

**System prompt 單一來源**：`shared/system-prompt.json`，透過 `scripts/sync-prompt.mjs` 於部署前自動同步至 Edge Function，消除 config drift。

**可回答範圍：**
- 術後疼痛管理（高峰期、緩解方式）
- 出血相關說明（正常範圍、何時就醫）
- 排便問題（便秘預防、排便技巧）
- 發燒處理（體溫 ≥ 38°C 應就醫）
- 傷口照護（溫水坐浴方法、清潔方式）
- 飲食建議、活動與工作復原、回診時機

**不可回答範圍（系統將拒絕回應並引導病人聯絡醫療團隊）：**
- 個別藥物處方或劑量調整建議
- 診斷判定
- 是否需要再次手術之判斷
- 急重症處置建議
- 任何非痔瘡手術相關之醫療問題

#### 知識庫建立與審核機制

- **內容來源**：以院內術後衛教標準化文件及臨床指引為基礎，編入 system prompt
- **建立者**：由研究團隊彙整
- **審核者**：由主持人及共同主持醫師審核
- **版本控管**：system prompt 以 JSON 檔案管理，納入 Git 版本控制，更新時需經醫師審核
- **更新頻率**：依臨床指引更新或研究團隊判斷，至少每半年檢視一次

#### 品質保證流程

- 研究者可透過 **AI 對話審核功能**（ChatReview 頁面）查看所有病人與 AI 的對話紀錄
- 研究初期將審核前 10 例病人之所有互動紀錄
- 所有 AI 請求之 latency、token 使用量、成功/失敗狀態均記錄於 `ai_request_logs` 表
- Sentry 即時監控 AI 呼叫失敗並告警

---

## 五、資料收集與變項（Data Collection）

### 病人層級資料
- 基本資料：年齡、性別、手術方式（hemorrhoidectomy / stapled hemorrhoidopexy / 其他）、手術日期、麻醉方式
- 每日症狀資料（time-series）：NRS、出血、排便、發燒、傷口狀況
- App 使用行為：登入時間戳、回報提交時間戳
- 病人滿意度與可用性問卷（POD 14 或研究結束時）

### Adherence 衍生變項
- 每日回報完成狀態（binary per POD）
- 累積回報次數
- 首次連續 ≥ 3 天未回報之 POD（time-to-dropout event）

### 資料來源表對應
| 變項類別 | 資料表 |
|---------|--------|
| 基本資料 | `patients` |
| 症狀回報 | `symptom_reports` |
| 滿意度 | `usability_surveys` |

---

## 六、Outcome 定義

### Primary Outcome

**PRO adherence decay curve**

**主要指標**：每日回報完成率（daily completion rate）隨術後天數（POD 0–30）之衰減曲線

**次指標**：
- POD 7 每日完成率
- POD 14 累積完成率
- 中位「首次連續 3 天未回報」時點（median time-to-dropout）
- 分層分析：年齡（< 60 / ≥ 60）、手術方式（hemorrhoidectomy / stapled hemorrhoidopexy）、surgeon

**資料來源**：`symptom_reports` 表 × `patients.surgery_date`

**可行性門檻**：POD 7 每日完成率 ≥ 60%；POD 14 累積完成率 ≥ 50%

### Secondary Outcomes

- **系統可用性**：5 題 Likert 可用性問卷（ease of use / usefulness / satisfaction / recommend / overall），於 POD 14 或研究結束時收集；報告中位數與四分位距
- **後續 RCT 參數估計**：adherence decay parameters（供 sample size 計算）、dropout rate

### Exploratory Outcomes

- 術後症狀時間序列個案層級軌跡（NRS、bleeding、bowel frequency、wound status）
- Digital divide 探索：年齡 vs adherence 之關聯

---

## 七、統計分析（Statistical Analysis）

本研究以描述性統計為主，不進行正式假說檢定。所有比例估計附 95% 信賴區間（Wilson score interval）。

### Primary 分析 — Adherence decay

- Kaplan-Meier 風格 adherence survival curve，event 定義為「當日未完成回報」
- 每日完成率時間序列圖（POD 0–30），附 95% CI
- Median time-to-dropout（Kaplan-Meier 估計）
- 分層分析：年齡組、手術方式、surgeon
- Non-parametric 描述：median, IQR
- **輸出參數**：logistic / exponential decay model 之係數，供後續 RCT sample size 計算使用

### 次要與探索性分析

- 可用性問卷：median, IQR；5 題分別及整體總分
- 症狀軌跡：個案層級 spaghetti plot + cohort-level median curve
- 年齡 vs adherence：分層描述 + 探索性 correlation（Spearman）

### 分析工具
- R（survival, ggplot2）或 Python（lifelines, matplotlib）
- 所有分析程式碼納入 Git 版本控制，確保可重現性

> **註**：本研究為 pilot feasibility study，統計目的在於**估計參數、描述現象、產生假說**，而非進行正式假說檢定。所有門檻（go / no-go criteria）於 protocol 中預先登錄，以避免 post-hoc 調整。

---

## 八、倫理與風險控管（Ethics & Risk Management）

### 醫療風險控制
本系統不提供診斷或治療建議，所有異常情況均建議病人聯絡醫療機構。AI 回覆設有明確內容邊界（詳見第四節 AI 衛教模組），並有人工抽查品質保證機制。

### AI 使用原則
AI 僅用於衛教內容生成，所有內容來自醫師審核之標準化知識庫，並有版本控管與定期審核機制。

### 資料安全與隱私保護

本研究遵循台灣《個人資料保護法》及院內資訊安全規範，採最小必要原則處理個人資料：

- **去識別化處理**：所有研究資料以研究編號（Study ID）取代個人身份資訊。個資主檔（`pii_patients`）以 `pgp_sym_encrypt()` 加密病歷號，與研究資料表（`patients`）分離儲存
- **Row Level Security（RLS）**：所有資料表啟用 RLS，依角色（patient / researcher / pi）隔離存取權限
- **加密傳輸**：所有資料傳輸採 HTTPS 加密
- **儲存位置**：研究資料儲存於 Supabase（AWS 基礎設施），符合 SOC 2 Type II 標準
- **稽核追蹤**：所有症狀回報提交與警示建立均自動寫入 `audit_trail` 資料表
- **AI 模組資料處理**：
  - 傳送至 Claude API 之內容僅限必要之非識別化 symptom summary，**不包含姓名、病歷號、電話、生日等可識別資訊**
  - 使用 Anthropic Claude API，API Key 僅存於 Supabase Edge Function 環境變數中，前端不暴露
  - AI 請求需通過 JWT 雙層驗證（Supabase Gateway + Edge Function），未登入使用者無法存取
  - 知情同意書中明確告知病人資料處理方式

---

## 九、技術架構（Technical Architecture）

### 系統架構原則

採用 **Progressive Web App（PWA）** 架構，病人透過手機瀏覽器使用，不需上架 App Store。前端負責病人互動與症狀填報；後端以 Supabase 提供身份驗證、資料儲存、Edge Function 及 PostgreSQL Trigger；AI 僅接收去識別化摘要資料，不直接存取個資主檔。全系統以 Sentry 監控錯誤。

### 資料處理流程

```
病人（手機瀏覽器 PWA）
   → 註冊（Invite Code 驗證）→ patient-onboard Edge Function → patients 表
   → 每日症狀填報 → symptom_reports INSERT
                        ↓
              PostgreSQL Trigger: fn_check_alerts()
                        ↓
              符合閾值 → alerts 表 + audit_trail 表
                        ↓
              研究者 Dashboard 即時顯示

   → AI 衛教問答 → ai-chat Edge Function（JWT 雙層驗證）
                        ↓
              Claude API（去識別化 symptom summary）
                        ↓
              回應 + ai_request_logs 記錄（latency/tokens）

   → GitHub Actions Cron（每日 12:00 / 20:00）
                        ↓
              check-adherence Edge Function
                        ↓
              未回報者 → pending_notifications 表
```

### 技術棧

| 層級 | 技術選擇 |
|------|----------|
| 前端（PWA） | React 19 + Vite 6 + react-router-dom |
| 後端 / BaaS | Supabase（Auth + PostgreSQL + Edge Functions + RLS） |
| 資料庫 | PostgreSQL（Supabase hosted, RLS enabled） |
| AI 模組 | Anthropic Claude API（claude-3-5-haiku, via Edge Function proxy） |
| 錯誤監控 | Sentry（@sentry/react, dual-write with Supabase） |
| CI/CD | GitHub Actions（unit test + build + daily adherence cron） |
| 部署 | Vercel（前端）+ Supabase（Edge Functions + DB） |
| 通知 | Browser Notification API + Service Worker + Server-driven pending_notifications |

---

## 十、預期成果（Expected Impact）

- 提升術後照護品質
- 提升病人依從性
- 降低不必要醫療利用
- 建立可供後續研究之資料庫
- 發表學術論文

---

## 十一、未來發展（Future Directions）

- 擴展至其他手術類型
- 建立預測模型（complication prediction）
- 發展為數位健康平台（Digital Health Platform）
