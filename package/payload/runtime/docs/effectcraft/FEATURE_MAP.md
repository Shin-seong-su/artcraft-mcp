# EffectCraft 기능 지도

기준 0.16.0 · 엔진 명령 731개 · 이펙트 307개.

이 표는 런타임 명령 등록 목록을 분류한 것입니다. 각 기능의 완료도·실데이터 품질 검수를 뜻하지 않습니다. 빈 Headless 상태의 enabled=false는 기능 부재가 아닙니다. 작업 시 list_commands/describe_command로 현재 조건과 인자를 확인합니다.

| 기능 | 명령 접두사 | 개수 | 대표 ID |
|---|---|---:|---|
| 파일 열기·가져오기·저장 | `file.*` | 61 | `file.newProject`, `file.openDemoProject`, `file.open`, `file.save` |
| 렌더 백엔드/프레임 | `render.*` | 4 | `render.backend`, `render.addOutputModule`, `render.preRender`, `render.saveCurrentPreview` |
| 로토 모델·전파·상태 | `roto.*` | 14 | `roto.models`, `roto.model.select`, `roto.model.install`, `roto.model.download` |
| 얼굴 관련 기능 | `face.*` | 5 | `face.models`, `face.model.select`, `face.model.install`, `face.model.download` |
| 편집·히스토리 | `edit.*` | 27 | `edit.undo`, `edit.redo`, `edit.cut`, `edit.copy` |
| 캐시 | `cache.*` | 1 | `cache.diskStats` |
| 컴포지션·작업 영역 | `comp.*` | 31 | `comp.new`, `comp.settings`, `comp.setPosterTime`, `comp.trimToWorkArea` |
| 레이어·변형·부모·블렌드 | `layer.*` | 121 | `layer.newText`, `layer.newSolid`, `layer.newNull`, `layer.newShape` |
| 뷰어·표시·스냅 | `view.*` | 78 | `view.set3DView`, `view.setPaneView`, `view.3d.activeCamera`, `view.3d.default` |
| 카메라 | `camera.*` | 19 | `camera.fromView`, `camera.orbit`, `camera.pan`, `camera.dolly` |
| 재질 | `material.*` | 4 | `material.set`, `material.revealSource`, `material.reset`, `material.duplicateAssign` |
| 조명 | `light.*` | 3 | `light.fromModel`, `light.controlWithCamera`, `light.environmentBackground` |
| 텍스트 애니메이터 | `text.*` | 13 | `text.animatorFontAxes`, `text.presets`, `text.animatorProperties`, `text.edit` |
| 속성 읽기·쓰기·키 | `prop.*` | 18 | `prop.get`, `prop.set`, `prop.toggleAnimation`, `prop.addKey` |
| 키프레임·보간·이동 | `keys.*` | 36 | `keys.toggleTransform`, `keys.select`, `keys.move`, `keys.delete` |
| 프로젝트 항목 | `project.*` | 13 | `project.select`, `project.rename`, `project.move`, `project.setLabel` |
| 모션 관련 기능 | `motion.*` | 1 | `motion.sketch` |
| 마커 | `markers.*` | 5 | `markers.list`, `markers.nested`, `markers.set`, `markers.delete` |
| 마스크 | `mask.*` | 17 | `mask.new`, `mask.addVertex`, `mask.setVertex`, `mask.setClosed` |
| 패스 | `path.*` | 6 | `path.rotoBezier`, `path.convertToBezier`, `path.groupShapes`, `path.ungroupShapes` |
| 이펙트 인스턴스 | `effect.*` | 19 | `effect.apply`, `effect.pickColor`, `effect.applyLast`, `effect.removeAll` |
| 시간·타임라인 탐색 | `time.*` | 17 | `time.set`, `time.nextFrame`, `time.previousFrame`, `time.forward10` |
| 출력 큐·설정·렌더 | `renderQueue.*` | 20 | `renderQueue.add`, `renderQueue.remove`, `renderQueue.setRender`, `renderQueue.setRenderSettings` |
| 도움말·진단 | `help.*` | 13 | `help.docs`, `help.discord`, `help.website`, `help.appPage` |
| 명령 목록·스키마 | `command.*` | 2 | `command.list`, `command.describe` |
| 앱 상태/설정 | `app.*` | 12 | `app.capabilities`, `app.about`, `app.settings`, `app.gpuInfo` |
| 에디터 상태 | `editor.*` | 1 | `editor.state` |
| 원자적 배치 | `engine.*` | 1 | `engine.batch` |
| 애니메이션 프리셋 | `anim.*` | 9 | `anim.savePreset`, `anim.applyPreset`, `anim.addKeyframe`, `anim.reveal` |
| 벡터 도형 | `shape.*` | 8 | `shape.newPath`, `shape.fillStroke`, `shape.dashes.add`, `shape.dashes.remove` |
| 미디어 검사·재연결 | `footage.*` | 12 | `footage.check`, `footage.reloadChanged`, `footage.relink`, `footage.missing` |
| 스크립트 | `script.*` | 4 | `script.run`, `script.settings.get`, `script.settings.save`, `script.runTasks` |
| 파일 경로 관련 기능 | `paths.*` | 3 | `paths.pointsFollowNulls`, `paths.nullsFollowPoints`, `paths.tracePath` |
| 이펙트 목록 | `effects.*` | 1 | `effects.copyPresetsFolderPath` |
| 재생·미리보기 설정 | `playback.*` | 6 | `playback.toggle`, `playback.cacheWhenIdle`, `playback.audio`, `playback.scrubAudio` |
| 창·작업 공간 | `window.*` | 9 | `window.panel`, `window.workspace`, `window.saveWorkspace`, `window.saveWorkspaceAs` |
| 추적·안정화 | `track.*` | 22 | `track.motion`, `track.stabilize`, `track.new`, `track.property` |
| 워프 분석 | `warp.*` | 3 | `warp.analyze`, `warp.cancel`, `warp.status` |
| 오브젝트 매트 | `objectMatte.*` | 5 | `objectMatte.apply`, `objectMatte.propagate`, `objectMatte.freeze`, `objectMatte.unfreeze` |
| 페인트 | `paint.*` | 6 | `paint.stroke`, `paint.options`, `paint.brushPreset`, `paint.setCloneSource` |
| 퍼펫 핀·메시 | `puppet.*` | 10 | `puppet.addPin`, `puppet.movePin`, `puppet.setPin`, `puppet.removePin` |
| 유동화 | `liquify.*` | 2 | `liquify.stroke`, `liquify.clear` |
| 환경설정 | `prefs.*` | 5 | `prefs.get`, `prefs.set`, `prefs.reset`, `prefs.open` |
| 단축키 | `shortcuts.*` | 7 | `shortcuts.list`, `shortcuts.set`, `shortcuts.reset`, `shortcuts.preset` |
| Essential Properties/템플릿 | `essential.*` | 22 | `essential.setPrimary`, `essential.setName`, `essential.addProperty`, `essential.addMirror` |
| 표현식 | `expr.*` | 2 | `expr.errors`, `expr.languageMenu` |
| 스크립트 UI | `scriptui.*` | 6 | `scriptui.list`, `scriptui.get`, `scriptui.click`, `scriptui.set` |
| 백그라운드 작업 | `jobs.*` | 3 | `jobs.list`, `jobs.cancel`, `jobs.wait` |
| 미디어 브라우저 | `mediaBrowser.*` | 7 | `mediaBrowser.list`, `mediaBrowser.go`, `mediaBrowser.addFavorite`, `mediaBrowser.removeFavorite` |
| 프로젝트 항목 작업 | `item.*` | 1 | `item.metadata` |
| 스코프 | `scopes.*` | 1 | `scopes.analyze` |
| 내용 인식 채우기 | `contentFill.*` | 2 | `contentFill.set`, `contentFill.generate` |
| 저장 공간 | `storage.*` | 3 | `storage.info`, `storage.persist`, `storage.clear` |
| 학습/안내 | `learn.*` | 5 | `learn.list`, `learn.state`, `learn.start`, `learn.step` |
| 템플릿 | `templates.*` | 5 | `templates.list`, `templates.thumbnail`, `templates.create`, `templates.saveAs` |

## 탐색 예

예: `artcraft_call(app="effectcraft", tool="list_commands", arguments={"filter":"renderQueue","schemas":true})`로 출력 큐 기능을 찾습니다. 반환된 schema를 확인하고 필요한 명령만 실행합니다.

전체 ID/스키마는 [engine-commands.json](reference/engine-commands.json), 전체 이펙트/파라미터는 [effects.json](reference/effects.json)에 있습니다.

직접 검증한 생성·한글·키프레임·PNG·실제 창·저장 범위는 [AGENT_GUIDE.md](AGENT_GUIDE.md)의 verification을 읽습니다.
