// netlify/functions/chat.js
const https = require('https');

exports.handler = async (event) => {
  // 1. CORS Preflight 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }

  // 2. POST 메서드 검증
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const OPENAI_MODEL   = process.env.OPENAI_MODEL || 'gpt-4o';

  if (!OPENAI_API_KEY) {
    return { 
      statusCode: 500, 
      headers: corsHeaders(), 
      body: JSON.stringify({ error: 'API 키가 서버에 설정되지 않았습니다. Netlify 환경변수를 확인하세요.' }) 
    };
  }

  // 3. Body 파싱
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

  // 4. 프롬프트 설정
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

  // 5. OpenAI API 호출
  try {
    const result = await httpsPost(OPENAI_API_KEY, payload);

    // OpenAI 측에서 보낸 에러 (예: 키 오류, 잔액 부족 등)
    if (result.error) {
      console.error("OpenAI Error:", result.error);
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({ error: result.error.message || 'OpenAI API 오류' }),
      };
    }

    // [핵심 수정] 프론트엔드가 'data.choices...'를 바로 읽을 수 있도록 result 전체를 그대로 넘겨줍니다.
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(result),
    };

  } catch (err) {
    console.error("Server Error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.message }),
    };
  }
};

// fetch 대신 Node 내장 https 사용
function httpsPost(apiKey, payload) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.openai.com',
      path:     '/v1/chat/completions',
      method:   'POST',
      headers: {
        'Content-Type':   'application/json; charset=utf-8',
        'Authorization':  `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      res.setEncoding('utf8'); // [핵심 수정] 청크가 쪼개질 때 한글이 깨져서 JSON 파싱이 실패하는 것을 방지
      let raw = '';
      
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch {
          reject(new Error(`OpenAI 응답 파싱 실패. 응답 내용: ${raw.slice(0, 100)}...`));
        }
      });
    });

    req.on('error', (err) => reject(new Error(`네트워크 오류: ${err.message}`)));
    req.write(payload);
    req.end();
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}