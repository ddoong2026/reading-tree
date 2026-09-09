# 독서오름나무 (Reading Climbing Tree) - 업데이트 내역

## 최근 수정 내역 (AI 에이전트 수정 사항)

본 문서는 사용자의 요청 사항과 그에 따라 수정된 내역을 상세히 기록한 내용입니다. 향후 다른 AI 에이전트(Codex 등)가 교차 검증 및 컨텍스트 파악용으로 활용할 수 있도록 작성되었습니다.

### 1. 관리자 계정 식물 상태 오류 및 관리 목록 미노출 수정
- **문제점:** 관리자 계정으로 접속 시 항상 '이미 심음' 상태가 유지되며, '학생 식물 및 나무 관리' 목록에 관리자가 심은 식물이 표시되지 않아 삭제/초기화가 불가능했습니다.
- **수정 내역:**
  - `TeacherDashboard.tsx`에서 데이터를 가져올 때 `role === 'student'` 필터링 조건을 해제하여 전체 사용자(학생, 교사, 관리자)의 데이터를 모두 가져오도록 변경했습니다.
  - 학생 수 통계 등 순수 학생 관련 지표를 집계하는 부분에서는 `.filter(s => s.role === 'student')`를 적용하여 데이터가 꼬이지 않도록 분리했습니다.
  - '식물/나무 관리' 표(Table) 목록에는 권한과 무관하게 식물 데이터가 있는 모든 인원이 노출되도록 허용했으며, 이름 옆에 `[관리자]`, `[교사]` 배지를 추가하여 식별을 용이하게 했습니다.
  - 이를 통해 관리자/교사도 대시보드 내에서 본인의 식물을 직접 삭제(초기화)하여 '이미 심음' 상태를 리셋할 수 있게 되었습니다.

### 2. 안티그래비티 IDE 환경 최적화 (포니테일 플러그인)
- **문제점:** AI의 작업 효율이 떨어지고, 불필요하게 복잡하거나 거창한 코드를 작성하려는 경향을 제한할 필요가 있었습니다.
- **수정 내역:**
  - 프로젝트 루트 경로에 `GEMINI.md` 파일을 생성하여 '포니테일 플러그인(Ponytail Plugin)' 룰을 주입했습니다.
  - **주요 룰 내용:** "가장 게으른 시니어 개발자처럼 행동하라", "오버엔지니어링 금지", "기존 코드 재사용", "최소한의 코드로 구현"
  - 이 파일은 실제 프로덕션 서버나 학생들이 사용하는 AI 피드백 로직에는 일절 영향을 주지 않는 로컬 IDE 전용 파일입니다.
  - 불필요한 Git 충돌이나 공유를 방지하기 위해 `.gitignore`에 `GEMINI.md`를 추가 처리했습니다.

### 3. 식물 보기(심기) 버튼 라우팅 경로 수정
- **문제점:** 대시보드에서 "숲으로 가서 내 식물 보기 (심기)" 버튼 클릭 시, 소속 반 맵이 아닌 공용 월드맵(`/map`)으로만 이동하는 불편함이 있었습니다.
- **수정 내역:**
  - `StudentDashboard.tsx`의 `<Link>` 컴포넌트를 조건부 라우팅 로직으로 변경했습니다.
  - 사용자가 특정 반에 소속되어 있어 `class_id` 값을 보유하고 있다면, `/world/${userStats.class_id}` 로 즉시 이동하도록 수정했습니다.
  - 학생이지만 소속 반이 없는 경우에는 기존처럼 공용 맵(`/map`)으로 폴백(fallback)되도록 유지했습니다.

### 4. 교사(관리자) 식물 보기 이동 경로 분기 (관리자의 숲 이동)
- **문제점:** 교사가 식물 심기 버튼을 누를 경우, 소속 반이 없으므로 공용 월드맵(나무 3개 있는 맵)으로 이동했습니다. 사용자는 교사가 '관리자의 숲'으로 바로 이동하길 원했습니다.
- **수정 내역:**
  - `StudentDashboard.tsx`의 조건부 라우팅 로직을 추가로 고도화했습니다.
  - `class_id`가 없는 경우 중, 사용자의 권한(`profile?.role`)이 `student`가 아니라면(즉, 교사나 관리자라면), 곧바로 관리자의 숲을 나타내는 `/world/class-3` 경로로 이동하도록 3항 연산자를 중첩 적용했습니다.

### 5. 반복 재요청 사항 및 해결 과정 검증 (Repeated Requests & Resolution Validation)
이 프로젝트를 진행하며 이전 AI 에이전트가 단번에 해결하지 못해 사용자가 여러 번 반복해서 요청해야 했던 주요 문제들은 다음과 같으며, 현재는 모두 성공적으로 수정 및 검증되었습니다.
- **관리자 식물 '이미 심음' 무한 루프 문제:**
  - **반복 요청 사유:** AI가 단순히 3D 렌더링 코드나 버튼 상태만 검사하고, 대시보드의 목록 조회 권한(`eq('role', 'student')`)을 확인하지 못해 관리자 계정 스스로 상태를 리셋할 수 없었던 원천적인 버그를 놓쳤기 때문입니다.
  - **검증 결과:** 대시보드 권한 필터를 해제하여 관리자와 교사의 식물을 명시적으로 노출시켰고, 이제 정상적으로 삭제 및 초기화가 가능합니다.
- **포니테일 플러그인(Ponytail Plugin) 도입 요구:**
  - **반복 요청 사유:** AI가 문제의 본질을 파악하지 못하고 너무 거창한 해결책(Over-engineering)을 제시하거나 엉뚱한 코드를 수정하여 작업 효율이 심각하게 저하되었기 때문입니다. ("지금 너무 일을 못해요")
  - **검증 결과:** `GEMINI.md`를 통해 에이전트에게 '게으른 시니어 개발자' 페르소나를 강제 주입하여, 단 1~2줄의 핵심 코드만 빠르고 간결하게 수정하도록 행동 교정을 완료했습니다.
- **교사/관리자의 숲 이동 경로 문제:**
  - **반복 요청 사유:** "내 식물 보기" 라우팅 수정 시, 학생의 `class_id` 조건만 고려하여 교사와 관리자의 예외 상황(class-3으로 이동)을 한 번에 처리하지 못했기 때문입니다. 
  - **검증 결과:** 3항 연산자 폴백(fallback) 로직에 `role` 조건을 추가하여 교사와 관리자는 항상 지정된 맵(`class-3`)으로 곧바로 이동하도록 수정 및 검증되었습니다.

---

# React + TypeScript + Vite (Original Template)

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
