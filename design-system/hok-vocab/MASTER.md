# Hok Vocabulary design system

Based on the repository's UI/UX Pro Max education/language-learning design-system search and React implementation guidance. The verified education match recommends indigo, soft depth, rounded surfaces, visible progress, and motivating feedback. This implementation adapts that guidance to an adult self-study workspace; marketing sections and child-oriented type recommendations are not used.

- Light: canvas #f7f8fc, surface #fff, ink #23243b, secondary ink #676b80, action #5146d9.
- Dark: canvas #141522, surface #1e2031, ink #f0f0fa, secondary ink #b1b4ce, highlight #aaa2ff. Filled action buttons retain white on deep indigo.
- Native system sans typography, no external font requests. Display sizes 28–43px, field text 16px on mobile, secondary text 12–14px.
- 4/8px spacing rhythm, 10px control corners, 14–20px surface corners, subtle shadows.
- Desktop sidebar above 900px; fixed four-item mobile navigation below. Content reserves bottom navigation and device safe areas.
- One consistent outline SVG family. Decorative card art is HTML/CSS and SVG. Default card cover works locally.
- Keyboard focus rings, field labels, selected navigation semantics, named flashcard controls, reduced-motion support, and keyboard-contained concept dialogs.
- Fresh installations stay empty. Onboarding actions create a real concept or word; progress reflects saved user activity.

Implementation: src/redesign.css (theme and responsive tokens), src/App.tsx (views and interactions).
