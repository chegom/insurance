# 보험 분석 어시스턴트 (Insurance Analysis Assistant)

보험 에이전트를 위한 B2B SaaS 프로토타입으로, AI를 활용하여 고객의 현재 보험과 추천 상품을 비교 분석하는 웹 애플리케이션입니다.

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Generative AI SDK (Gemini 1.5 Pro)

## 주요 기능

1. **관리자 페이지** (`/admin`)
   - 보험 상품 정보 업로드
   - AI를 통한 자동 상품 요약 (주요 혜택, 갱신 유형, 보장 내용 등)

2. **에이전트 페이지** (`/`)
   - 고객 정보 입력 (연령, 성별, 직업)
   - 현재 보험 정보 입력
   - AI 비교 분석 및 영업 스크립트 생성

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Supabase 데이터베이스 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트를 생성합니다.
2. SQL Editor에서 `supabase/schema.sql` 파일의 내용을 실행하여 `products` 테이블을 생성합니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 프로젝트 구조

```
insurance/
├── app/
│   ├── admin/              # 관리자 페이지
│   ├── api/
│   │   ├── admin/          # 상품 추가 API
│   │   └── analyze/        # 분석 API
│   ├── globals.css         # 전역 스타일
│   ├── layout.tsx          # 루트 레이아웃
│   └── page.tsx            # 메인 페이지 (에이전트)
├── components/
│   └── ui/                 # Shadcn UI 컴포넌트
├── lib/
│   ├── gemini.ts           # Gemini AI 유틸리티
│   ├── supabase.ts         # Supabase 클라이언트
│   └── utils.ts            # 유틸리티 함수
├── supabase/
│   └── schema.sql          # 데이터베이스 스키마
└── types/
    └── database.ts          # 타입 정의
```

## 사용 방법

### 관리자 페이지

1. `/admin` 페이지로 이동합니다.
2. 상품명, 보험사, 상품 상세 내용을 입력합니다.
3. "상품 추가 및 AI 요약" 버튼을 클릭합니다.
4. AI가 자동으로 상품을 분석하고 요약하여 데이터베이스에 저장합니다.

### 에이전트 페이지

1. 메인 페이지(`/`)에서 고객 정보를 입력합니다.
2. 고객의 현재 보험 정보를 입력합니다.
3. "분석 및 비교하기" 버튼을 클릭합니다.
4. AI가 현재 보험과 추천 상품을 비교 분석하고 영업 스크립트를 생성합니다.

## API 엔드포인트

### POST `/api/admin/add-product`

관리자가 새 상품을 추가합니다.

**요청 본문:**
```json
{
  "name": "상품명",
  "company": "보험사명",
  "rawDetails": "상품 상세 내용"
}
```

### POST `/api/analyze`

고객 정보와 현재 보험을 분석합니다.

**요청 본문:**
```json
{
  "customerInfo": {
    "age": 35,
    "gender": "남성",
    "job": "회사원"
  },
  "currentInsurance": "현재 보험 상세 내용"
}
```

## 라이선스

이 프로젝트는 프로토타입입니다.

