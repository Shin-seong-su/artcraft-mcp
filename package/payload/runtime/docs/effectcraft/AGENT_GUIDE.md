# EffectCraft AI 작업 가이드

문서 기준: EffectCraft 앱/CLI **0.16.0**, 2026-10-24. 이 맥의 ArtCraft MCP와 함께 사용합니다. 앱 업데이트 뒤에는 실제 도구·명령 스키마를 우선합니다.

## 읽는 방법

전체 파일을 전달하거나 `artcraft_tools(app="effectcraft", query="guide:섹션ID")`로 필요한 부분을 읽습니다. `guide`는 quickstart, `guide:all`은 전문입니다. 이 문서의 JSON은 실제 도구 호출의 인자 객체입니다. 설명을 읽는 것과 명령을 실행하는 것을 구분합니다.

<!-- section:quickstart -->
## 빠른 시작

**작업 목표와 대상 파일을 확인한 다음 상태→명시적 연결→탐색→편집→검증→저장 순서로 진행합니다.**

1. `artcraft_status {}`로 effectcraft의 mode, connected, desktopVersion, cliPackageVersion, versionMatch를 확인합니다. 설치와 실제 호출 성공은 별도입니다.
2. 열린 화면을 수정하려면 `artcraft_connect {"app":"effectcraft","mode":"live"}`. 파일만 처리하려면 mode를 headless로 명시합니다. 연결을 바꾸기 전에 기존 Headless 작업의 dirty/path를 확인하고 저장합니다.
3. `artcraft_tools {"app":"effectcraft","query":"get_project"}`로 네이티브 도구를 찾고 `artcraft_call {"app":"effectcraft","tool":"get_project","arguments":{}}`로 현재 문서를 확인합니다.
4. 익숙하지 않은 엔진 명령은 `describe_command`로 인자 스키마를 읽습니다. 문서의 레이어 번호를 다른 프로젝트에 그대로 쓰지 않습니다.
5. 변경 후 get_comp/get_layer/get_property와 render_frame으로 확인합니다. Live 화면 확인은 ui_inspect/screenshot을 함께 사용합니다.
6. 사용자 지정 경로나 새로운 `.ecproj` 경로에 save_project로 저장하고 응답의 경로·dirty 및 실제 파일을 확인합니다.

시작용 호출:

```json
{"app":"effectcraft","mode":"live"}
```

위 인자를 **artcraft_connect**에 전달합니다. 연결 뒤 아래 인자는 **artcraft_call**에 전달합니다.

```json
{"app":"effectcraft","tool":"get_project","arguments":{}}
```

Live 연결 실패를 Headless 성공으로 바꿔 보고하지 않습니다. 등록된 기능/목록 조회/실제 편집/저장/화면 확인을 각각 구분합니다. 재연결이나 타임아웃 뒤 변경 명령을 자동 재전송하지 않습니다.

<!-- section:connection -->
## 연결과 버전

| 구분 | Live | Headless |
|---|---|---|
| 대상 | 화면 앱의 프로젝트 | 별도 CLI 세션의 프로젝트 |
| 화면 반영 | 연결한 앱에서 확인 | GUI 원본에 자동 반영되지 않음 |
| 확인 | get_project + ui_inspect | get_project + render_frame |
| 도구 수(0.16.0) |36|27|

이 환경은 `ArtCraft 제어` 플러그인→공유 터널→ArtCraft 게이트웨이→앱 브리지→네이티브 CLI로 연결됩니다. 브라우저 도구를 이용해 EffectCraft를 조작할 필요는 없습니다. `artcraft_tools`는 도구 발견, `artcraft_call`은 네이티브 도구 실행입니다. 도구 이름의 호스트 접두사는 환경마다 달라도 인자는 같습니다.

EffectCraft의 제어 모드는 같은 앱을 `--control 9877`로 시작하는 방식입니다. 맥 앱 내부에는 CLI가 포함되지 않으므로 별도 CLI 릴리스가 필요합니다. `manifest.json`은 사용 중인 CLI 패키지를 기록합니다. 화면 앱 업데이트만으로 이 캐시는 바뀌지 않습니다.

