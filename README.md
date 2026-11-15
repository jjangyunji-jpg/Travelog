# Travelog ✈︎

세계지도에 다녀온 나라를 칠하고, 나라별 여행 기록(일기·사진)을 남기는 웹앱(PWA)입니다.

## 기능
- **세계지도**: 나라를 눌러 `가 봤어요` / `가고 싶어요` 표시 (확대·이동·핀치 줌 지원)
- **여행 기록**: 나라, 제목, 도시, 기간, 여행 일기, 사진
- **통계**: 방문국 수, 세계 %, 대륙별 진행률, 여행한 날
- **나라 목록**: 한/영 검색, 대륙 필터, 빠른 표시
- **공유 이미지**: 인스타그램용(1080×1350) 내 여행 지도 이미지 저장·공유
- **🤿 다이빙 로그북**
  - 지도에서 `🌍 여행 | 🤿 다이빙` 전환: 다이빙 모드에서는 내가 간 스팟(파란 핀)과 추천 스팟(흰 핀)이 표시되고, 나라를 누르면 그 나라로 확대되며 스팟 목록이 열림
  - 전 세계 대표 다이빙 스팟 193곳 기본 내장 (`src/data/diveSpots.ts`, 좌표는 대략적인 위치)
  - 기록 항목: 스팟, 날짜·입수 시간, 최대/평균 수심, 다이빙 시간, 수온, 시야, 시작/종료 압력, 웨이트, 기체(Air/나이트록스), 슈트, 입수 방법, 조류, 버디, 다이빙샵, 본 생물(+마릿수: 1~5 / 5~20 / 20~100 / 100+ 군체), 감정, 몸 상태, 다이빙 일기, 사진
  - **생물을 사진으로 고르기**: 도감 132종(iNaturalist CC 사진, `src/data/species.ts`). 스팟의 대표 생물 → iNaturalist에 기록된 그 스팟 근처 실제 관찰 생물 → 같은 바다에 사는 생물 순서로 보여 줌. 분류·색·무늬·크기로 좁히기, 도감에 없으면 iNaturalist 온라인 검색으로 추가
  - **⌚ 다이빙 컴퓨터 기록 불러오기**: UDDF / Subsurface 파일 → 수치와 수심 그래프 자동 입력, 스팟·나라 자동 연결, 중복 방지 ([docs/dive-computer-import.md](docs/dive-computer-import.md))
  - 나라는 검색해서 선택 (한/영)
  - 새 스팟 직접 추가 (지도에서 위치 고르기 / 현재 위치 / 좌표 입력)
  - 로그 번호 자동 매김, 이전 다이빙 횟수 설정 가능
- **☁️ 기기 간 동기화 (Google Drive)**: 휴대폰·노트북·아이패드에서 같은 기록 사용. 내 Drive의 앱 전용 숨김 폴더에 저장, 서버·DB 비용 없음. 기록 단위로 합쳐서 여러 기기에서 고쳐도 안전. 설정 방법: [docs/google-sync-setup.md](docs/google-sync-setup.md)
- **한국어 / English** 전환, 다크 모드
- **백업 내보내기 / 불러오기** (JSON, 사진 포함)

데이터는 각 기기(브라우저)에 먼저 저장되고(기록: localStorage, 사진: IndexedDB), 동기화를 켜면 내 Google Drive와 자동으로 합쳐집니다.

## 무료 배포
서버·DB가 없는 정적 사이트라 무료 호스팅으로 충분합니다.
- **Cloudflare Pages** (추천): 무료, 트래픽 무제한, 상업적 사용 가능. 빌드 명령 `npm run build`, 출력 폴더 `dist`
- Vercel Hobby (개인·비상업용 무료), GitHub Pages (공개 저장소일 때 무료)

## 생물 사진 갱신
`src/data/species.ts`에 생물을 추가한 뒤 `node scripts/fetch-species-photos.mjs` 를 실행하면 빠진 사진만 iNaturalist에서 받아 `src/data/speciesPhotos.json`에 저장합니다 (`--all` 전체 다시, `--only=key1,key2` 일부만).

## 실행
```bash
npm install
npm run dev      # 개발 서버
npm run build    # 배포용 빌드 (dist/)
```
`dist/` 폴더를 Vercel, Netlify, GitHub Pages 등에 올리면 휴대폰에서 "홈 화면에 추가"로 앱처럼 쓸 수 있습니다.

## 기술 스택
React + TypeScript + Vite, d3-geo + world-atlas(Natural Earth 1:50m), idb-keyval
