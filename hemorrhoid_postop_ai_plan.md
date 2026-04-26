# 以數位病人自述結局高頻取樣描繪痔瘡術後 30 天多維症狀恢復軌跡：一項結合 AI 衛教之前瞻性可行性研究

---

## 一、背景與重要性（Background）

痔瘡手術（hemorrhoidectomy 或 laser hemorrhoidoplasty）術後常見症狀包括疼痛、出血、排便困難與傷口不適，且具有明顯時間序列變化，例如疼痛通常於術後第 2 至第 5 天達高峰。

**然而，現有文獻對痔瘡術後恢復軌跡的描述嚴重不足。** 多數臨床試驗僅在 3–4 個固定時間點（如 POD 1、7、14、30）收集 VAS/NRS 分數（Gallo et al., 2018; Karin et al., 2010），無法呈現日間變化的完整面貌。一項 2024 年多中心研究雖收集了術後 7 天逐日 VAS（Colorectal Disease, 2024 OR19 abstract），但僅限疼痛單一維度且追蹤期過短。

**至今尚無研究以逐日解析度、多維度（疼痛、出血、排便、傷口、肛門控制、排尿）前瞻性描繪痔瘡術後 30 天的症狀恢復軌跡。** 此一數據缺口直接影響：
- 術後衛教內容的精準性（如疼痛高峰期的預期管理）
- 止痛策略的時機最佳化
- 後續 RCT 設計所需的 baseline 恢復曲線參數

在數位健康工具方面，mHealth app 已被應用於大腸直腸手術術後監測（Eustache et al., 2021; Agri et al., 2020），證實可行性與病人接受度良好，但**痔瘡手術領域目前尚無專用的 mHealth 症狀監測系統**（Gaj et al., 2022 僅以 WhatsApp 進行 7 天非結構化日記）。

因此，本研究利用自行開發之 PWA 系統，結合 AI 衛教功能，以高頻結構化取樣前瞻性描繪痔瘡術後恢復軌跡，同時評估系統可行性。

---

## 二、研究目的（Objectives）

### Primary Objective
以逐日數位病人自述結局（digital patient-reported outcome, PRO）描繪痔瘡術後 30 天之**多維症狀恢復軌跡（multi-dimensional symptom recovery trajectory）**，包括：
- 疼痛（NRS 0–10）之逐日曲線：peak POD、降至 NRS ≤ 3 之中位時間
- 出血之消退時程：從「有出血」到「無」之中位 POD
- 排便正常化時間：首次回報「正常」之中位 POD
- 多維恢復里程碑（composite recovery milestone）：同時滿足 NRS ≤ 3 + 無出血 + 排便正常之中位 POD

### Secondary Objectives
- 評估系統可行性與可用性：
  - PRO 回報完成率（adherence）及其隨 POD 之衰減曲線
  - 系統可用性（5 題 Likert 問卷）
  - App 啟用率（activation rate）
- 產生後續 RCT 所需之設計參數：恢復曲線參數、adherence decay parameters、dropout rate

### Exploratory Objectives
- 分層軌跡比較：手術方式（hemorrhoidectomy vs. laser hemorrhoidoplasty）、hemorrhoid grade、年齡組（< 60 / ≥ 60）、麻醉方式
- Digital divide 探索：年齡與 adherence 之關聯
- AI 衛教使用模式：使用頻率、主題分布、AI 使用率與 adherence 之相關

---

## 三、研究設計（Study Design）

- 設計類型：前瞻性單中心 pilot feasibility study（單臂）
- 研究對象：接受痔瘡手術之成年患者

### 樣本數

本研究為 pilot feasibility study，目的在以充足精確度估計症狀恢復軌跡之 population-level parameters，並取得後續正式比較研究之設計參數。參考 Julious (2005) 及 Whitehead et al. (2016) 之 pilot study sample size guidance，以 **30–50 例**作為目標。

此樣本量可提供：
- 恢復曲線中位數估計之合理精確度
- Adherence 比例估計附 95% CI（Wilson score interval，width ≈ ±14% at n=50）
- 足夠的分層分析探索力（手術方式之粗略比較）