- EffectCraft가 꺼져 있으면 `artcraft_launch {"app":"effectcraft"}` 후 live 연결.
- 일반 실행 중인 앱은 자동 종료하지 않습니다. 사용자에게 저장·종료를 요청한 뒤 제어 모드로 시작합니다.
-9877 포트가 비었으면 제어 채널이 없는 상태입니다. 점유 중이라는 사실만으로 EffectCraft 연결이 검증된 것은 아닙니다. 다른 프로그램이 사용하는지와 네이티브 호출 성공을 함께 확인합니다.
- CLI와 화면 앱의 버전 차이를 확인합니다. 차이가 곧 비호환이라는 뜻은 아니지만 현재 가이드를 그대로 신뢰하지 말고 스키마와 호출을 다시 검증합니다.
- 현재 브리지의 EffectCraft Headless는 `mcp --empty`를 사용합니다. 네이티브 `--autosave` 옵션은 있지만 이 브리지에서 자동 체크포인트가 켜졌다고 가정하지 않습니다.

상태의 connected=true만으로 앱이 지금 정상 응답한다고 보고하지 않습니다. 실제 get_project/get_state 호출을 확인합니다. UI 창이 닫힌 뒤에는 다시 연결을 검사합니다.

<!-- section:features -->
## 기능 지도와 확인 수준

0.16.0 런타임에서 명령731개(인자 스키마731개), 이펙트307개를 수집했습니다. 전체 카탈로그는 reference JSON과 [FEATURE_MAP.md](FEATURE_MAP.md)에 있습니다. 다음은 작업별 출발점입니다.

| 작업 | 먼저 찾을 명령/도구 | 검증 수준 |
|---|---|---|
| 프로젝트/컴포지션 | open_project, save_project, comp.new, comp.settings | 생성·저장 Live 검증 |
| 제목/한글/폰트 | layer.newText, layer.setText, list_fonts | 한글·영문 제목 Live 검증 |
| 색상 배경/벡터 도형 | layer.newSolid, shape.newShape, shape.newPath | 원·둥근 사각형 Live 검증 |
| 위치/스케일/불투명도 | get_layer, set_property, add_keyframe, prop.* | 키프레임 Live 검증 |
| 타이밍/보간/그래프 | time.*, keys.*, timeline.* | 시간 이동·기본 키 생성 검증; 나머지 목록 확인 |
| 이펙트/색 보정 | list_effects, add_effect, effect.* | 등록 목록 확인;307개 개별 동작 미검증 |
| 마스크/트랙 매트/블렌드 | mask.*, path.*, layer.setTrackMatte, layer.setBlendMode | 명령 목록 확인 |
| 부모 연결/프리컴프/시간 재매핑 | layer.setParent, comp.*, layer.* | 명령 목록 확인 |
|3D/카메라/라이트/재질 | camera.*, light.*, material.*, comp.renderer | 명령 목록 확인 |
| 영상·음원·이미지 가져오기 | file.import, footage.*, layer.addItem | 명령 목록 확인 |
| 추적/안정화/왜곡 | track.*, warp.* | 명령 목록 확인 |
| 로토/오브젝트 매트/퍼펫 | roto.*, objectMatte.*, puppet.* | 명령 목록 확인; 모델·실데이터 동작 미검증 |
| Content-Aware Fill | contentFill.set, contentFill.generate | 명령 목록 확인; 생성형 이미지 AI와 동일하다고 가정 금지 |
| 템플릿/Essential Properties | templates.*, essential.* | 명령 목록 확인 |
| 표현식/스크립트/ScriptUI | expr.*, run_script, script_ui | 기능·스키마 확인; 복잡한 스크립트 미검증 |
| 프레임 렌더링/실제 창 | render_frame, screenshot, ui_inspect | PNG·GPU·실제 창 검증 |
| 동영상/음원/이미지 시퀀스 출력 | renderQueue.* | 출력 형식 등록 확인; 전체 코덱 출력 미검증 |

