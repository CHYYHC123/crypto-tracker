# Crypto Tracker

Real-time crypto price tracker with floating widgets.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Open Chrome and navigate to `chrome://extensions/`, enable "Developer mode", and load the unpacked extension from the `dist` directory.

4. Build for production:

```bash
npm run build
```

## Project Structure

- `src/background/` - background.js
- `src/popup/` - Extension popup UI
- `src/content/` - Content scripts
- `manifest.config.ts` - Chrome extension manifest configuration

## Chrome Extension Development Notes

- Use `manifest.config.ts` to configure your extension
- The CRXJS plugin automatically handles manifest generation
- Content scripts should be placed in `src/content/`
- Popup UI should be placed in `src/popup/`
