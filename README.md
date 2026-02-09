# LOGI1 - Modern Logistics ERP System

LOGI1은 해운 물류 및 화물 관리를 위해 설계된 현대적인 웹 기반 ERP 시스템입니다.  
직관적인 UI와 강력한 기능, 실시간 협업 도구를 통해 업무 효율성을 극대화합니다.

<div align="center">
</div>

---

## � 문서 목차 (Table of Contents)

1. **사용자 매뉴얼 (User Manual)**
    - [1. 시작하기 (Getting Started)](#1-시작하기-getting-started)
    - [2. 화면 구성 (Interface Layout)](#2-화면-구성-interface-layout)
    - [3. 핵심 업무 모듈 (Core Modules)](#3-핵심-업무-모듈-core-modules)
    - [4. 협업 도구 (Collaboration)](#4-협업-도구-collaboration)
    - [5. 개인 생산성 도구 (Productivity)](#5-개인-생산성-도구-productivity)
    - [6. 설정 및 기타 (Settings)](#6-설정-및-기타-settings--misc)
2. **개발자 가이드 (Developer Guide)**
    - [기술 스택 (Tech Stack)](#-기술-스택-tech-stack)
    - [설치 및 실행 (Installation)](#-설치-및-실행-getting-started)
    - [폴더 구조 (Folder Structure)](#-폴더-구조-folder-structure)

---

# 📖 사용자 매뉴얼 (User Manual)

## 1. 시작하기 (Getting Started)

### 로그인 (Login)

- 시스템에 접속하려면 관리자로부터 부여받은 이메일과 비밀번호로 로그인하세요.
- **자동 로그인** 기능이 활성화되어 있어, 한 번 로그인하면 세션이 유지됩니다.

### 다국어 지원 (Language Support)

- LOGI1은 **한국어(KO)**, **English(EN)**, **中文(CN)** 을 지원합니다.
- 좌측 사이드바 하단의 `설정(Settings)` 메뉴에서 언제든지 언어를 변경할 수 있습니다.

## 2. 화면 구성 (Interface Layout)

LOGI1의 인터페이스는 효율적인 다중 작업을 위해 **탭(Tab) 기반**으로 설계되었습니다.

1. **좌측 사이드바 (Sidebar)**:
    - **메인 메뉴**: 대시보드, 선벌 목록, 화물 관리 등 주요 업무 화면으로 이동합니다.
    - **툴박스 (Toolbox)**: 메모, 게시판, HS 코드 검색 등 보조 도구를 팝업 윈도우로 엽니다.
    - **채팅**: 팀원들과 실시간으로 소통할 수 있는 채팅 버튼이 있습니다.
2. **상단 탭 바 (Top Tab Bar)**:
    - 업무 화면을 열 때마다 새로운 탭이 생성되어 멀티태스킹이 가능합니다.
3. **메인 작업 영역 (Working Area)**:
    - 선택된 탭의 내용이 표시되는 영역입니다.

## 3. 핵심 업무 모듈 (Core Modules)

### 3-1. 대시보드 (Dashboard)

로그인 후 처음 마주하는 화면으로, 업무에 필요한 핵심 정보를 한눈에 보여줍니다.

- **선박 일정 / 날씨**: 선박일정 관리 및 주요 항만 날씨를 제공합니다.

### 3-2. 선박 관리 (Vessel Management)

선박의 입출항 일정과 작업 상태를 관리합니다.

- **선박 리스트**: `입항 예정`, `작업 중`, `완료됨` 상태별로 선박을 카드 형태로 관리합니다.
- **상세 정보**: 환적(Transit), 타업체 화물 등의 물량 통계를 자동으로 집계합니다.

### 3-3. 화물 및 B/L 관리 (Cargo & B/L)

업로드된 모든 B/L(선하증권)과 관련 문서를 통합 관리합니다.

- **문서 현황판**: 필수 서류(B/L, C/I, P/L 등)의 업로드 여부를 직관적으로 보여줍니다.
- **진행 단계 체크**: A(수신) ~ E(선적) 단계별 업무 진행 상황을 체크리스트로 관리합니다.
- **스마트 검색**: B/L 번호, 선박명, 화주 등으로 문서를 빠르게 검색할 수 있습니다.

## 4. 협업 도구 (Collaboration)

### 4-1. 사내 채팅 (Team Chat)

- **실시간 소통**: 글로벌 채널 및 1:1 DM을 통해 팀원과 소통합니다.
- **기능**: 파일 전송, 이모지 반응, 답장 기능 등을 지원합니다.

### 4-2. 팀 게시판 (Team Board)

- **공지 및 공유**: 업무 관련 공지사항이나 자료를 게시판에 등록합니다.
- **리치 에디터**: 텍스트 서식, 표 등을 활용해 풍부한 내용을 작성할 수 있습니다.

## 5. 개인 생산성 도구 (Productivity)

### 5-1. 나의 메모 (My Memo)

- **빠른 기록**: 업무 중 아이디어를 노션(Notion) 스타일의 에디터로 기록합니다.
- **플로팅 윈도우**: 메모창을 띄워두고 다른 작업을 동시에 수행할 수 있습니다.

### 5-2. HS 코드 검색 (HS Code Search)

- **키워드 검색**: 복잡한 물품 코드를 '참치', '그물' 등의 키워드로 쉽게 찾습니다.
- **즉시 복사**: 검색 결과를 클릭하여 코드를 바로 복사할 수 있습니다.

## 6. 설정 및 기타 (Settings & Misc)

- **다크 모드**: 야간 업무를 위한 다크 모드를 지원합니다.
- **계정 관리**: 프로필 및 비밀번호 설정을 관리합니다.

---

# 💻 개발자 가이드 (Developer Guide)

## 🛠 기술 스택 (Tech Stack)

### Frontend

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State**: [Zustand](https://github.com/pmndrs/zustand)
- **UI**: `lucide-react`, `framer-motion`

### Backend & Infrastructure

- **BaaS**: [Firebase](https://firebase.google.com/) (Auth, Firestore, Storage)
- **AI**: Google Gemini API

## 💻 설치 및 실행 (Getting Started)

### 전제 조건 (Prerequisites)

- Node.js (v16+)
- Firebase 프로젝트 설정 (API Key)

### 설치 (Installation)

1. 저장소 클론

   ```bash
   git clone https://github.com/your-username/LOGI1.git
   cd LOGI1
   ```

2. 의존성 설치

   ```bash
   npm install
   ```

3. 환경 변수 설정 (`.env.local`)

   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   ...
   ```

4. 실행

   ```bash
   npm run dev
   ```

## 📂 폴더 구조 (Folder Structure)

```
src/
├── api/            # API 관련
├── components/     # UI 컴포넌트
├── features/       # 핵심 기능 (Business Logic)
│   ├── cargo/      # 화물 관리
│   ├── chat/       # 채팅
│   └── toolbox/    # 도구함
├── hooks/          # 커스텀 훅
├── services/       # Firebase 서비스
├── store/          # 전역 상태 (Zustand)
└── types.ts        # 타입 정의
```

---

**LOGI1** - Smart Logistics ERP System.
All rights reserved.