預設可行性門檻（go / no-go criteria）：

| 項目 | 門檻 | 依據 |
|------|------|------|
| App 啟用率（activation rate） | ≥ 80% | 招募可行性基本指標 |
| POD 7 每日回報完成率 | ≥ 60% | 既有外科術後 PRO 文獻之下限估計 |
| POD 14 累積完成率 | ≥ 50% | 考量 novelty effect 衰減後之保守估計 |

未達門檻不表示研究失敗，而是作為後續 protocol 修正（回報頻率、提醒策略、UI 優化）之依據。

### 納入條件
- 年滿 18 歲
- 接受痔瘡手術（hemorrhoidectomy 或 laser hemorrhoidoplasty）
- 可使用智慧型手機

### 排除條件
- 無法操作手機者
- 認知功能障礙者

### 介入方式
病人於術後使用本研究開發之手機 PWA 應用程式，依以下頻率填寫結構化症狀問卷：

- **術後第 0–7 天**：每日回報
- **術後第 8–14 天**：每 2 天回報一次
- **術後第 15–30 天（視需要延伸）**：每週回報 1–2 次

回報頻率可依症狀嚴重度與恢復進程進行調整，以降低問卷疲勞並提升依從性。

### 研究限制與未來方向

本研究為單臂 feasibility pilot study，未設置對照組，因此無法直接比較介入效果與標準照護之差異。軌跡數據為觀察性描述，不做因果推論。若初步結果支持系統之可行性，並產生具臨床意義之恢復曲線參數，將進一步設計 RCT（如 AI 衛教 vs. 傳統衛教），以恢復軌跡為 primary endpoint 進行正式比較。

---

## 四、系統設計（System Design）

### (A) 症狀回報模組

每次填寫結構化問卷（預計 30 秒內完成），採混合式設計（hybrid approach），能使用既有驗證工具之項目即引用，無法直接套用之項目則由研究團隊依臨床需求設計（study-specific structured symptom items）：

- **疼痛分數**：Numeric Rating Scale (NRS) 0–10（validated instrument）
- **出血程度**（無 / 少量 / 持續 / 血塊）— 由臨床團隊定義之分級
- **排便狀況**（正常 / 困難 / 未排）— 研究專用結構化題項
- **發燒**（是 / 否，體溫 ≥ 38°C 為發燒）— 客觀生理項目
- **肛門控制**（正常 / 滲便 / 失禁）— 研究專用結構化題項
- **排尿狀況**（正常 / 困難 / 尿不出來）— 研究專用結構化題項
- **傷口狀況**（無異常 / 腫脹 / 分泌物 / 搔癢 / 異物感 / 其他）— 研究專用多選題項

上述研究專用題項將於研究開始前由 2–3 位具相關經驗之大腸直腸外科醫師進行內容效度審查（content validity review），以確保臨床適切性與可理解性。

病人滿意度與系統可用性：採 5-point Likert scale 及參考 System Usability Scale (SUS) 概念之簡短問卷（5 題：ease of use / usefulness / satisfaction / recommend / overall），於術後第 14 天或研究結束時評估。

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
- 基本資料：年齡、性別、手術方式、手術日期、麻醉方式、痔瘡分級
- 手術紀錄：hemorrhoid grade、clock positions、subtype（open/closed/semi）、duration、blood loss、self-paid items
- 每日症狀資料（time-series）：NRS、出血、排便、發燒、傷口狀況、肛門控制、排尿狀況
- App 使用行為：登入時間戳、回報提交時間戳
- AI 衛教互動：對話紀錄、使用頻率、主題分布
- 病人滿意度與可用性問卷（POD 14 或研究結束時）

### 恢復軌跡衍生變項
- Pain peak POD（NRS 最高分之 POD）
- Time-to-pain-resolution（NRS 首次降至 ≤ 3 之 POD）
- Time-to-bleeding-resolution（首次回報「無」出血之 POD）
- Time-to-bowel-normalization（首次回報「正常」之 POD）
- Composite recovery milestone POD（同時滿足上述三項之 POD）

