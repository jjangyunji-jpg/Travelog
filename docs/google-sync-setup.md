# Google Drive 동기화 설정 (처음 한 번, 약 10분)

휴대폰·노트북·아이패드에서 같은 기록을 쓰려면 Google에 "이 앱이 내 Drive를 쓸 수 있게" 등록해야 합니다.
비용은 들지 않습니다. 데이터는 **내 Google Drive의 앱 전용 숨김 폴더**에만 저장되고, 다른 Drive 파일은 앱이 볼 수 없습니다.

준비물: Vercel 배포 주소 (예: `https://travelog-xxxx.vercel.app`)

## 1. 프로젝트 만들기
1. https://console.cloud.google.com 접속 → 본인 Google 계정으로 로그인
2. 상단 프로젝트 선택 → **새 프로젝트** → 이름 `Travelog` → 만들기

## 2. Google Drive API 켜기
1. 왼쪽 메뉴 **API 및 서비스 → 라이브러리**
2. `Google Drive API` 검색 → **사용**

## 3. 동의 화면(Google Auth Platform) 설정
1. 왼쪽 메뉴 **API 및 서비스 → OAuth 동의 화면** (또는 **Google Auth Platform**) → 시작하기
2. 앱 이름 `Travelog`, 사용자 지원 이메일: 본인 이메일
3. 대상(Audience): **외부(External)**
4. 연락처 이메일: 본인 이메일 → 완료
5. **대상(Audience)** 메뉴 → 테스트 사용자 → **+ Add users** → 본인 Gmail 주소 추가
   - 게시 상태는 **테스트(Testing)** 그대로 두면 됩니다. (본인만 쓰므로 Google 심사 불필요)
6. **데이터 액세스(Data Access)** 메뉴 → 범위 추가 → `.../auth/drive.appdata` 선택 → 저장

## 4. 클라이언트 ID 만들기
1. **클라이언트(Clients)** 메뉴 (또는 사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID)
2. 애플리케이션 유형: **웹 애플리케이션**
3. **승인된 JavaScript 원본**에 추가:
   - `https://travelog-xxxx.vercel.app` (본인 Vercel 주소, 끝에 `/` 없이)
   - (개발용, 선택) `http://localhost:5173`
4. 만들기 → `xxxxxxxx.apps.googleusercontent.com` 형태의 **클라이언트 ID** 복사
   - 클라이언트 보안 비밀번호(secret)는 필요 없습니다.

## 5. 앱에 넣기 (둘 중 하나)
- **방법 A (추천)**: Vercel → 프로젝트 → Settings → Environment Variables
  - Name `VITE_GOOGLE_CLIENT_ID`, Value 복사한 클라이언트 ID → 저장 후 **Redeploy**
  - 모든 기기에서 따로 입력할 필요가 없어집니다.
- **방법 B**: 앱 ⚙︎ 설정 → 기기 간 동기화 → Google Client ID 칸에 붙여넣기 (기기마다)

## 6. 각 기기에서 연결
1. 앱 ⚙︎ 설정 → **Google Drive 연결**
2. Google 로그인 → "Google에서 확인하지 않은 앱" 화면이 나오면 **계속** (본인이 만든 앱이라 정상)
3. 권한 허용 → 상단에 ☁️ 아이콘이 생기면 완료
4. 나머지 기기에서도 똑같이 연결하면 기록이 합쳐집니다.

## 자주 묻는 것
- **처음 연결할 때 기기마다 기록이 따로 있었다면?** 지워지지 않고 합쳐집니다.
- **⚠️ 아이콘이 보여요**: 보안상 로그인이 1시간마다 만료됩니다. 아이콘을 누르면 다시 연결됩니다 (보통 창이 잠깐 떴다 닫힘).
- **오프라인에서도 되나요?** 됩니다. 기기에 먼저 저장되고, 인터넷이 연결되면 자동으로 동기화됩니다.
- **`origin_mismatch` 오류**: 지금 앱을 연 주소가 4-3단계에 등록한 주소와 다를 때 납니다.
  앱 ⚙︎ 설정 → 기기 간 동기화 칸에 **현재 주소**가 표시되니, 그대로 복사해 "승인된 JavaScript 원본"에 추가하세요 (https, 끝의 `/` 없음, 반영까지 몇 분~몇 시간).
  Vercel은 대표 주소 외에 브랜치·미리보기 주소가 따로 있어요. 미리보기 주소는 배포마다 바뀌므로 **대표 주소(main 배포)를 쓰는 것**을 추천합니다.
- **회사(Google Workspace) 계정으로 로그인할 때**: 테스트 사용자 목록에 그 계정도 추가해야 하고, Workspace 관리자 설정에서 외부 앱 접근이 막혀 있으면 허용이 필요합니다.