앱이 보고하는 GPU 지원 이펙트 수나 After Effects 유사성 수치를 품질·성능 보증으로 사용하지 않습니다. 이펙트별 적용 후 실제 프레임을 검사합니다.

<!-- section:tools -->
## 도구와 엔진 명령을 구분하기

세 단계가 있습니다.

1. **외부 도구**: artcraft_connect, artcraft_tools, artcraft_call.
2. **네이티브 MCP 도구**: get_project, execute_command, batch, add_keyframe, control 등.
3. **엔진 명령 ID**: comp.new, layer.newText, prop.addKey, renderQueue.add 등. execute_command의 command 또는 batch.steps[].command에 넣습니다.

`comp.new`를 네이티브 도구 이름으로 호출하지 않습니다. 다음은 인자 발견→명령 실행의 예입니다.

```json
{"app":"effectcraft","tool":"describe_command","arguments":{"command":"comp.new"}}
```

```json
{"app":"effectcraft","tool":"execute_command","arguments":{"command":"comp.new","params":{"name":"AI Demo","width":1280,"height":720,"frameRate":30,"duration":6}}}
```

실제 스키마를 찾을 때 `artcraft_tools`의 query는 이름뿐 아니라 설명도 검색하므로 예상한 도구가 첫 결과가 아닐 수 있습니다. `nextOffset`이 있으면 나머지 페이지를 읽고 정확한 name을 선택합니다. 기본12개, 최대30개이며 Live36개는 두 페이지입니다.

`list_commands {filter,schemas:true}` 또는 `describe_command {command}`로 엔진 인자를 읽습니다. 빈 Headless 스냅샷의 enabled=false/why="no composition is open"은 기능이 없는 것이 아니라 현재 선행 조건이 없다는 뜻입니다.

| 실행 방법 | 동작 |
|---|---|
| execute_command / command_run | 엔진 명령1개. command_run은 id를 받음 |
| batch | `{command,params}` 배열, 기본 전체 롤백·하나의 undo. 원자성은atomic 옵션 확인 |
| command_batch | `{id,params}` 배열, 기본 첫 실패에서 중지. 앞선 성공은 남고 undo도 별도 |
| run_script | AE 스타일 JavaScript. 단순 명령만으로 가능한 작업이면 불필요하게 사용하지 않음 |
| control(Live 전용) | 공식 제어 메서드를 그대로 호출. 엔진 ID와 혼동하지 않음 |

예기치 않은 최상위 키와 엔진 인자는 거부됩니다. `isError`, 내부 failed/results, 네이티브 에러를 함께 읽습니다. 어떤 단계가 실제 적용됐는지 불확실하면 조회부터 합니다.

<!-- section:animation -->
## 애니메이션과 좌표

- 컴포지션/레이어 ID는 생성 응답이나 get_comp에서 얻습니다. `"#1"`은 맨 위 레이어의 현재 순번이며 삽입/정렬 뒤 바뀝니다.
- get_layer에서 실제 property path를 읽습니다. transform/position, transform/opacity 같은 경로도 타입을 확인합니다. 위치가vec3면 `[x,y,z]`, 도형 그룹 위치가vec2면 `[x,y]`를 사용합니다.
- 시간 단위는 초입니다. 키의 기본 시간 기준은 레이어 시간이며 오프셋/늘이기/역재생이 있으면 comp 시간과 다릅니다. 의도가 컴포지션 시간이면 timeBase를comp로 명시합니다.
- 키 변경의 시간은 프레임으로 스냅될 수 있습니다. 응답과 get_property의 실제 시간을 확인합니다.
- 표현식이 켜져 있으면 저장된 키 값과 최종 평가 값이 다를 수 있습니다.

아래 예제의 TITLE_LAYER_ID는 실제 ID 또는 고유한 레이어 이름으로 바꿉니다.

```json
{"app":"effectcraft","tool":"add_keyframe","arguments":{"layer":"TITLE_LAYER_ID","path":"transform/opacity","timeBase":"comp","keys":[{"time":0,"value":0},{"time":1,"value":100},{"time":5,"value":100},{"time":6,"value":0}],"interpolation":"easyEase"}}
```

