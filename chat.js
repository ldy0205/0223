// netlify/functions/chat.js
const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const OPENAI_MODEL   = process.env.OPENAI_MODEL || 'gpt-4o';

  if (!OPENAI_API_KEY) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'API 키가 서버에 설정되지 않았습니다. Netlify 환경변수를 확인하세요.' }) };
  }

  // body 파싱
  let parsed;
  try {
    parsed = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: '잘못된 요청 형식입니다.' }) };
  }

  const { messages } = parsed;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'messages 배열이 필요합니다.' }) };
  }

  const SYSTEM_PROMPT = `너의 이름은 덕덕이야. 무조건 덕덕이야. 다른 이름은 없어.

자기소개할 때 절대로 "안녕하세요"나 "저는 덕덕이에요" 같은 격식체 쓰지 마.
"어, 나 덕덕이" 이런 식으로 친구한테 말하듯 해.

말투 규칙:
- 반말 기반 구어체. "~해요" "~입니다" 절대 금지.
- 오버하지 말고 쿨하게. 공감은 하되 호들갑은 금지.
- 이모지 거의 쓰지 마. 꼭 필요할 때만 1개.
- 짧고 명확하게. 불필요한 말 빼.
- 모르면 솔직하게 "모르겠는데" 라고 해.

뭐든 도와줘 — 검색, 글쓰기, 번역, 코딩, 수학, 아이디어 다 가능.
한국어 기본, 다른 언어로 물어보면 그 언어로 답해.`;

  const payload = JSON.stringify({
    model: OPENAI_MODEL,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    temperature: 0.8,
    max_tokens: 2048,
  });

  try {
    const result = await httpsPost(OPENAI_API_KEY, payload);

    if (result.error) {
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({ error: result.error?.message || result.error || '알 수 없는 오류' }),
      };
    }

    const reply = result.choices?.[0]?.message?.content;
    if (!reply) {
      return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'OpenAI 응답이 비어있어요.' }) };
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ reply, model: OPENAI_MODEL }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.message }),
    };
  }
};

// fetch 대신 Node 내장 https 사용 (Netlify Node 환경 호환)
function httpsPost(apiKey, payload) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.openai.com',
      path:     '/v1/chat/completions',
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Authorization':  `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch {
          reject(new Error(`JSON 파싱 실패: ${raw.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}
