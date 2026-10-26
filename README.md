# ArtCraft MCP

ChatGPT 채팅에서 로컬 Mac의 ArtCraft 앱을 제어하는 MCP 연결 프로그램입니다. macOS 설치 베타 **0.2.0**을 제공합니다. ArtCraft 제작사의 공식 제품이나 ChatGPT 공개 플러그인 디렉터리 등록 제품은 아닙니다.

## 다운로드와 설치

**[macOS 설치 ZIP 다운로드](https://github.com/Shin-seong-su/artcraft-mcp/raw/refs/heads/main/downloads/artcraft-control-macos-0.2.0.zip)** · [SHA-256](downloads/artcraft-control-macos-0.2.0.zip.sha256) · [설치 안내](package/설치%20안내.txt)

1. ZIP을 다운로드하고 압축을 풉니다.
2. `1 설치.command`를 실행합니다. 전용 Node.js와 공식 ArtCraft CLI 6개를 내려받아 체크섬을 확인합니다. 별도 Node.js/Python 설치나 관리자 암호는 필요하지 않습니다.
3. `2 ChatGPT 연결.command`를 실행하고 **본인의 Tunnel ID와 런타임 키**를 입력합니다. 키는 macOS 키체인에 저장합니다. 제작자의 키나 터널을 공유하는 방식이 아닙니다.
4. ChatGPT에서 사용자 지정 MCP 서버를 추가하고 연결 방식 **Tunnel**에서 본인 터널을 선택합니다. 새 대화에 플러그인을 추가해 `ArtCraft 연결 상태를 확인해줘`로 실제 호출을 확인합니다.

최초 설치·연결 때 터미널 창이 열리며, 설정 뒤에는 일반 ChatGPT 채팅에서 사용합니다. 본인 계정/워크스페이스의 사용자 지정 MCP 및 터널 권한이 필요합니다. 설치만으로 계정의 기능 제한을 해제하지 않습니다. [OpenAI 공식 터널 안내](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)를 확인하세요.

기본 작업 폴더는 `~/Documents/ArtCraft 작업`입니다. GUI 앱은 별도로 설치해야 합니다. 패키지는 Apple 코드 서명/공증된 DMG가 아니며 시스템 보호 설정을 자동 우회하지 않습니다.

## 지원 범위

| 앱 | 파일 모드(Headless) | 화면 제어(Live) |
|---|---|---|
| VectorCraft | 지원 | 제어 채널 연결 필요 |
| FigCraft | 지원 | 제어 채널 연결 필요 |
| PDFCraft | 지원 | 제어 채널 연결 필요 |
| CADCraft | 지원 | 이 버전에서 미지원 |
| EffectCraft | 지원 | 제어 채널 연결 필요 |
| PhotoCraft | 지원 | 제어 채널 연결 필요 |

Headless는 별도 파일 작업입니다. 화면에 열려 있는 문서의 편집과 구분합니다. MCP 11개 도구에서 앱별 실제 도구 스키마와 안내 문서를 조회할 수 있습니다. CLI는 검증한 버전으로 고정되어 있으므로 GUI 앱 업데이트 뒤에는 호환성을 확인해야 합니다.

## PhotoCraft 생성형 채우기

원본 참조와 서버의 구조·보존 규칙을 호스트 AI의 이미지 편집 도구에 전달하고, 생성 결과를 검토한 뒤 PhotoCraft의 새 레이어에 적용합니다. 기본 구성은 **아래 원본 + 위 AI 전체 이미지**이며 원본 픽셀 보존 검사와 호스트 AI의 시각적 검토를 구분합니다.

MCP 자체에 이미지 생성 모델이나 이미지 API 비용은 포함하지 않습니다. 호출하는 AI 환경에 이미지 편집 도구가 있어야 하며 결과 PNG를 로컬 파일 또는 다운로드 가능한 HTTPS URL로 전달할 수 있어야 합니다. 자동 전달이 안 되면 PNG를 작업 폴더에 저장하고 경로를 알려줄 수 있습니다. 원본과 생성 결과의 색상·구조가 완벽히 같아지는 것은 보장하지 않습니다.

## 공개한 소스

- `package/payload/runtime/`: 앱 연결, 도구 정의, 생성 규칙과 이미지 적용 코드, 의존성 잠금 파일, 앱 가이드.
- `package/installer/`: Node.js/CLI 설치, 별도 실행 환경 구성, 키체인·개인 터널 연결 코드.
- `package/plugins/artcraft-control/`: 데스크톱 로컬 실행용 플러그인. 일반 클라우드 채팅의 터널 방식과 구분합니다.
- `downloads/`: 검증한 설치 ZIP과 SHA-256.
- `VERIFICATION.txt`: 검증 결과와 남은 검증 범위.

소스에서 설치하려면 이 저장소를 받아 `package/1 설치.command`를 실행할 수 있습니다. 배포 베타와 동일한 파일 구성이며, 제3자 실행 파일은 설치 시 공식 배포처에서 내려받습니다. 원본 작업 이미지, 개인 자격증명, 제작자의 기존 터널 및 브라우저 연결 설정은 포함하지 않습니다.

## 검증과 제한

자동 테스트 33개, 한글·공백 경로의 분리된 HOME 설치, 실제 CLI 6개 연결, PhotoCraft 테스트 PNG 생성·저장, 로컬 플러그인 등록, 공식 터널 클라이언트 설정 생성을 확인했습니다. 패키지의 42개 파일 해시와 플러그인/MCP JSON 스키마도 검사했습니다.

설치 검증은 같은 Apple Silicon Mac의 분리된 HOME에서 수행했습니다. 다른 Mac/Intel Mac, 다른 사용자의 ChatGPT 인증, 실제 키체인 저장 및 로그인 자동 시작의 최종 검증은 남아 있습니다. 공개 소스에 별도의 오픈소스 라이선스를 부여하지 않았습니다. 제3자 구성 요소는 각자의 라이선스를 따릅니다.

문제 보고 시 운영체제·칩 종류, 앱/CLI 버전과 오류를 알려주세요. API 키, Tunnel ID, 개인 작업 파일 및 원본 로그 전체를 공개 이슈에 올리지 마세요.