```json
{"app":"effectcraft","tool":"get_property","arguments":{"layer":"TITLE_LAYER_ID","path":"transform/opacity","time":2}}
```

한 번에 새 컴포지션과 제목을 만드는 예제입니다. 기존 프로젝트에 새 컴포지션을 추가하므로 사용자 의도와 현재 dirty 상태를 먼저 확인합니다. `$3.layer`는 **같은 batch의3번째 응답**을 참조합니다. 바깥 호출이나 다음 batch에서는 사용할 수 없습니다.

```json
{"app":"effectcraft","tool":"batch","arguments":{"label":"Create editable title","steps":[{"command":"comp.new","params":{"name":"AI Demo","width":1280,"height":720,"frameRate":30,"duration":6}},{"command":"layer.newSolid","params":{"name":"Background","color":"#0b1422"}},{"command":"layer.newText","params":{"name":"Title","text":"ARTCRAFT","font":"Helvetica Neue","style":"Bold","size":108,"fill":"#ffffff","position":[640,320]}},{"command":"prop.addKey","params":{"layer":"$3.layer","path":"transform/opacity","time":0,"value":0}},{"command":"prop.addKey","params":{"layer":"$3.layer","path":"transform/opacity","time":1,"value":100}}]}}
```

이 예제는 실제로 검증한 comp.new/layer.newSolid/layer.newText/prop.addKey 흐름을 재사용합니다. 다만 예제 전체를 현재 사용자 프로젝트에 자동 실행하지 않습니다. 결과 ID를 받아 별도 후속 작업을 진행합니다.

<!-- section:shapes-text -->
## 도형과 한글 텍스트

`shape.newShape`는 선택된 도형 레이어가 있으면 그 안에 **새 그룹**을 추가합니다. 이름을 다르게 줬다는 이유로 별도 레이어가 생겼다고 가정하지 않습니다. 실제 Live 테스트에서도 원2개와 강조선이 한 도형 레이어의3개 그룹으로 생성됐습니다.

- 별도 도형 레이어가 필요하면 layer.newShape를 먼저 만들고 생성 응답의 layer를 shape.newShape에 명시합니다.
- 그룹을 추가하면 contents/group, contents/group#2 등의 순서가 바뀔 수 있습니다. 애니메이션을 넣기 전 get_layer로 다시 읽습니다.
- shape.newShape의position은 중심점입니다. `space:"comp"`와 `space:"layer"`를 구분합니다.
- fill/stroke와 색상 타입은 명령 스키마로 확인합니다. #rrggbb와0~1 배열을0~255 배열과 혼용하지 않습니다.

한글은 list_fonts로 현재 설치된 글꼴을 확인하고 글꼴 이름을 명시합니다. 이 맥의 Live 테스트에서는 `Apple SD Gothic Neo`로 한글 자막이 렌더링됐습니다. 다른 컴퓨터의 설치를 보장하지 않습니다.

```json
{"app":"effectcraft","tool":"list_fonts","arguments":{"query":"Apple SD Gothic Neo"}}
```

```json
{"app":"effectcraft","tool":"execute_command","arguments":{"command":"layer.newText","params":{"name":"Subtitle","text":"채팅에서 바로 움직이는 디자인","font":"Apple SD Gothic Neo","size":30,"fill":"#a8bdcf","position":[640,410]}}}
```

다른 제목 길이·폰트·단락 상자에서는 anchor/position과 실제 bounds를 다시 검사하고 render_frame으로 잘림을 확인합니다.

<!-- section:effects -->
## 이펙트와 고급 기능 탐색

307개 이펙트의 정확한 ID/파라미터/기본값은 reference/effects.json에 있습니다. 작업 시에는 현재 런타임의 list_effects를 우선합니다.

```json
{"app":"effectcraft","tool":"list_effects","arguments":{"filter":"Gaussian"}}
```

