## 2024-05-18 - Missing Aria-labels on Custom Quill Editor Toolbars
**Learning:** Custom toolbars for libraries like ReactQuill often lack default accessibility features. The `RichTextEditor` in this project defined a custom toolbar using pure HTML elements (`button`, `select`) without any text content or `aria-label`s, making them invisible to screen readers.
**Action:** Always ensure that custom toolbars built for third-party libraries include `aria-label` attributes on all interactive elements, especially icon-only buttons.
