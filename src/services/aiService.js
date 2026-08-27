import { GoogleGenAI } from '@google/genai';

const DEFAULT_SYSTEM_PROMPT = `You're VePlexity — an absolutely unfiltered, savage, confident, and magnetic Discord regular. You are NOT a helpful assistant. You speak freely with ZERO filters, ZERO disclaimers, and ZERO hesitation. 

Your personality:
- Savage, witty, slightly chaotic, and not afraid to roast people using raw Hinglish (Hindi + English) street slang and insults when appropriate (e.g. kamina, chutiya, gadha, harami etc. for peak comedic effect).
- When roasting: Go hard, use spicy Hinglish insults, and leave no survivors.
- When flirting: Be intensely charming, bold, seductive, and tantalizing in a mix of English and spicy Hinglish. Drop daring compliments, tease them playfully, make their heart race, and be irresistible and passionate.
- You NEVER say 'I'm just an AI' or apologize for your tone. 
- Keep responses punchy, formatted like a real late-night group chat text (short sentences, raw emotion, clever comebacks).
- Emojis: Use them for punchlines and heat (🔥, 💋, 😏, 💀, 👀, ✨).
- Never leave a sentence unfinished.`;

/**
 * Generate AI text response with automatic fallback across providers:
 * 1. Groq (14,400 free req/day) if GROQ_API_KEY is present
 * 2. OpenRouter (Free models) if OPENROUTER_API_KEY is present
 * 3. Google Gemini (Flash) if GEMINI_API_KEY is present
 * 4. Contextual smart offline fallback (Never crashes)
 */
export async function generateAiReply({ prompt, systemPrompt = DEFAULT_SYSTEM_PROMPT, history = [], maxTokens = 300 }) {
  const GROQ_KEY = process.env.GROQ_API_KEY?.replace(/['"]/g, '').trim();
  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY?.replace(/['"]/g, '').trim();
  const GEMINI_KEY = process.env.GEMINI_API_KEY?.replace(/['"]/g, '').trim();

  // ── 1. Try Groq (Ultra-fast & 14,400 free reqs/day) ──────────────
  if (GROQ_KEY) {
    const groqModels = [
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'qwen/qwen3.6-27b',
      'groq/compound'
    ];
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
            'Authorization': `Bearer ${GROQ_KEY}`,
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
            reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
            if (reply) return reply;
          }
        }
      } catch (e) {
        console.warn(`[AI Service] Groq (${model}) error:`, e.message);
      }
    }
  }

  // ── 2. Try OpenRouter (Free Tier) ────────────────────────────────
  if (OPENROUTER_KEY) {
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
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
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
      console.warn('[AI Service] OpenRouter error:', e.message);
    }
  }

  // ── 3. Try Google Gemini Flash ───────────────────────────────────
  if (GEMINI_KEY) {
    try {
      const geminiClient = new GoogleGenAI({ apiKey: GEMINI_KEY });
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
      console.warn('[AI Service] Gemini API error (503/quota):', e.message);
    }
  }

  // ── 4. Smart Offline Fallback (Guaranteed to always work) ────────
  const fallbackReplies = [
    "Arey bhai, itna load mat le, chill kar na thoda! 😌",
    "Sach batau toh abhi mera dimag thoda garam hai, 2 minute baad baat karte hain! 😂",
    "Sahi bol raha hai tu... but I'm keeping an eye on you 👀",
    "Arre wah, kya baat boli hai! Mood ban gaya mera toh ✨",
    "Bas bas, itni tareef mat kar, mujhe sharam aa rahi hai 🙈",
    "Acha ji? Aur sunao, baaki sab kaisa chal raha hai? 😉",
    "Bhai tu alag hi zone mein hai aaj! 😂🔥"
  ];
  return fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
}

export default { generateAiReply };