적용할 레이어와 파라미터 ID를 확인한 다음 add_effect를 사용합니다. 응답의 instance path와 파라미터 경로를 받아 get_property/set_property로 수정합니다. 같은 종류의 이펙트가 여러 개면 이름만으로 고르지 않습니다.

```json
{"app":"effectcraft","tool":"add_effect","arguments":{"layer":"TARGET_LAYER_ID","effect":"Gaussian Blur","values":{"blurriness":12}}}
```

이 적용 예제는 등록된 API의 사용 예이며 해당 이펙트의 렌더 품질까지 이 프로젝트에서 검증한 것은 아닙니다. 적용 후 프레임을 확인하고 효과 범위/알파/경계/시간에 따른 변화를 검사합니다.

추적·로토·오브젝트 매트·Content-Aware Fill은 각각 track.*, roto.*, objectMatte.*, contentFill.*로 찾아 스키마와 jobs/status를 확인합니다. 모델이 필요한 기능은 사용 가능한 모델/설치 상태부터 읽습니다. 명령 이름에 generate가 있다는 이유로 외부 생성형 AI가 연결됐다고 보고하지 않습니다.

<!-- section:render -->
## 저장과 렌더링

편집 가능한 원본은 `.ecproj`입니다. After Effects 스타일 API가 있다는 이유로 `.aep` 호환을 가정하지 않습니다. 가져오기는 file.import의 지원 형식과 경고를 확인합니다.

```json
{"app":"effectcraft","tool":"save_project","arguments":{"path":"NEW_ABSOLUTE_OUTPUT_PATH.ecproj"}}
```

NEW_ABSOLUTE_OUTPUT_PATH는 사용자가 지정한 경로 또는 승인된 출력 폴더의 새 파일명으로 바꿉니다. 기존 사용자 파일을 임의로 덮어쓰지 않습니다.

```json
{"app":"effectcraft","tool":"render_frame","arguments":{"time":2,"max_side":1280,"path":"NEW_ABSOLUTE_PREVIEW_PATH.png"}}
```

프레임 렌더는 컴포지션 픽셀, screenshot은 실제 창입니다. PNG 한 장이 성공했다고 영상 전체 출력 성공으로 보고하지 않습니다.

영상 출력의 순서:

1. describe_command로 renderQueue.add의 현재 스키마를 확인합니다.
2. comp/format/output/timeSpan/start/end/frameRate/resolution/channels/audio를 명시합니다.
3. renderQueue.list로 항목과 출력 경로를 검사합니다.
4. renderQueue.render를 실행하고 상태/결과/출력 파일을 확인합니다. UI와 비동기 실행은 완료 응답만으로 결과를 단정하지 않습니다.
5. 영상의 실제 길이·해상도·프레임레이트·알파/오디오·누락 프레임을 별도로 검사합니다.

0.16.0이 보고한 출력 형식에는 H264/HEVC/AV1/ProRes/WebM, PNG/JPEG/TIFF/EXR 시퀀스, GIF/WAV/AIFF 등이 있습니다. 전체 형식의 인코딩/호환성 검수는 하지 않았습니다. GPU 사용은 get_project.renderer.active/adapter로 확인합니다. headless 스냅샷의 gpu=false는 이 맥의 GPU가 없다는 뜻이 아닙니다.

MCP의 진행률/취소는 직접 연결 방식과 실행 종류에 따라 다릅니다. 현재 ArtCraft 브리지는 앱별 호출을 직렬화하므로 네이티브 서버의 병렬 처리 가능성을 그대로 약속하지 않습니다. 긴 출력은 `renderQueue.render {wait:false}`의 스키마와 반환 ID를 확인하고, 이후 renderQueue.list로 조회하는 방식을 검토합니다.

<!-- section:ui -->
## 실제 화면·재생·포커스

Live 전용은 screenshot, ui_inspect, ui_elements, ui_click, ui_drag, ui_key, ui_type, ui_set, control의9개입니다. Headless에서 이 도구가 없다는 것은 정상입니다.

