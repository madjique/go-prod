# Design System & Guidelines: Go Prod PWA

**Design Language:** "iOS 26 Futuristic" / Liquid Glassmorphism
**Target:** Responsive PWA (Mobile-first, adapting to Tablet/Desktop)

---

## 1. Core Aesthetic Principles

The application relies on a futuristic "iOS 26" liquid glass aesthetic. This requires moving away from flat, solid-color designs and adopting:
- **Translucency over Opacity:** UIs are composed of frosted glass panels floating over vibrant, dynamic, or deep mesh gradients.
- **Fluidity:** Animations should feel like liquid (using spring physics). No stiff, linear, or instant transitions.
- **Organic Shapes:** High border-radii (`rounded-2xl` to `rounded-3xl`), soft borders, and floating elements instead of edge-to-edge blocks.
- **Depth:** Creating layers using varying degrees of blur (`backdrop-blur`) and soft, colored drop shadows.

## 2. Technology Stack & Libraries

To achieve this design system within our React/Vite stack efficiently without bloating the app:

*   **Styling Engine:** **Tailwind CSS** (Already integrated). We will use native Tailwind `backdrop-blur-*` utilities. This is preferred over rigid external component libraries to maintain absolute control.
*   **Animations (Liquid Feel):** **Framer Motion**. *Highly recommended* for the spring-based, fluid liquid animations, gesture handling (swipe/drag), and seamless page transitions.
*   **Optional UI Boilerplate:** **glasscn-ui** (A glassmorphic variant of shadcn/ui). You can copy-paste components from here to get a head start on glass UI elements.
*   **Utility:** `clsx` + `tailwind-merge` (Standard for composing tailwind classes cleanly).

## 3. Typography

To match the Apple ecosystem while remaining web-safe and modern:
*   **Primary Font:** **SF Pro Display** (Native to Apple devices).
*   **Web Fallback:** **Inter** (Clean, legible) or **Outfit / Plus Jakarta Sans** (Slightly softer, more geometric and futuristic).

**Responsive Scale Requirements:**
*   **H1 (Titles):** `text-3xl` (Mobile) -> `text-4xl` (Tablet/Desktop) | *Weight: Bold (700)*
*   **H2 (Section headers):** `text-xl` (Mobile) -> `text-2xl` (Desktop) | *Weight: SemiBold (600)*
*   **Body:** `text-base` (16px) to prevent iOS auto-zoom on inputs.
*   **Caption/Labels:** `text-sm` or `text-xs` | *Weight: Medium (500) with opacity (`text-primary/70`)*

## 4. Color System

The "Liquid Glass" effect requires the background to be colorful enough to show the blur effect. We use a base mesh/gradient background, with UI elements acting as frosted glass overlays.

### Dark Mode (Default & Premium)
*   **App Background:** Deep Midnight Mesh Gradient (e.g., `#0f172a` mixed with deep purples `#3b0764` and blues `#172554`).
*   **Glass Surface (Cards/Nav):** `bg-white/5` or `bg-slate-900/40`
*   **Glass Border:** `border border-white/10` (Crucial for the glass edge highlight).
*   **Text Primary:** `text-white`
*   **Text Secondary:** `text-white/60`
*   **Primary Accent:** Vibrant Green (`#00D378`) - Defined as `primary` in `theme.ts` and `index.css`. Used for primary actions.
*   **Secondary Accent:** Electric Blue (`#14C8FF`) - Defined as `secondary`. Used for highlights.
*   **Aesthetic:** Neon glow effects and adaptive text (White in light mode, Dark in dark mode for primary buttons).

### Light Mode (Clean & Frosted)
*   **App Background:** Soft Pastel Mesh Gradient (e.g., `#f8fafc` mixed with soft pinks `#fce7f3` and blues `#e0f2fe`).
*   **Glass Surface (Cards/Nav):** `bg-white/40` or `bg-white/60`
*   **Glass Border:** `border border-white/50` (Solid white translucent borders make it pop).
*   **Text Primary:** `text-slate-900`
*   **Text Secondary:** `text-slate-600`
*   **Accent (Buttons/Active state):** Deep Blue (`#2563eb`) or Violet (`#7c3aed`).

## 5. The "Liquid Glass" Component Blueprint

Do not use solid background colors for cards or containers. Use this baseline Tailwind + Framer Motion pattern:

```tsx
// Base Glass Card Component
<motion.div 
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: "spring", stiffness: 400, damping: 30 }}
  className="bg-white/10 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl p-6 shadow-xl shadow-black/5"
>
  {/* Content goes here */}
</motion.div>
```

## 6. Responsive PWA Requirements

### Mobile (Phone) - *Primary Target*
*   **Navigation:** Floating bottom navigation bar (Glassmorphic pill shape) positioned slightly above the bottom edge (`bottom-6`, `inset-x-4`). Do not use edge-to-edge bottom bars.
*   **Touch Targets:** Minimum **44x44px** for all interactable elements (buttons, inputs) per iOS Human Interface Guidelines.
*   **Layout:** Single column, full width with `px-4` or `px-6` padding.
*   **Modals:** Use bottom sheets (Framer Motion drag-to-dismiss `drag="y"`) instead of center modals.

### Tablet
*   **Navigation:** Expanded bottom navigation or a compact, floating left sidebar.
*   **Layout:** Two-column grid (e.g., Dashboard summary on left, recent transactions on right).
*   **Modals:** Center-aligned glass modals.

### Desktop
*   **Navigation:** Persistent left-side glass sidebar.
*   **Layout:** Multi-column masonry or grid layouts (`grid-cols-3` or `grid-cols-4`). Max-width containers (`max-w-7xl`) to prevent excessive stretching.
*   **Interactivity:** Desktop MUST utilize mouse-tracking hover effects (e.g., subtle spotlight gradients following the cursor over glass cards).
