# PhotoCraft 생성형 채우기 — AI 작업 안내

## 로컬 AI 업스케일

PhotoCraft 앱 메뉴에 새 기능을 설치하는 것이 아니라 ArtCraft MCP가 로컬
Real-ESRGAN 엔진을 호출하여 **별도의 평탄화된 PNG**를 만든다. 원본 파일과
열려 있는 앱 문서는 변경하지 않는다. 레이어가 있는 문서는 먼저 명시적으로
PNG로 내보내고, 원본 편집 파일은 유지한다.

1. `photocraft_tools({"query":"upscale"})`로 현재 스키마를 확인한다.
2. `photocraft_call({"tool":"ai_upscale_start","arguments":{"input_path":"워크스페이스 또는 Downloads의 PNG/JPG","scale":2,"model":"photo","preserve_size":true}})`를 실행한다.
   JPG는 자동으로 PNG로 변환한다. 원래 픽셀 크기를 유지할 때 `preserve_size:true`로 AI 확대 후 자동 축소한다.
   배율은 2 또는 4, 모델은 `photo` 또는 `illustration`. 모델은 항상 4배로 처리하고 2배는 후처리로 만든다.
   AI 중간 이미지는 최대 64MP이며 입력은 최대 4MP다.
3. 반환된 `job_id`를 `ai_upscale_status`에 전달해 `completed`와 실제 출력 경로를 확인한다.
   실행 중인 작업은 한 번만 요청하고 끝날 때까지 상태를 확인한다. 중단·오류를 자동 재시도하지 않는다.
4. 결과를 실제 원본과 비교한다. 글자·로고·제품 형상과 투명 경계가 달라질 수 있다.
   `doc_open`으로 결과를 새 Headless 문서로 열거나 `photocraft_show_file`로 표시할 수 있다. 결과 PNG의 메타데이터·색 프로필은 원본과 다를 수 있다.
   화면에 열린 원본 문서에 반영했다고 주장하지 않는다.

엔진은 `~/Library/Application Support/ArtCraft MCP/engines/realesrgan-20220424/`에
별도 설치한다. 실험 검증은 macOS Apple Silicon의 로컬 엔진과 PhotoCraft CLI 0.17.0에서 했다.
모든 컴퓨터나 GUI Live 제어 검증을 의미하지 않는다. 8배 배율은 제공하지 않는다.

이 기능은 PhotoCraft 내장 생성형 모델이 아니다. MCP가 편집 대상을 준비하고,
호출한 채팅 AI의 이미지 편집 도구가 이미지를 생성한 다음 MCP가 결과를 새 레이어로 넣는다.
내용 인식 채우기(Content-Aware Fill)로 조용히 대체하지 않는다.

## Live 선택 영역 생성형 편집

PhotoCraft 화면에서 선택한 영역을 외부 이미지 생성 AI로 바꾼 뒤 원본 위에 마스크가
있는 새 레이어로 적용한다. PhotoCraft 내장 Content-Aware Fill이 아니다.

1. `photocraft_connect({"mode":"live"})` 후 `ui_inspect`로 열린 문서와 선택을 확인한다.
2. `photocraft_tools({"query":"generative"})`에서 `generative_selection_prepare`,
   `generative_selection_apply`, `generative_fill_status`의 현재 스키마를 확인한다.
3. 선택된 대상과 주변을 관찰하고 `generative_selection_prepare`에 편집 지시,
   관찰한 원본 설명과 구조 조건을 전달한다. 참조는 전체 원본이며 선택 밖을 지우지 않는다.
   AI에게 전달되는 위치는 선택의 **사각 경계**다. 실제 올가미 모양의 픽셀 마스크가
   AI에 전달되는 것은 아니므로 대상의 위치와 모습을 구체적으로 설명한다.
4. 반환된 참조 이미지와 지시를 이미지 편집 AI에 보내고 생성된 전체 결과를 관찰한다.
   결과가 잘못됐다면 적용하지 않는다. 같은 종횡비로 크기가 달라진 경우에만
   `resize_to_canvas:true`를 명시할 수 있다.
5. `generative_selection_apply`에 생성 PNG와 실제 육안 검토를 전달한다. 현재 선택을
   PhotoCraft 레이어 마스크로 적용한다. 준비 이후 문서나 선택이 바뀌면 다시 준비한다.
   작업은 재실행하지 않고 오류 상태와 문서를 확인한다.
6. 결과의 선택 바깥 사각 경계 픽셀, 원본 아래 레이어와 마스크 여부를 서버가 검사한다.
   이 검사는 선택의 정확한 모양을 독립적으로 비교하거나 이음새 품질을 보증하지 않는다.
   가져온 생성 이미지 탭은 열린 채 남고, 결과를 보존하려면 새 이름의 편집 파일로 저장한다.

