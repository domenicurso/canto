# Input, focus, selection, and clipboard

[Documentation](../README.md)

```ts
input({ value: query, onChange: setQuery, placeholder: "Search…" }).autoFocus();
input({ defaultValue: "untitled", onSubmit: save });
textarea({ value: notes, onChange: setNotes }).width("fill").height(8);
```

Controlled values require `onChange`; uncontrolled values accept `defaultValue`. Both support `disabled`, `readOnly`, and placeholder text. Inputs submit on Enter; textareas insert newlines. Editing preserves graphemes and supports deletion and bracketed paste. Ctrl/Alt+Left/Right (or Alt+B/F) move by Unicode words; Home/End move to line boundaries, and Ctrl+Home/End move to document boundaries. Meta+Left/Right move to line boundaries and Meta+Up/Down to document boundaries when the terminal forwards those modifiers. Shift extends the selection for these movements; plain Left/Right collapse an existing selection to its edge. Ctrl+A selects all. Textarea Up/Down moves between logical lines; Ctrl/Alt+Up/Down moves between blank-line-separated paragraphs.

Buttons, editors, and scrolling regions participate in Tab navigation. `.focusable()`, `.tabIndex()`, `.autoFocus()`, `.onFocus()`, and `.onBlur()` customize it. Negative tab indexes permit programmatic focus while excluding Tab traversal. `.ref()` receives a mounted handle with `focus()`, `scrollTo()`, and a live `rect`; it receives `null` when detached.

`.onKey()` bubbles structured events through ancestors. `preventDefault()` suppresses default editing or activation; `stopPropagation()` stops bubbling. Buttons activate on Enter, Space, or pointer release inside the pressed button. `.onMouse()` exposes pointer events, and `.hovered()` styles their ancestors. Inline mouse coordinates require a terminal cursor-position reply; keyboard operation remains available if the terminal does not reply.

Plain `text()` is non-selectable by default because it is also used for labels and chrome. Enable content with `text("Copy this").selectable()` or put `.selectable()` on a content container; descendants inherit that policy, and the nearest `.selectable(false)` or `.selectable(true)` overrides it. Button labels remain controls, and editors retain built-in selection regardless of the surrounding policy. Native terminal selection bypasses these application rules.

Drag across selectable text elements to select their content, or drag within an editor to select its underlying value, including whole graphemes and original newlines. Text selection follows source characters across wrapped lines, copies their original spaces instead of visual line breaks, and excludes padding, empty layout rows, and button labels. Separate text elements are joined by a space on the same row or a newline on different rows. Both text and editor selection support `.selected(style())`. Plain selection clears on wheel input, other keyboard actions, source replacement, or resize. Double-click selects a Unicode word; triple-click selects a visual text row or an editor logical line, including its newline. Dragging from either expands by whole words or lines. Repeated clicks must arrive within 400ms at the same location (with one column of tolerance); adapters may also supply `PointerEvent.clicks`. Selection does not automatically scroll beyond the viewport.

Use `createApp(View, { selection: "native" })` to let the terminal handle mouse selection and copying. Switch during a session with `await app.selection.setMode("native")` or `await app.selection.setMode("text")`; `app.selection.mode` reports the current mode. The default is `"text"`. Native mode disables application mouse tracking, including pointer buttons, hover, wheels, and scrollbar dragging; keyboard controls continue to work. Injected terminal adapters support native mode through optional `setMouseTracking(enabled)`. The interactions playground toggles modes with F2, which also switches back when native mode owns the mouse.

```ts
text("Select this text")
  .selectable()
  .selected(style().background("blue").color("white"));
```

Alt+W or Ctrl+Insert copies the selection. Ctrl+X cuts an editable selection. Paste normally uses the terminal's native shortcut and bracketed paste; Ctrl+V or Shift+Insert additionally works when a clipboard adapter provides reads. Ctrl+C still exits. An editor's `onKey` can prevent the default clipboard action.

`useApp().clipboard.writeText(text)` sends a UTF-8 [OSC 52 clipboard request](https://invisible-island.net/xterm/ctlseqs/ctlseqs.html). The terminal must permit this operation; sending the request cannot confirm acceptance. `createApp(View, { clipboard })` overrides it with a `Clipboard` adapter containing async `writeText` and optional `readText`. No clipboard read query is sent to the terminal. `MemoryTerminal.clipboardText` provides an in-memory clipboard. Clipboard shortcut failures shut down through normal app error handling; direct API callers own their promise and errors. Delayed paste is discarded if the editor changes or unmounts before it completes.

See [event contracts](../api/events.md), [editor props](../api/controls.md), and [clipboard adapters](../api/terminal.md). Snippets on this page show composition patterns; callbacks such as `save` belong to your application.
