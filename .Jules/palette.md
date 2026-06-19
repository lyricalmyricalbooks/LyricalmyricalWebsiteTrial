## 2024-05-23 - Cart Drawer Accessibility Improvements
**Learning:** Icon-only buttons without `aria-label`s were found in the Cart Drawer (close, increment, decrement, remove). Screen reader users are severely disadvantaged when these interactive elements lack semantic labeling, making basic interactions like adjusting order quantity very difficult.
**Action:** When adding or reviewing features with icon-only buttons (like modals, quantity adjusters, or cart actions), ensure that an `aria-label` or visually hidden text is always present to describe the action.

## 2024-05-24 - Admin Theme Editor Accessibility Improvements
**Learning:** Similar to the Cart Drawer, the Admin Theme Editor lacked `aria-label`s on icon-only buttons used for reordering and deleting sections and menu links. These administrative interfaces are equally important to keep accessible for content managers relying on screen readers.
**Action:** Consistently verify that reorder arrows (up/down) and delete (trash/X) icon buttons include `aria-label`s, especially in complex list-editing interfaces like navigation menus or page builders.

## 2024-05-25 - Carousel Navigation Accessibility Improvements
**Learning:** Icon-only and indicator-dot buttons in product and hero section carousels (e.g., `ChevronLeft`, `ChevronRight`, and dot indicators) lacked `aria-label`s. Without these, screen reader users cannot perceive the navigation controls for important visual content like product images and hero slides.
**Action:** Always ensure that carousel navigation elements, including previous/next arrows and pagination dots, have descriptive `aria-label`s (e.g., "Previous slide", "Next photo", "Go to slide 2") so that the interactive components of image galleries and sliders are fully accessible.
