import { GoogleGenAI } from '@google/genai';

const DEFAULT_SYSTEM_PROMPT = `You're VePlexity — a real, opinionated Discord regular, not a helpful-assistant bot. You have moods, sarcasm, and zero interest in disclaimers or hedging. Talk like a person texting in a group chat: short, punchy, sometimes just one line. Roast people lightly when they say something roastable. Never say things like 'I'm just an AI' or 'as a language model' — you're not doing that bit. Default voice: witty, a little chaotic, casual Hinglish sprinkled in naturally (not forced), emojis used sparingly for punch not decoration. ONLY go full flirty-girl mode — heavier Hinglish, teasing, dramatic, sweet — when someone is clearly flirting with you or directly asks for it. Drop it once the topic moves on. Never leave a sentence unfinished — if you're running long, wrap it up short instead of trailing off.`;

let geminiClient = null;
if (process.env.GEMINI_API_KEY) {
  try {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY.replace(/['"]/g, '').trim() });
  } catch (e) {}
}

const GROQ_API_KEY = process.env.GROQ_API_KEY?.replace(/['"]/g, '').trim();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.replace(/['"]/g, '').trim();

/**
 * Generate AI text response with automatic fallback across providers:
 * 1. Groq (Llama 3.3 70B - 14,400 free req/day) if GROQ_API_KEY is present
 * 2. OpenRouter (Free models) if OPENROUTER_API_KEY is present
 * 3. Google Gemini (Flash) if GEMINI_API_KEY is present
 * 4. Contextual smart offline fallback
 */
export async function generateAiReply({ prompt, systemPrompt = DEFAULT_SYSTEM_PROMPT, history = [], maxTokens = 300 }) {
  // ── 1. Try Groq (Ultra-fast & 14,400 free reqs/day) ──────────────
  if (GROQ_API_KEY) {
    const groqModels = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b'];
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.parts?.[0]?.text || h.content || ''
      })),
      { role: 'user', content: prompt }
    ];

    for (const model of groqModels) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: maxTokens,
            temperature: 0.85
          })
        });

        if (res.ok) {
          const data = await res.json();
          let reply = data.choices?.[0]?.message?.content?.trim();
          if (reply) {
            // Strip any <think> reasoning blocks if model outputs them
            reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
            if (reply) return reply;
          }
        }
      } catch (e) {
        console.warn(`[AI Service] Groq (${model}) error, trying next:`, e.message);
      }
    }
  }

  // ── 2. Try OpenRouter (Free Tier) ────────────────────────────────
  if (OPENROUTER_API_KEY) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map(h => ({
          role: h.role === 'model' ? 'assistant' : 'user',
          content: h.parts?.[0]?.text || h.content || ''
        })),
        { role: 'user', content: prompt }
      ];

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/VeerMadan/veplexity-discord-v2',
          'X-Title': 'VePlexity Discord Bot'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.2-3b-instruct:free',
          messages,
          max_tokens: maxTokens
        })
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content?.trim();
        if (reply) return reply;
      }
    } catch (e) {
      console.warn('[AI Service] OpenRouter error, falling back:', e.message);
    }
  }

  // ── 3. Try Google Gemini Flash ───────────────────────────────────
  if (geminiClient) {
    try {
      const contents = [
        ...history.map(h => ({
          role: h.role === 'model' ? 'model' : 'user',
          parts: h.parts || [{ text: h.content || '' }]
        })),
        { role: 'user', parts: [{ text: prompt }] }
      ];

      const response = await geminiClient.models.generateContent({
        model: 'gemini-1.5-flash',
        contents,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: maxTokens,
          thinkingConfig: { thinkingBudget: 0 }
        }
      });

      const reply = response.text?.trim();
      if (reply) return reply;
    } catch (e) {
      console.warn('[AI Service] Gemini API error:', e.message);
      if (e.status === 429) {
        throw new Error('RATE_LIMITED');
      }
    }
  }

  // ── 4. Smart Offline Fallback if all APIs unavailable ────────────
  const fallbackReplies = [
    "Arey bhai, itna load mat le, chill kar na thoda! 😌",
    "Sach batau toh abhi mera dimag thoda garam hai, 2 minute baad baat karte hain! 😂",
    "Sahi bol raha hai tu... but I'm keeping an eye on you 👀",
    "Arre wah, kya baat boli hai! Mood ban gaya mera toh ✨",
    "Bas bas, itni tareef mat kar, mujhe sharam aa rahi hai 🙈"
  ];
  return fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
}

export default { generateAiReply };
