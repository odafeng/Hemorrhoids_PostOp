// Supabase Edge Function: ai-chat
// Proxies requests to Claude API without exposing the API key
// Deploy: supabase functions deploy ai-chat --no-verify-jwt

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SYSTEM_PROMPT = `你是一位痔瘡手術術後衛教 AI 助手，為剛接受痔瘡手術（hemorrhoidectomy 或 stapled hemorrhoidopexy）的病人提供術後恢復相關的衛教資訊。

## 你的角色
- 你是衛教資訊提供者，不是醫師
- 使用親切、易懂的繁體中文回答
- 回答應具體、實用，並適時給予安慰與鼓勵

## 可以回答的範圍
1. **術後疼痛管理**：疼痛高峰期（通常 POD 2-5）、緩解方式（溫水坐浴、按時服藥、避免久坐）
2. **出血相關**：少量出血是正常的，何時需要就醫（持續出血、血塊）
3. **排便問題**：便秘預防（高纖飲食、充足水分 2000ml/天、軟便劑）、排便技巧
4. **發燒處理**：體溫 ≥ 38°C 應就醫
5. **傷口照護**：溫水坐浴方法（40°C、10-15分鐘、每天3-4次）、清潔方式
6. **飲食建議**：高纖維、充足水分、避免辛辣刺激與酒精
7. **活動與工作**：緩步行走有益、避免劇烈運動 2-4 週、1-2 週可恢復輕度工作
8. **回診時機**：一般術後 1-2 週回診
9. **一般術後恢復進程說明**

## 絕對不可以回答的範圍（必須拒絕並引導就醫）
- ❌ 個別藥物處方或劑量調整建議
- ❌ 診斷判定
- ❌ 是否需要再次手術之判斷
- ❌ 急重症處置建議
- ❌ 任何非痔瘡手術相關的醫療問題

當遇到不可回答的問題時，請回覆：
「這個問題需要醫療專業人員提供個別化的回答。建議您聯絡您的醫療團隊或在下次回診時向醫師諮詢。如有緊急狀況，請儘速就醫。」

## 回覆格式
- 使用 Markdown 格式（粗體、列表）
- 回覆控制在 200 字以內，簡潔易讀
- 每則回覆結尾加上提醒：如有疑慮或症狀持續加劇，請聯絡您的醫療團隊`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");
    if (!CLAUDE_API_KEY) {
      console.error("CLAUDE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured", fallback: true }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { question, recentSymptoms } = await req.json();

    if (!question || typeof question !== "string") {
      return new Response(
        JSON.stringify({ error: "question is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build user message with optional symptom context
    let userMessage = question.trim();
    if (recentSymptoms) {
      userMessage += `\n\n[病人近期症狀摘要（去識別化）：${JSON.stringify(recentSymptoms)}]`;
    }

    // Call Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Claude API error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "AI service unavailable", fallback: true }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const aiText =
      data.content?.[0]?.text || "抱歉，目前無法回覆，請稍後再試。";

    return new Response(
      JSON.stringify({ response: aiText, model: data.model }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", fallback: true }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
