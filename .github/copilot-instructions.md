# Spanish Word Bank Learning Tools

## Project Architecture

This is a collection of **standalone Spanish vocabulary learning web apps** for educational use. Each folder (e.g., `estoyenfermo/`, `lafamilia/`, `spanish1comoereswordbank1/`) represents a **self-contained module** with its own wordlist and identical UI/timer functionality.

### Module Structure (Replicated Pattern)
Each module follows this exact structure:
- `index.html` - Basic HTML shell, loads external scripts
- `words.js` - Spanish vocabulary array exported as `const words`
- `script.js` - Shared timer/reveal logic (169 lines, functionally identical across modules)
- `styles.css` - Purple gradient theme with grid layout

## Critical Implementation Details

### Multi-Tab Timer Synchronization
The timer system uses `localStorage` to sync state across browser tabs:
```javascript
const TIMER_KEY = 'timerEndTime_<moduleName>';  // Unique per module
const TIMER_ACTIVE_KEY = 'timerActive_<moduleName>';
```

**Key Pattern**: Each module uses **unique localStorage keys** to prevent cross-module interference. When creating new modules, the timer keys MUST include the module name suffix.

### Word Display Behavior
- Words are **shuffled on page load** using Fisher-Yates algorithm
- Click any word to toggle strikethrough (no persistence)
- Grid layout auto-adjusts: `grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))`

### Timer Reset Mechanism
Reset via URL parameter: `?reset=true` clears localStorage and redirects to clean URL.

## Creating New Modules

1. **Copy** an existing module folder (e.g., `spanish1comoereswordbank1/`)
2. **Update** `words.js` with new vocabulary
3. **Modify** `script.js` timer keys (lines 18-19):
   ```javascript
   const TIMER_KEY = 'timerEndTime_<newModuleName>';
   const TIMER_ACTIVE_KEY = 'timerActive_<newModuleName>';
   ```
4. **Optional**: Update `index.html` title and `styles.css` gradient colors

## Code Conventions

- **No build process** - plain HTML/CSS/JS files opened directly in browser
- **No external dependencies** - vanilla JavaScript only
- **No translation** - `<meta name="google" content="notranslate">` prevents auto-translation
- **Color scheme**: Purple gradient (`#7b2cbf` to `#9d4edd`) is standard across modules
- **Timer duration**: Fixed at 300 seconds (5 minutes) - defined in `getSharedTimerState()`

## Testing/Development

- Open `index.html` directly in browser (no server required)
- Test multi-tab sync: Open same module in 2+ tabs, verify timer syncs
- Test module isolation: Run different modules simultaneously, verify timers don't interfere
- Reset test: Append `?reset=true` to URL

## Non-Standard Files

- `rgb_text_demo.html` - Unrelated RGB animation demo, not part of wordbank system
- `spanish1lapersonalidad/` - **Missing `index.html`** (likely incomplete module)
