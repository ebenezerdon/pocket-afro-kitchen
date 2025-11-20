# Pocket Afro Kitchen

Pocket Afro Kitchen is a lightweight, beautiful web app that suggests African recipes from your pantry and builds a smart shopping list. It focuses on Nigerian dishes first while letting you choose other countries for native recipe suggestions. Built by [Teda.dev](https://teda.dev), the AI app builder for everyday problems.

## Features
- Add pantry items and get the best matching recipes
- Generate a Nigerian dish instantly
- Choose a country and get a native recipe based on your ingredients
- Automatic shopping list that subtracts what you already have
- Mark items purchased, copy list to clipboard, and persistence via localStorage
- Fully responsive UI with smooth CSS animations

## Tech Stack
- HTML5 + Tailwind CSS (Play CDN)
- jQuery 3.7.x for interactions
- Modular JavaScript in `scripts/`
- No external animations or frameworks

## Files
- index.html: Landing page
- app.html: Main application interface
- styles/main.css: Custom styles and animations
- scripts/helpers.js: Utilities, storage, and recipe data
- scripts/ui.js: UI logic, rendering, and event handlers
- scripts/main.js: App bootstrap and safety checks
- assets/logo.svg: App logo

## Getting Started
1. Download the project and open `index.html` in your browser.
2. Click Launch app to start using the pantry, recipe, and list tools.

No build step is required.

## Accessibility
- Keyboard navigable controls
- High-contrast buttons
- Respects prefers-reduced-motion via subtle animations

## Notes
- All data is stored locally in your browser. Clear site data to reset.