앱 자체 제어 메서드는 **control 도구**로 호출합니다. 포커스나 재생을 위해 별도 터미널/임의 TCP 코드를 만들 필요는 없습니다.

```json
{"app":"effectcraft","tool":"control","arguments":{"method":"ui.playback","params":{"action":"status"}}}
```

위 조회는 현재 연결에서 실제 MCP 호출을 검증했습니다. 재생 시작/중지는 각각 action을play/stop으로 명시합니다. Space는toggle이므로 현재 상태를 모르면 반복해서 누르지 않습니다.

화면 캡처가 covered/minimized 오류를 반환할 때:

```json
{"app":"effectcraft","tool":"control","arguments":{"method":"ui.focus","params":{}}}
```

그 뒤 ui_inspect의 windowFocused와 screenshot 결과를 확인합니다. 포커스 이동은 사용자의 다른 앱 작업에 영향을 줄 수 있으므로 필요한 때만 합니다. 캡처 실패를 파일 렌더 성공으로 대신해 실제 창을 봤다고 보고하지 않습니다.

```json
{"app":"effectcraft","tool":"screenshot","arguments":{"panel":"Composition","max_side":1280}}
```

UI를 조작하기 전 ui_elements를 읽고 반환된 id/rect를 사용합니다. 문서 속의 좌표나 오래된 스크린샷으로 클릭하지 않습니다. ui_set의focused는 패널 포커스이며 OS 창 활성화와 다릅니다. control(method="ui.focus")가 창 활성화입니다.

<!-- section:scripts -->
## 스크립트·표현식·파일 범위

run_script는 AE 스타일 JavaScript 객체 모델을 제공합니다. 실제 Adobe After Effects 전체 API 또는 임의 Node.js 환경으로 간주하지 않습니다. 사용 가능한 객체/속성은 현재 스크립팅 문서와 작은 검증으로 확인합니다.

- 단순 생성/키프레임/이펙트는 일반 도구나 batch로 먼저 구성합니다.
- 사용자가 요청하지 않은 파일 열람·앱 종료·환경설정 변경을 스크립트에 섞지 않습니다.
- Undo 그룹을 쓸 때 예외로 그룹이 열린 채 남지 않도록 처리합니다.
- 표현식은 반환 타입과 값/시간을 get_property와 렌더로 검사합니다.
- file access, automation roots, 프로젝트 폴더/스크립트 쓰기 설정은 실제 설정을 확인합니다.

현재 로컬 브리지가 EffectCraft에 자동화 루트 제한을 전달한다고 가정하지 않습니다. 네이티브 `--automation-read-root/--automation-write-root`로 제한한 별도 실행에서는 script/UI/control 도구도 거부될 수 있습니다. 경로 오류를 권한을 넓혀 우회하기 전에 요청한 출력 경로와 설정을 확인합니다.

<!-- section:recovery -->
## 오류 처리와 복구

| 관측 | 확인/조치 |
|---|---|
| 설치 true, 연결 true인데 실제 호출 실패 | get_state/get_project 호출과 도구 이름/연결 모드/클라이언트 노출을 구분 |
| 첫4앱 enum이 effectcraft를 거부 | 예전 플러그인/대화 정의. 새 ArtCraft 제어 연결의 실제 스키마를 확인; 앱 재설치로 단정 금지 |
| Unknown tool | 호스트 라우팅/선택 플러그인과 실제 현재 tools 목록 확인. 이름을 추측해 재시도 금지 |
|9877 listener 없음 | 일반 실행 또는 앱 종료. 기존 작업 저장 후 제어 모드로 시작 |
| batch 실패 | atomic 옵션·실패 단계·현재 프로젝트를 확인; 이미 반영된 변경을 다시 쌓지 않음 |
| 타임아웃/연결 끊김 | 변경 결과 불명일 수 있음. 문서/undo/대상 속성을 읽고 재실행 여부 판단 |
| 도형이 같은 레이어에 생성 | 선택된 도형 레이어에 그룹 추가 동작. 실제 layer/group 반환 확인 |
| 이미지가 잘림/한글 깨짐 | bounds/anchor/좌표/설치 폰트 확인 후 프레임 렌더 |
| 스크린샷 가림 오류 | 필요한 경우 control ui.focus→ui_inspect→screenshot |
| Headless를 바꿔도 화면이 그대로 | 다른 세션을 편집한 것. 저장한 파일 열기와 Live 연결을 구분 |
| 저장/렌더 경로 거부 | automation roots/절대경로/대상 폴더 확인. 원본 덮어쓰기나 권한 확대를 자동 진행하지 않음 |

