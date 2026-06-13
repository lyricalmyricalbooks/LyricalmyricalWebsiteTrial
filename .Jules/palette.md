## 2024-05-23 - Cart Drawer Accessibility Improvements
**Learning:** Icon-only buttons without `aria-label`s were found in the Cart Drawer (close, increment, decrement, remove). Screen reader users are severely disadvantaged when these interactive elements lack semantic labeling, making basic interactions like adjusting order quantity very difficult.
**Action:** When adding or reviewing features with icon-only buttons (like modals, quantity adjusters, or cart actions), ensure that an `aria-label` or visually hidden text is always present to describe the action.
