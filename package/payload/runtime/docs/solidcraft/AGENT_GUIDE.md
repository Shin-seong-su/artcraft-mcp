# SolidCraft AI 작업 안내

SolidCraft의 설치 앱에 포함된 `solidcraft-cli`를 사용한다. 앱과 CLI가 함께 업데이트되므로 실제 연결한 세션의 버전과 현재 도구 스키마를 확인한다. 이 안내는 0.28.0에서 Headless 및 Live 연결과 상자 생성·치수 측정·저장을 확인한 기록이다. 개별 모델링 명령 전체를 검증한 것은 아니다.

1. `artcraft_status`에서 `solidcraft`의 설치·연결·버전을 확인한다.
2. 화면의 문서를 다루면 `artcraft_connect`의 `app: "solidcraft", mode: "live"`, 별도 파일 작업이면 `mode: "headless"`를 명시한다. 기존 연결 모드를 바꾸면 그 세션의 CLI가 닫힌다. Headless에 미저장 작업이 있으면 먼저 사용자가 정한 경로에 저장한다.
3. `artcraft_tools`에서 실제 도구와 인자 스키마를 확인한다. `inspect_design`, `list_commands`, `describe_command`, `skill_reference`로 현재 모델과 각 명령을 살핀다. SolidCraft 자체 가이드는 `artcraft_call`에서 `tool: "skill_reference"`, `arguments: {"skill": "solidcraft-modeling", "file": "SKILL.md"}` 등으로 조회할 수 있다.
4. 변경 전 현재 파일, 단위, 파라미터, 피처 및 저장 상태를 확인한다. `new_design`과 `open`은 현재 설계를 교체할 수 있으므로 미저장 문서를 보존한다. 자동 재시도하지 말고 상태를 읽는다.
5. 변경 후 `inspect_design`, `measure`, `screenshot` 등으로 확인하고 별도 파일 경로에 저장한다. Live와 Headless 결과를 혼동하지 않는다. STEP 가져오기가 원래 CAD의 피처 트리를 보존한다는 뜻은 아니다.

Live는 SolidCraft를 `--control 7982`로 실행한 제어 채널을 사용한다. 이 포트는 PhotoCraft의 7878과 분리되어 있으며 다른 프로그램이 사용할 수 있으니 실제 연결과 문서 조회로 확인한다. 이미 일반 모드로 실행 중인 앱을 임의 종료하지 않는다. 앱을 새 제어 모드로 시작해야 한다면 사용자가 저장하고 종료한 뒤 `artcraft_launch`를 호출한다. `--allow-path`로 작업 폴더를 지정하지만 그것만으로 완전한 OS 샌드박스나 모든 파일 접근 제한을 보장하지 않는다.
