# 문서 검증 기록

2026-10-24, EffectCraft 앱/CLI0.16.0 기준.

- 별도 빈 Headless 세션과 기존 제어 채널에서 조회만 수행. 사용자 프로젝트 생성/변경/저장/종료 없음.
- Headless27도구, Live36도구, 명령731개/명령 스키마731개, 이펙트307개 수집.
- 문서15섹션, JSON 호출 예제16개를 파싱하고 해당 네이티브 도구/엔진 명령의 실제 JSON Schema와 대조해 통과.
- 스냅샷 개수·ID 중복·문서 링크·섹션 참조 검사 통과.
- 가이드의 앱 접속 없는 조회, 섹션 경로 제한, 네이티브 도구 스키마 보존을 포함한 프로젝트 단위/전송 검사18개 통과.
- 일반 채팅의 실제 ArtCraft 플러그인 도구 `artcraft_tools(app="effectcraft",query="guide")`, `guide:ui`가0.16.0 가이드 내용을 반환한 것 확인.
- 문서 작업 중 실제 MCP `control`의 `ui.playback` status 조회 성공. playing=false 상태를 유지하고 재생/프로젝트를 변경하지 않음.

이 결과는 문서/API 조회와 예제 인자의 검증입니다.731개 명령·307개 이펙트의 전체 동작/품질 검증을 뜻하지 않습니다. 실제 Live 애니메이션 검수 범위는 [작업 가이드](AGENT_GUIDE.md)의 verification 절에 별도로 기록했습니다.

재검사:

```sh
cd integrations/artcraft-chat-mcp
npm run docs:check
npm test
```