macOS PhotoCraft 0.17.0 Live에서 AI가 생성한 단순 시험 이미지와 타원형·올가미
선택으로 검증했다. 실제 사진에서의 제거·합성 품질은 아직 검증하지 않았다.

## 기존 Headless 생성형 채우기 지원 범위

- 현재는 **Headless 파일 세션**만 지원한다. 열린 GUI 문서를 직접 수정했다고 말하지 않는다.
- RGB 8비트, 최대 16메가픽셀, 명시적인 사각형 `[x,y,width,height]` 영역.
- 현재 선택 영역이 있으면 사용자가 해제하거나 동의한 다음 준비한다. 자유형 선택은 미지원.
- 생성 결과는 불투명 PNG. 크기가 다르면 기본 거부한다.
  같은 종횡비일 때만 `resize_to_canvas:true`로 명시적으로 리샘플링할 수 있다.
- 기본 `output_mode:"full_layer"`: 아래 원본을 보존하고 **AI 전체 결과**를 위에 새 레이어로 둔다.
  사각형은 작업 초점이며 자동 잘라붙이기 경계가 아니다. 원본의 모습이 AI 결과에서도 정확히 유지됐다는 뜻은 아니다.
  사용자가 명시적으로 부분 교체를 원할 때만 `output_mode:"region"`으로 해당 사각형을 가져온다.
- AI에 보내는 참조 이미지는 기본적으로 기존 면을 지우지 않은 전체 원본이다.
  `blank_region` 기본값은 `false`. 사용자가 명시적으로 비우기를 요청한 경우에만 `true`로 설정한다.
- 색상 조건은 실제 원본에 근거한다. 단색인 부분은 단색으로, 원래 그라데이션이 있는 부분은
  그 방향·색 범위·부드러움을 유지한다. 시각적 추정만으로 원본을 단색이라고 단정하거나 색 상수를 만들어 넣지 않는다.
- 외부 이미지 생성 도구를 사용할 수 있어야 한다. MCP 단독 실행은 이미지를 생성하지 않는다.

## 작업 순서

1. `artcraft_status`로 상태 확인. 열린 파일 요청을 Headless로 몰래 전환하지 않는다.
2. 파일 작업이라면 `photocraft_connect({"mode":"headless"})`.
3. `photocraft_tools({"query":"doc_open"})`로 스키마 확인하고
   `photocraft_call({"tool":"doc_open","arguments":{"path":"프로젝트 안의 입력 파일"}})`.
   기존 문서를 닫지 않고 새 문서를 연다.
4. `doc_inspect`로 문서 크기·색상 모드 확인. 필요하면 사용자가 요청한 범위에서
   `image.canvasSize`로 캔버스를 확장한다. 생성 준비 이후에는 문서를 바꾸지 않는다.
5. `render_preview` 등으로 원본을 실제 관찰한 다음 `photocraft_tools({"query":"generative"})`에서 현재 스키마 확인.
6. `photocraft_call`로 `generative_fill_prepare` 실행:

   ```json
   {"tool":"generative_fill_prepare","arguments":{"rect":[768,0,256,1024],"prompt":"오른쪽 빈 영역의 풍경을 완성해줘","scene_type":"landscape","reference_description":"모나리자 인물 뒤에 겹친 산과 강이 있고, 오른쪽에 미완성 다리가 보인다. 오른쪽 1/4은 빈 캔버스다.","structure_constraints":["다리의 교량 상판은 양쪽 강둑에 연결되고 교각이 물/지면까지 닿아야 한다.","섬의 해안선은 닫힌 자연스러운 윤곽이며 강물은 그 주변으로 이어져야 한다.","원래 인물의 표정·자세·크기·위치와 벡터풍 색조를 유지한다."]}}
   ```

7. 반환된 인라인 편집 대상 이미지를 **호출 AI의 이미지 편집 도구**에 전달하고
   서버의 `generationPrompt`와 `policy.hostWorkflow`에 따라 생성한다.
   서버 규칙은 원본·구도 보존, 구조 연결, 편집 경계 제거, 풍경의 다리·섬·강의 연결 조건을 포함한다.
   로컬 에이전트는 `inputPath`를 먼저 열어 확인한다.
   이미지 생성 완료는 PhotoCraft 반영 완료가 아니다.
8. 생성 결과를 프로젝트 안의 PNG 파일로 복사하거나, 다운로드 가능한 공개 HTTPS PNG URL을 받는다.
   **ChatGPT 서버의 `sandbox:/...` 경로는 사용자 맥의 로컬 경로가 아니다.**
   생성 도구가 결과 바이트/파일 또는 다운로드 URL을 전달할 수 없다면 적용 불가를 알린다.
   임의 업로드 서비스에 사용자 이미지를 올리지 않는다.
