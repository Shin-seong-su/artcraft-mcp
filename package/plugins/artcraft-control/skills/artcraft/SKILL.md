---
name: artcraft
description: Control local ArtCraft apps, inspect or edit creative files, and generate/edit images while preserving the original. Use when the user asks for PhotoCraft, VectorCraft, FigCraft, PDFCraft, CADCraft, GridCraft or EffectCraft work.
---

Start with artcraft_status. Headless file sessions and live GUI sessions are different. Never switch silently, close user apps or overwrite originals. Discover actual argument schemas with artcraft_tools before calling native tools. CADCraft is file mode only. Use new output filenames and inspect saved results.

For GridCraft read artcraft_tools(app="gridcraft",query="guide"). For EffectCraft read artcraft_tools(app="effectcraft",query="guide"). For PhotoCraft read photocraft_tools(query="guide"), then query="generative" for the current source-preserving image workflow. The MCP returns a server-owned prompt and review checklist: observe the real reference, provide reference_description and structure_constraints, send the reference image AND returned prompt to an available host image editing tool, inspect the full output, then provide honest visual_review. Never mark a failed candidate as passed to bypass the gate. Image generation is external; tool availability alone does not mean the host has a generator. A ChatGPT sandbox path is not a path on the user Mac. Accept a downloadable HTTPS PNG URL, or ask the user to save the generated PNG into the configured workspace and supply its path if automatic handoff is unavailable.

Default output is the full AI image above the unchanged original, never an automatically clipped strip. Source pixel preservation and host-reported visual fidelity are distinct. Match actual observed flat fills or gradients; do not invent original colors or assume a flat sky. Review failures return a revision prompt; reuse the clean original, not a rejected composite. Do not retry interrupted mutations. Use generative_fill_status and native inspection to recover.

For an existing PhotoCraft LIVE selection, use generative_selection_prepare and generative_selection_apply. The actual selection becomes a layer mask; the reference supplied to the image AI identifies the bounding rectangle, not the exact mask shape. Observe and describe the selected object. Do not call this Content-Aware Fill. Never claim the live document changed until the apply result is verified.

For PhotoCraft local AI enhancement or upscaling, use photocraft_tools(query="upscale"), then ai_upscale_start and ai_upscale_status via photocraft_call. JPEG conversion is automatic; preserve_size=true retains original pixel dimensions. This is a local external model, not a native PhotoCraft filter. Preserve the original and review the result.
