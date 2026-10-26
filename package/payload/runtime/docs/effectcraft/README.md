# EffectCraft AI 작업 문서

다른 AI에게는 먼저 [AGENT_GUIDE.md](AGENT_GUIDE.md)를 읽게 합니다. 이 문서는 이 맥의 ArtCraft 연결 방식, 실제 명령 탐색, 작업 절차, 검증 수준을 함께 설명합니다.

| 자료 | 용도 |
|---|---|
| [AGENT_GUIDE.md](AGENT_GUIDE.md) | AI의 작업 순서·주의점·JSON 호출 예제 |
| [FEATURE_MAP.md](FEATURE_MAP.md) | 기능별 명령 그룹과 탐색할 ID |
| [TOOLS_REFERENCE.md](TOOLS_REFERENCE.md) | Live 36개 도구의 인자·용도·Headless 지원 여부 |
| [reference/metadata.json](reference/metadata.json) | 수집 버전·시각·개수·출처 |
| [reference/mcp-live-tools.json](reference/mcp-live-tools.json) | Live 도구 전체 JSON Schema |
| [reference/mcp-headless-tools.json](reference/mcp-headless-tools.json) | Headless 도구 전체 JSON Schema |
| [reference/engine-commands.json](reference/engine-commands.json) | 엔진 명령731개와 각 인자 JSON Schema |
| [reference/effects.json](reference/effects.json) | 이펙트307개의 ID·파라미터·기본값 |
| [reference/capabilities.json](reference/capabilities.json) | 앱이 보고한 기능·출력 형식 |

수집 기준은0.16.0입니다. 등록된 기능 수는 전체 기능의 동작 검수를 뜻하지 않습니다. 현재 프로젝트의 조건에 따라 명령의 enabled/why도 바뀝니다.

## 일반 ChatGPT에서 읽기

새 도구를 설치하지 않고 기존 도구를 사용합니다.

```json
{"app":"effectcraft","query":"guide"}
```

위 인자로 `artcraft_tools`를 호출하면 빠른 시작 가이드와 섹션 목록이 반환됩니다. `query:"guide:animation"`, `query:"guide:ui"`, `query:"guide:recovery"`처럼 필요한 부분을 읽거나 `guide:all`로 전문을 읽습니다. 가이드 조회는 앱을 실행하거나 문서를 변경하지 않습니다.

AI에게 전달할 요청 예:

> ArtCraft 제어의 artcraft_tools를 app="effectcraft", query="guide"로 호출해 사용법을 읽어줘. 필요한 섹션과 실제 명령 스키마를 확인한 뒤 작업하고, 저장 결과와 미리보기를 검증해줘.

## 업데이트 후 재수집

앱과 CLI 버전을 맞추고 제어 모드의 EffectCraft가 실행된 상태에서 저장소 루트 기준으로 실행합니다.

```sh
cd integrations/artcraft-chat-mcp
node scripts/snapshot-effectcraft-docs.mjs
```

스크립트는 별도의 빈 Headless 세션과 기존 Live 연결에서 목록만 읽습니다. 사용자 프로젝트를 만들거나 저장·종료하지 않습니다. 앱 실행, CLI 다운로드, 버전 일치 보정은 하지 않습니다. 스냅샷 변경 후 가이드의 버전과 예제를 다시 검토합니다.

공식 문서: [0.16.0 agent 안내](https://raw.githubusercontent.com/storytold/effectcraft/v0.16.0/docs/agents.md), [MCP 규약](https://raw.githubusercontent.com/storytold/effectcraft/v0.16.0/docs/mcp.md), [제어 프로토콜](https://raw.githubusercontent.com/storytold/effectcraft/v0.16.0/docs/control-protocol.md).