9. **생성된 전체 이미지와 원본을 실제로 비교한다.**
   `policy.reviewChecklist`의 원본 모습·구조 연결·이음새 항목을 평가한다.
   문제가 있으면 통과했다고 쓰지 않는다. 실패한 항목과 실제 관찰을 `visual_review`에 전달하면
   서버가 적용 전에 거부하고 `generative_fill_status`에 `revisionPrompt`를 남긴다.
   같은 깨끗한 원본과 수정 프롬프트로 재생성한다. 잘린 합성본을 새 원본으로 사용하지 않는다.
   검사한 결과만 `generative_fill_apply`로 적용한다. `generated_path`와 `generated_url` 중 하나만 사용한다:

   ```json
   {"tool":"generative_fill_apply","arguments":{"job_id":"준비 단계의 UUID","generated_path":"output/생성결과.png","resize_to_canvas":true,"visual_review":{"reference_preserved":true,"objects_connected":true,"seams_absent":true,"notes":"원본과 전체 출력을 비교했다. 인물 자세와 얼굴이 유지되고, 다리는 양 강둑에 연결되며 섬의 해안선이 닫혀 있고 수직 절단이 없다. 색감은 약간 달라 정확한 픽셀 일치로 보지는 않는다."}}}
   ```

   웹 이미지 도구가 제공한 다운로드 URL은 `generated_url`로 전달할 수 있다.
   인증이 필요한 URL, 사설 네트워크 주소, PNG가 아닌 파일은 지원하지 않는다.
10. `generative_fill_status`와 `doc_inspect` 확인.
    `originalCompositePreserved:true`는 새 레이어를 숨기고 원본 합성 픽셀을 비교한 **서버 측 검사**다.
    전체 레이어 모드에서는 `resultMatchesGenerated:true`와 새 AI Full 레이어를 확인한다.
    이 모드는 AI 결과의 사각형 바깥도 바뀔 수 있으므로 `outsidePreserved:false`만으로 실패로 판단하지 않는다.
    부분 교체 모드에서만 `outsideChangedPixels:0`을 요구한다.
    `visualReview.provenance:"host_reported"`는 **호스트 AI가 보고한 육안 검토**다.
    서버가 독립된 시각 모델로 평가한 것처럼 말하지 않는다. 픽셀 보존 검사는 생성 품질을 보증하지 않는다.
11. 새 이름의 `.pcraft`로 저장하고 PNG도 내보낸다. 다시 열어 레이어와 미리보기 확인.
    필요하면 `photocraft_show_file`로 화면에 연다. 파일 열기 요청만으로 Live 연결을 주장하지 않는다.

## 실패·복구

- 준비 후 문서/리비전/활성 문서/픽셀이 달라지면 새 레이어를 넣기 전에 거부한다.
- 적용이 시작된 후 오류가 나면 작업 상태는 `failed`. 같은 작업은 재실행하지 않는다.
  상태·문서·임시 문서를 확인하고 필요한 경우 사용자에게 복구 방법을 안내한다.
- 연결 프로그램이 재시작되면 이전 준비 작업은 적용할 수 없다. 현재 문서로 다시 준비한다.
  원본과 영역이 같다면 이미 생성된 이미지 파일을 다시 사용할 수 있다.
- PhotoCraft의 `file.placeEmbedded` 명령은 자동화에서 파일 경로 접근을 거부한다.
  이를 우회하지 않는다. 구현은 허용된 `doc_open`으로 패치를 열고,
  `layer.copyToDocument`로 메모리상 레이어를 복사한 다음 임시 문서만 닫는다.
- 다른 앱의 연결이나 사용자 GUI 앱을 종료하지 않는다.
- 서버 정책은 `integrations/artcraft-chat-mcp/photocraft-generation-policy.mjs`가 소유한다.
  `reference_description`과 `structure_constraints`는 관찰에 근거해 매 작업마다 채운다.
  정책만으로 생성 모델의 시각적 충실도를 보장할 수는 없다. 상세 프롬프트와 정직한 결과 검토를 함께 수행한다.

## 검증

`integrations/artcraft-chat-mcp`에서 `npm test`로 상태 변경 차단, 재시도 차단,
사각형 밖 픽셀 보존, 출력 크기 및 다운로드 경로 검사를 실행한다.
실제 이미지 AI → PhotoCraft CLI 0.7.0의 파일 세션 → PNG/레이어 저장 흐름은
`output/artcraft-chat/generative-fill-test/`에 시연 결과를 남겼다.
Live GUI 편집, 다른 버전, 다른 컴퓨터는 이 검증에 포함되지 않는다.
