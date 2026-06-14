## 2024-05-23 - Cart Drawer Accessibility Improvements
**Learning:** Icon-only buttons without `aria-label`s were found in the Cart Drawer (close, increment, decrement, remove). Screen reader users are severely disadvantaged when these interactive elements lack semantic labeling, making basic interactions like adjusting order quantity very difficult.
**Action:** When adding or reviewing features with icon-only buttons (like modals, quantity adjusters, or cart actions), ensure that an `aria-label` or visually hidden text is always present to describe the action.

## 2024-05-24 - Admin Theme Editor Accessibility Improvements
**Learning:** Similar to the Cart Drawer, the Admin Theme Editor lacked `aria-label`s on icon-only buttons used for reordering and deleting sections and menu links. These administrative interfaces are equally important to keep accessible for content managers relying on screen readers.
**Action:** Consistently verify that reorder arrows (up/down) and delete (trash/X) icon buttons include `aria-label`s, especially in complex list-editing interfaces like navigation menus or page builders.
