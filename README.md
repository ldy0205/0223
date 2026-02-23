# 🌸 Haru Chatbot

따뜻하고 친절한 나만의 AI 친구 — OpenAI API 기반 챗봇

## 📁 폴더 구조

```
haru-chatbot/
├── index.html                  ← 챗봇 UI
├── netlify.toml                ← Netlify 설정
├── .env                        ← API 키 (로컬 전용, gitignore됨)
├── .gitignore                  ← .env를 GitHub에서 제외
└── netlify/
    └── functions/
        └── chat.js             ← 서버리스 함수 (API 키 여기서만 사용)
```

## 🔒 보안 구조

```
브라우저 → /.netlify/functions/chat → OpenAI API
              ↑
         API 키는 여기(서버)에서만 사용
         브라우저에는 절대 노출되지 않음
```

## 🚀 배포 방법

### 1단계 — 로컬 .env 설정

`.env` 파일을 열고 본인의 키를 입력하세요:

```
OPENAI_API_KEY=sk-여기에_실제_키_입력
OPENAI_MODEL=gpt-4o
```

> ⚠️ `.env`는 `.gitignore`에 포함되어 있어 GitHub에 올라가지 않습니다.

---

### 2단계 — GitHub에 push

```bash
git init
git add .
git commit -m "🌸 Haru chatbot init"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/haru-chatbot.git
git push -u origin main
```

---

### 3단계 — Netlify 배포 + 환경변수 설정

1. [netlify.com](https://netlify.com) 접속 → **Add new site → Import from Git**
2. GitHub 저장소 선택
3. 빌드 설정은 그대로 두고 **Deploy** 클릭

#### ✅ Netlify 환경변수 등록 (중요!)

Netlify 대시보드에서:

```
Site configuration → Environment variables → Add a variable
```

| Key | Value |
|-----|-------|
| `OPENAI_API_KEY` | `sk-...실제키...` |
| `OPENAI_MODEL`   | `gpt-4o` |

> 환경변수 저장 후 **Trigger deploy** 로 재배포하면 완료!

---

## 🛠️ 모델 변경

`.env`의 `OPENAI_MODEL` 값을 바꾸세요:

| 모델 | 특징 |
|------|------|
| `gpt-4o` | 가장 스마트 (추천) |
| `gpt-4o-mini` | 빠르고 경제적 |
| `gpt-4-turbo` | GPT-4 최신 터보 |
| `gpt-3.5-turbo` | 가장 저렴 |

---

## 💻 로컬 테스트

Netlify CLI를 사용하면 로컬에서도 Functions를 테스트할 수 있어요:

```bash
npm install -g netlify-cli
netlify dev
```

브라우저에서 `http://localhost:8888` 접속
