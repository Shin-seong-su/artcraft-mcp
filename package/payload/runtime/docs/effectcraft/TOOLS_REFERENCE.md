# EffectCraft 네이티브 MCP 도구

0.16.0 수집: Headless 27개, Live 36개.

외부 MCP에서는 artcraft_call의 tool에 아래 이름을, arguments에 해당 인자를 전달합니다. 아래 인자 요약보다 [전체 JSON Schema](reference/mcp-live-tools.json)를 우선합니다. 엔진 명령 ID는 별도입니다.

| 도구 | 모드 | 필수 인자 | 나머지 인자 | readOnlyHint |
|---|---|---|---|---|
| `list_commands` | 공통 | 없음 | `enabled_only`, `filter`, `schemas` | true |
| `describe_command` | 공통 | 없음 | `command`, `id` | true |
| `execute_command` | 공통 | 없음 | `command`, `id`, `params` | false |
| `run_script` | 공통 | `code` | `name` | false |
| `get_project` | 공통 | 없음 | 없음 | true |
| `get_comp` | 공통 | 없음 | `comp` | true |
| `get_layer` | 공통 | `layer` | `comp`, `depth`, `flat`, `time` | true |
| `get_property` | 공통 | `layer`, `path` | `comp`, `time` | true |
| `set_property` | 공통 | `layer`, `path` | `comp`, `expression`, `time`, `timeBase`, `value` | false |
| `add_keyframe` | 공통 | `layer`, `path` | `comp`, `interpolation`, `keys`, `time`, `timeBase`, `value` | false |
| `add_effect` | 공통 | `layer`, `effect` | `comp`, `values` | false |
| `list_effects` | 공통 | 없음 | `filter` | true |
| `list_fonts` | 공통 | 없음 | `query`, `rescan`, `variable` | true |
| `get_state` | 공통 | 없음 | 없음 | true |
| `render_frame` | 공통 | 없음 | `comp`, `inline`, `max_side`, `path`, `time`, `transparent` | false |
| `open_project` | 공통 | 없음 | `demo`, `new`, `path` | false |
| `save_project` | 공통 | 없음 | `path` | false |
| `undo` | 공통 | 없음 | `steps` | false |
| `redo` | 공통 | 없음 | `steps` | false |
| `history` | 공통 | 없음 | `goto` | false |
| `script_ui` | 공통 | 없음 | `action`, `result`, `value`, `widget`, `window` | false |
| `screenshot` | Live 전용 | 없음 | `id`, `max_side`, `panel`, `path` | false |
| `ui_inspect` | Live 전용 | 없음 | 없음 | true |
| `ui_elements` | Live 전용 | 없음 | `prefix` | true |
| `ui_click` | Live 전용 | 없음 | `button`, `count`, `id`, `modifiers`, `x`, `y` | false |
| `ui_drag` | Live 전용 | `from`, `to` | `modifiers`, `steps` | false |
| `ui_key` | Live 전용 | `key` | 없음 | false |
| `ui_type` | Live 전용 | `text` | 없음 | false |
| `ui_set` | Live 전용 | 없음 | `focused`, `home`, `menuBar`, `theme`, `timeline`, `tool`, `viewer`, `workspace` | false |
| `control` | Live 전용 | `method` | `params` | false |
| `batch` | 공통 | `steps` | `atomic`, `label` | false |
| `command_list` | 공통 | 없음 | `enabled_only`, `filter`, `schemas` | true |
| `command_run` | 공통 | `id` | `params` | false |
| `render_preview` | 공통 | 없음 | `comp`, `max_side`, `time`, `transparent` | true |
| `command_batch` | 공통 | `steps` | `stop_on_error` | false |
| `doc_inspect` | 공통 | 없음 | 없음 | true |

readOnlyHint는 서버의 분류입니다. history.goto, 경로를 지정한 screenshot/render, script/control 등은 실제 동작을 확인합니다. UI의 toggle 입력은 재실행하면 상태를 반대로 바꿀 수 있습니다.

## 호환 별칭

`command_list`↔`list_commands`, `command_run(id)`↔`execute_command(command)`, `render_preview`↔미리보기. `batch`와 `command_batch`는 원자성·인자 키·undo 방식이 다르므로 서로 단순 치환하지 않습니다.

`control {method,params}`로 ui.focus/ui.playback 등의 공식 메서드에 접근할 수 있습니다. 별도의 ui_focus 도구가 없다고 기능이 없다고 판단하지 않습니다.