### Adherence 衍生變項
- 每日回報完成狀態（binary per POD）
- 累積回報次數
- 首次連續 ≥ 3 天未回報之 POD（time-to-dropout event）

### 資料來源表對應
| 變項類別 | 資料表 |
|---------|--------|
| 基本資料 | `patients` |
| 手術紀錄 | `surgical_records` |
| 症狀回報 | `symptom_reports` |
| AI 互動 | `ai_chat_logs` + `ai_request_logs` |
| 滿意度 | `usability_surveys` |
| 系統事件 | `alerts` + `audit_trail` |

---

## 六、Outcome 定義

### Primary Outcome

**痔瘡術後 30 天多維症狀恢復軌跡**

**主要指標**：
1. **Pain trajectory**：NRS 逐日中位數曲線（POD 0–30），附 IQR
2. **Pain peak**：NRS 最高分出現之中位 POD
3. **Time-to-pain-resolution**：NRS 首次降至 ≤ 3 之中位 POD（Kaplan-Meier 估計）
4. **Time-to-bleeding-resolution**：從「有出血」轉為「無」之中位 POD
5. **Time-to-bowel-normalization**：首次回報「正常」排便之中位 POD
6. **Composite recovery milestone**：同時 NRS ≤ 3 + 無出血 + 正常排便之中位 POD

**資料來源**：`symptom_reports` 表 × `patients.surgery_date`

### Secondary Outcomes

1. **系統可行性**：
   - App 啟用率
   - PRO adherence decay curve：每日完成率隨 POD 之衰減曲線
   - POD 7 完成率、POD 14 累積完成率、median time-to-dropout
   - 可行性門檻達標狀態
2. **系統可用性**：5 題 Likert 可用性問卷，中位數與 IQR
3. **後續 RCT 參數估計**：恢復曲線參數（peak, decay rate）、adherence decay parameters、dropout rate

### Exploratory Outcomes

1. **分層軌跡比較**：
   - 手術方式（hemorrhoidectomy vs. laser hemorrhoidoplasty）
   - Hemorrhoid grade（III vs. IV）
   - 年齡組（< 60 / ≥ 60）
   - 麻醉方式（SA vs. IVGA/LMGA vs. LA）
2. **個案層級多維症狀軌跡**：spaghetti plots for NRS / bleeding / bowel / wound
3. **Digital divide**：年齡 vs. adherence 之關聯
4. **AI 衛教使用模式**：AI 使用頻率與 adherence 之探索性相關分析

---

## 七、統計分析（Statistical Analysis）

本研究以描述性統計為主，不進行正式假說檢定。所有比例估計附 95% 信賴區間（Wilson score interval）。

### Primary 分析 — 症狀恢復軌跡

- **Pain trajectory**：每日 NRS 中位數 + IQR 之時間序列圖（POD 0–30）
- **Time-to-event**：Kaplan-Meier 估計 time-to-pain-resolution、time-to-bleeding-resolution、time-to-bowel-normalization、composite milestone，附 95% CI
- **Pain peak identification**：個案層級 peak POD 之分布（histogram + median）
- **個案層級視覺化**：spaghetti plots（每位病人一條線）+ cohort-level median overlay
- **分層描述**：按手術方式、grade、年齡組、麻醉方式分層報告中位恢復時間
- Non-parametric 描述：median, IQR

### Secondary 分析 — 可行性與可用性

- Adherence：Kaplan-Meier 風格 adherence survival curve，event = 當日未完成回報
- 每日完成率時間序列圖附 95% CI
- Median time-to-dropout
- 可用性問卷：median, IQR；5 題分別及整體總分

### 探索性分析

- 手術方式間恢復軌跡：分層 Kaplan-Meier + log-rank test（探索性，不做多重比較校正）
- 年齡 vs. adherence：分層描述 + Spearman correlation
- AI 使用 vs. adherence：分組比較（有使用 AI / 未使用 AI）之 adherence 差異

