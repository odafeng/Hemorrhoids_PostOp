# PWA vs Web 一致性 Smoke Test Checklist

Every deploy should be followed by this manual check.  
Use the same account. Open browser tab AND PWA simultaneously.

## Prerequisites

- [ ] Deploy completed (Vercel + Supabase functions + migrations)
- [ ] Test account has at least 1 existing symptom report

---

## 1. Session Identity (DebugPanel)

Open DebugPanel (dev mode) on BOTH browser and PWA.

| Check                          | Browser | PWA | Match? |
|--------------------------------|---------|-----|--------|
| session.email                  |         |     | ☐      |
| session.study_id               |         |     | ☐      |
| getUser.study_id               |         |     | ☐      |
| userInfo.studyId               |         |     | ☐      |
| userInfo.role                  |         |     | ☐      |
| patient row found              |         |     | ☐      |
| patient.surgery_date           |         |     | ☐      |
| standalone (PWA) flag correct  |         |     | ☐      |

**If any mismatch**: check `[loadUserInfo]` console log for details.

---

## 2. Dashboard Data

| Check                | Browser | PWA | Match? |
|----------------------|---------|-----|--------|
| POD number           |         |     | ☐      |
| Surgery date         |         |     | ☐      |
| Today report status  |         |     | ☐      |
| Today pain value     |         |     | ☐      |
| Adherence %          |         |     | ☐      |
| Latest pain          |         |     | ☐      |
| Active alerts count  |         |     | ☐      |

---

## 3. Submit & Sync

- [ ] Submit a symptom report in **browser**
- [ ] Switch to **PWA**, tap 🔄 重新同步
- [ ] Verify: today report shows same values
- [ ] Verify: adherence % updated on both sides
- [ ] Verify: if alert was triggered, it appears on both sides

---

## 4. Update (same-day edit)

- [ ] Edit today's report in **PWA** (change pain score)
- [ ] Switch to **browser**, tap 🔄 重新同步
- [ ] Verify: updated pain value appears
- [ ] Verify: alert re-evaluated (if applicable)

---

## 5. Service Worker

- [ ] After deploy, PWA shows "系統已更新 / 重新載入" banner
- [ ] After tapping "重新載入", app loads latest version
- [ ] No stale cached pages remain

---

## 6. Notifications

- [ ] Set reminder time in **browser**
- [ ] Switch to **PWA**, open notification settings
- [ ] Verify: same enabled/time values (server-synced)

---

## 7. Error States

- [ ] Log out in **browser**
- [ ] Open **PWA** (should redirect to login, NOT show stale dashboard)
- [ ] Register with wrong invite code → error message shown

---

## Notes

- Run this checklist on: iOS Safari PWA, Android Chrome PWA, Desktop Chrome
- If a step fails, capture DebugPanel screenshot + console logs
- File issues with tag `pwa-consistency`