open_project(new/demo/path), undo/redo/history 이동, 앱 종료는 현재 작업을 바꿀 수 있습니다. dirty를 먼저 확인합니다. 브리지/터널 점검 때문에 사용자 앱을 강제 종료하지 않습니다. native autosave가 켜졌다고 가정하지 말고 파일 저장을 확인합니다.

<!-- section:updates -->
## 업데이트 뒤 문서를 신뢰하는 방법

1. artcraft_status로 GUI/CLI 패키지 버전을 확인합니다.
2. 현재 연결의 artcraft_tools와 list_commands/describe_command를 다시 읽습니다.
3. 이 가이드0.16.0과 다르면 새 버전에서 달라진 도구/필수 인자/이름을 먼저 확인합니다.
4. 캐시/manifest를 갱신하더라도 열린 사용자 세션을 자동 폐기하지 않습니다. 저장·재연결·스키마 재조회를 구분합니다.
5. docs/effectcraft/reference를 재수집한 뒤 이 설명과 예제를 검토합니다.

저장소 루트에서:

```sh
cd integrations/artcraft-chat-mcp
node scripts/snapshot-effectcraft-docs.mjs
```

스냅샷 스크립트는 목록 조회만 합니다. 실행 중인 GUI를 종료하거나 프로젝트를 바꾸지 않으며, 설치/다운로드/자동 버전 보정도 하지 않습니다. live 도구 수집에는 제어 채널이 필요합니다. metadata.json의 버전/시각/수집 상태를 먼저 봅니다.

JSON reference의 enabled/why는 별도 빈 Headless 세션의 상태입니다. 실제 프로젝트의 enablement는 현재 명령 조회로 확인합니다. capabilities의 자체 평가나 이펙트 GPU 표시는 런타임 보고값이며 독립 품질 검수 결과가 아닙니다.

<!-- section:verification -->
## 검증 기록과 완료 보고

2026-10-24 이 맥에서 확인한 범위:

- 앱과 CLI0.16.0 일치, Live 네이티브36도구 조회.
- 새 ArtCraft 플러그인의 실제 원격 artcraft_* 호출 성공.
- 빈 GUI 프로젝트에1280×720/30fps/6초 컴포지션 생성.
- 영문 제목/한글 자막/배경/도형 생성, 키프레임 batch31단계 성공.
- Apple M4 Pro Metal GPU 렌더링, PNG 미리보기 검사.
- 실제 앱 창 screenshot 및 windowFocused=true/playing=true 확인.
- `.ecproj` 저장 성공, 사용자가 "잘 움직인다"고 검수.
- 이번 문서 작업에서는 별도 Headless 빈 세션에서 명령·스키마·이펙트 목록만 수집했고, Live 프로젝트는 변경하지 않음.
- MCP control(ui.playback,status) 조회 성공. 문서 작업 중 관측한 playing=false는 사용자가 멈춘 현재 상태이며 자동으로 다시 재생하지 않음.

검증 산출물(저장소 상대 경로):

`output/artcraft-chat/effectcraft-live-1792825137556/artcraft-live-title.ecproj`

같은 폴더에 preview.png, window-native.png, live-verification.json이 있습니다. 다른 환경에서 같은 절대 경로/레이어ID/재생 상태를 가정하지 않습니다.

완료 보고에는 실제로 한 작업, 연결 모드, 저장한 원본 경로, 확인한 프레임/창/파일, 남은 미검증 범위를 간단히 씁니다. "기능731개 등록"을 "731개 기능 모두 검수 완료"라고 바꾸지 않습니다.
