export const GENERATION_POLICY_VERSION='2.1';
const baseChecks=[
 {id:'reference_preserved',instruction:'Compare reference and candidate: subject identity, pose, landmarks, proportions, composition, palette and style remain faithful except explicitly requested changes. Source-layer pixel preservation is a separate machine check.'},
 {id:'objects_connected',instruction:'Trace outlines and connected structures at full size: no floating endpoints, chopped objects, disconnected parts, open island shorelines, or unintended hard vertical cutoffs.'},
 {id:'seams_absent',instruction:'Inspect the former edit boundary and the full canvas: no abrupt color seams, rectangular pasted edges, white gaps, missing objects or accidental cropping.'}
];
export function buildGenerationPlan({prompt,rect,width,height,blankRegion=false,outputMode='full_layer',referenceDescription='',structureConstraints=[],sceneType='general'}){
 const [x,y,w,h]=rect;
 const structure=structureConstraints.map((s,i)=>`${i+1}. ${s}`).join('\n');
 const topology=sceneType==='landscape'?`Landscape topology — only for objects present in the reference/request; do not invent them:
- A bridge has one continuous deck with consistent perspective. Its ends meet visible banks/abutments (or are naturally occluded); supports reach water/ground, not empty air. Never stop the deck at a rectangular editing boundary.
- Islands have continuous closed organic shorelines with water around them. Peninsulas visibly join a landmass. River channels connect around land. No square-cut islands or arbitrary vertical land edges.
- Mountain silhouettes and terrain bands flow across the composition. Match the OBSERVED color treatment: flat areas stay flat; existing gradients retain comparable direction, range and softness. Do not assume the sky is a uniform color or invent a color constant. Do not add unrelated textures or restyle the lighting.`:`Structural continuity:
- Keep intact outlines, connected joints, perspective and natural occlusions. Complete visible forms instead of ending them at an editing boundary.
- Preserve existing lettering, logos and repeated details as accurately as possible; do not invent replacements. If exact preservation cannot be achieved, flag this in review rather than claiming fidelity.`;
 const scope=outputMode==='full_layer'?`The rectangle x=${x}, y=${y}, width=${w}, height=${h} is the FOCUS, not a clipping boundary. Return one coherent FULL image. Allow only small adjacent-background corrections required for continuity; preserve the subject and all unrelated content. Never divide the drawing at x=${x} or crop out a strip. The complete result will be placed on a separate layer above the untouched source.`:`The requested replacement rectangle is x=${x}, y=${y}, width=${w}, height=${h}. Surrounding pixels will come from the original, so shapes, position and color MUST meet the original exactly at its borders. Do not rely on redesigned content outside that rectangle to establish continuity. Return a full canvas for border inspection; only the explicitly requested region will be imported.`;
 const generationPrompt=`Edit the attached original ${width}x${height} artwork; use it as an image input, not merely as inspiration for text-to-image generation.
${blankRegion?'Only the explicitly requested region was blanked white.':'This is the intact reference. No pixels have been erased or blanked.'}

REQUEST: ${prompt.trim()}
OBSERVED REFERENCE (descriptive context): ${referenceDescription}

PRIORITY 1 — preserve identity and intent:
Retain the original subject, pose, expression, clothing, major shapes, scale, position, composition, palette, line character, materials and rendering style unless the request explicitly changes them. Keep already-complete objects intact. Do not translate or redraw unrelated details for decoration. Use the original image as the reference for each revision, not a previous rejected composite.

PRIORITY 2 — complete coherent structures:
${topology}
Task-specific observable requirements:
${structure||'Inspect the reference and identify concrete objects/contacts that must remain continuous before generating.'}
If an existing form is unfinished in the reference and the request is to complete it, repair that form; do not preserve its defect literally.

PRIORITY 3 — coherent output:
${scope}
Match nearby colors and perspective. Keep the full ${width}x${height} canvas, with no crop, reframing, comparison panels, padding, white gaps, added borders or watermarks. Return an opaque PNG.
Before delivering, trace connected objects and shorelines, inspect endpoints and compare the subject against the reference. Fix visible topology or boundary errors before presenting a final candidate.`;
 return {version:GENERATION_POLICY_VERSION,outputMode,sceneType,generationPrompt,
  readyForGeneration:referenceDescription.trim().length>=10&&structureConstraints.length>0,
  reviewChecklist:baseChecks,
  hostWorkflow:['Inspect the original image and supply reference_description plus grounded structure_constraints. Do not invent observations.',
   'Send the actual original/edit-target image and this generationPrompt to the image editing tool.',
   'Inspect the WHOLE generated image against the original, including the checklist. Never judge quality solely from a successful API call or unchanged source pixels.',
   'If any check fails, regenerate from the same original reference with concrete correction notes. Keep the rejected candidate separate; never feed an accidental clipped composite back as the clean original.',
   'Apply with visual_review only after inspection. All three review flags must pass; notes must state actual observations. This is a host-reported visual review, not an independent server vision test.'],
  limitation:'Prompt rules improve repeatability but cannot guarantee model fidelity. The MCP server does not run its own image model or visual evaluator.'};
}