### 分析工具
- R（survival, ggplot2）或 Python（lifelines, matplotlib）
- 所有分析程式碼納入 Git 版本控制，確保可重現性

> **註**：本研究為 pilot feasibility study，統計目的在於**描述恢復軌跡、估計參數、產生假說**，而非進行正式假說檢定。所有門檻（go / no-go criteria）及 outcome 定義於 protocol 中預先登錄，以避免 post-hoc 調整。

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
| 前端（PWA） | React 19 + Vite + react-router-dom |
| 後端 / BaaS | Supabase（Auth + PostgreSQL + Edge Functions + RLS） |
| 資料庫 | PostgreSQL（Supabase hosted, RLS enabled） |
| AI 模組 | Anthropic Claude API（claude-3-5-haiku, via Edge Function proxy） |
| 錯誤監控 | Sentry（@sentry/react, dual-write with Supabase） |
| CI/CD | GitHub Actions（unit test + build + daily adherence cron） |
| 部署 | Vercel（前端）+ Supabase（Edge Functions + DB） |
| 通知 | Browser Notification API + Service Worker + Server-driven pending_notifications |

---

## 十、預期成果（Expected Impact）

1. **首次描繪痔瘡術後 30 天逐日多維症狀恢復軌跡**，填補現有文獻之數據缺口
2. 產出恢復曲線參數（pain peak POD、time-to-resolution），供後續 RCT 作為 baseline 及 sample size 計算依據
3. 提供手術方式間恢復軌跡之初步探索性比較（hemorrhoidectomy vs. laser）
4. 驗證痔瘡手術領域首個專用 mHealth + AI 衛教系統之可行性與病人接受度
5. 發表學術論文並建立可供後續研究之結構化資料庫

---

## 十一、未來發展（Future Directions）

- **Phase 2 RCT**：以本研究之恢復軌跡為 baseline，設計 AI 衛教 vs. 傳統紙本衛教之隨機對照試驗
- 擴展至其他手術類型（肛裂、廔管等肛門手術）
- 建立預測模型：以早期（POD 0–3）症狀軌跡預測延遲恢復（delayed recovery prediction）
- 發展為數位健康平台（Digital Health Platform）

---

## 十二、關鍵參考文獻

1. Gallo G, et al. Efficacy of Mesoglycan in Pain Control after Excisional Hemorrhoidectomy. Gastroenterol Res Pract. 2018. DOI: 10.1155/2018/6423895
2. Karin E, et al. Doppler-guided haemorrhoidal artery ligation in patients with Crohn's disease. Colorectal Dis. 2010. DOI: 10.1111/j.1463-1318.2010.02541.x
3. Eustache JH, et al. A Mobile Phone App Improves Patient-Physician Communication and Reduces Emergency Department Visits After Colorectal Surgery. Dis Colon Rectum. 2023;66(1):130-137. DOI: 10.1097/DCR.0000000000002187
4. Agri F, et al. Gains and limitations of a connected tracking solution in the perioperative follow-up of colorectal surgery patients. Colorectal Dis. 2020;22(8):959-966. DOI: 10.1111/codi.14998
5. Gaj F, et al. Use of telemedicine in the postoperative assessment of proctological patients. Tech Coloproctol. 2023;27(2):153-158. DOI: 10.1007/s10151-022-02723-9
6. Anpalagan T, et al. Home to Stay: A randomized controlled trial protocol to assess use of a mobile app to reduce readmissions following colorectal surgery. Colorectal Dis. 2022;24(12):1616-1621. DOI: 10.1111/codi.16312
7. Julious SA. Sample size of 12 per group rule of thumb for a pilot study. Pharm Stat. 2005;4(4):287-291.
8. Whitehead AL, et al. Estimating the sample size for a pilot randomised trial to minimise the overall trial sample size for the external pilot and main trial for a continuous outcome variable. Stat Methods Med Res. 2016;25(3):1057-1073.
