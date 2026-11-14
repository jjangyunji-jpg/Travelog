# Travelog ✈︎

세계지도에 다녀온 나라를 칠하고, 나라별 여행 기록(일기·사진)을 남기는 웹앱(PWA)입니다.

## 기능
- **세계지도**: 나라를 눌러 `가 봤어요` / `가고 싶어요` 표시 (확대·이동·핀치 줌 지원)
- **여행 기록**: 나라, 제목, 도시, 기간, 여행 일기, 사진
- **통계**: 방문국 수, 세계 %, 대륙별 진행률, 여행한 날
- **나라 목록**: 한/영 검색, 대륙 필터, 빠른 표시
- **공유 이미지**: 인스타그램용(1080×1350) 내 여행 지도 이미지 저장·공유
- **한국어 / English** 전환, 다크 모드
- **백업 내보내기 / 불러오기** (JSON, 사진 포함)

데이터는 서버 없이 기기(브라우저)에만 저장됩니다: 기록은 localStorage, 사진은 IndexedDB.

## 실행
```bash
npm install
npm run dev      # 개발 서버
npm run build    # 배포용 빌드 (dist/)
```
`dist/` 폴더를 Vercel, Netlify, GitHub Pages 등에 올리면 휴대폰에서 "홈 화면에 추가"로 앱처럼 쓸 수 있습니다.

## 기술 스택
React + TypeScript + Vite, d3-geo + world-atlas(Natural Earth 1:50m), idb-keyval
