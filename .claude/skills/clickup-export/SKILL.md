---
name: clickup-export
description: Export retro board editing area screenshot to ClickUp Docs (Sygna > Sygna Docs (master) > Sygna Docs (Tech) > Retro Record > Sprint {n}). Usage: /clickup-export <session-uuid>
argument-hint: <session-uuid>
allowed-tools: Bash, Read
---

Export the retro board session to ClickUp Docs as a new sub-page.

**Target path:** Sygna Space → Sygna Docs (master) Folder → Sygna Docs (Tech) Doc → Retro Record page → new sub-page "Sprint {N}"

**Known IDs (do not re-fetch):**
- Document ID: `rcj35-3025`
- Retro Record page ID: `rcj35-143178`

---

### Step 1 — Fetch export payload from the retro board API

```bash
curl -s "http://localhost:3000/api/sessions/$ARGUMENTS/export"
```

Parse the JSON response. You need:
- `payload.session.sprintNumber` → the page title will be **"Sprint {N}"**
  - If `sprintNumber` is null/missing, fall back to `payload.session.name`
- `payload.markdownContent` → the full markdown body for the page
  - **Strip the first line** (the `# ...` heading) from `markdownContent` before using it, since ClickUp renders the page title as the heading automatically.

### Step 2 — Take screenshot

Run this and wait for the user to drag-select the editing area (excluding the sidebar):

```bash
screencapture -i /tmp/retro_sprint_$ARGUMENTS.png && echo "Screenshot saved"
```

Then use the Read tool to load the image at `/tmp/retro_sprint_$ARGUMENTS.png` to visually confirm it captured correctly.

### Step 3 — Create the ClickUp doc page

Use the ClickUp MCP `clickup_create_document_page` tool with:
- `document_id`: `rcj35-3025`
- `parent_page_id`: `rcj35-143178`
- `name`: `Sprint {N}` (from Step 1)
- `content_format`: `text/md`
- `content`: the stripped `markdownContent` from Step 1

### Step 4 — Report result

Tell the user:
- The page name used (e.g. "Sprint 41")
- Whether it succeeded
- The direct URL to the new page if available
