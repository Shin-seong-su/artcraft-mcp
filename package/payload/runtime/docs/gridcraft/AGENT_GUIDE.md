# GridCraft AI 작업 가이드

`artcraft_status`에서 설치 앱/CLI 버전, 연결 모드를 확인한다. 현재 검증 대상은 CLI 0.12.1이며 앱 버전이 다르면 동일하다고 가정하지 않는다.

1. 저장된 파일 작업은 `artcraft_connect(app="gridcraft",mode="headless")`로 명시적으로 시작한다. 화면 문서 편집과 구분한다.
2. `artcraft_tools(app="gridcraft")`로 실제 스키마를 조회한다. 주요 도구는 `inspect_workbook`, `open_workbook`, `read_range`, `set_cell`, `write_range`, `format_range`, `execute_command`, `save_workbook`이다.
3. 기존 문서의 값·수식·병합·이미지·인쇄 설정을 먼저 읽는다. 견적의 고객, 금액, 세율, 기한과 조건은 사용자가 확인한 자료만 쓴다. 확정되지 않은 금액을 임의로 채우거나 빈 금액을 0원 확정으로 표시하지 않는다.
4. 엔진 명령은 `list_commands`에서 이름과 인자를 조회한 후 `execute_command`로 실행한다. 수식을 문자열로 대체하지 않고 저장 후 재열어 합계/VAT/총액을 검증한다. 변경 전 원본은 보존하고 수정본을 새 경로에 저장한다.
5. `artcraft_show_file`로 수정본을 화면 앱에 열고 실제 배치, 한글, 줄바꿈과 숫자 잘림을 확인한다. 파일 열기는 Live 연결 성공을 뜻하지 않는다.

Live는 `artcraft_launch(app="gridcraft")` 후 `artcraft_connect(app="gridcraft",mode="live")`를 사용한다. MCP 기본 제어 포트는 **7981**이며 VectorCraft의 7979와 분리한다. 일반 실행 중인 사용자 앱은 자동 종료하지 않는다. 제어 채널이 없으면 실패를 보고하고 Headless로 몰래 전환하지 않는다. 앱 자체 기본 포트와 MCP 설정 포트는 다를 수 있다.

Native CLI: `gridcraft-cli mcp`(파일 모드), `gridcraft-cli mcp --connect 7981`(화면 제어). `screenshot`은 화면 연결용이며 Headless 미리보기로 가정하지 않는다. 자동 재시도 없이 오류 후 상태를 확인한다.

공식 문서: https://github.com/storytold/gridcraft/blob/v0.12.1/docs/mcp.md

PDF 주의: 0.12.1의 네이티브 PDF는 비라틴 문자를 비내장 Adobe-GB1 CID 폰트로 출력합니다. 한글 XLSX 값이 정상이어도 PDF 글리프가 깨질 수 있으므로 실제 A4 PDF를 렌더링해 검증하고, 한글 폰트를 포함한 별도 출력 경로를 사용해야 할 수 있습니다. 네이티브 PDF 성공 응답만으로 한글 인쇄 검증을 완료했다고 말하지 않습니다.
