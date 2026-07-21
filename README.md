# ProjectAbide Chrome Extension

A serene, scripture-centered Chrome extension designed to help you stay focused, pause and reflect on God's Word daily, and practice intentional browsing habits.

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Technology Stack](#technology-stack)
4. [Project Directory Layout](#project-directory-layout)
5. [Getting Started & Build Guide](#getting-started--build-guide)
6. [How to Load into Google Chrome](#how-to-load-into-google-chrome)
7. [Testing & Verification Routines](#testing--verification-routines)
8. [Future Roadmap](#future-roadmap)

---

## Overview

**ProjectAbide** is built to counteract mindless, automatic tab-surfing by introducing a gentle digital pause. It is anchored on **John 15:4 (NIV)**:
> *"Remain in me, as I also remain in you. No branch can bear fruit by itself; it must remain in the vine. Neither can you bear fruit unless you remain in me."*

Rather than punishing distractions with rigid site filters, it prompts users with a 10-second breathing animation and encourages scripture reflection before giving the choice to proceed.

---

## Key Features

* **Verse of the Day**: Displayed on every new tab, centered in a gorgeous serif font. Updates automatically at midnight.
* **Intentional Website Blocker**:
  * Blocks distracting websites dynamically based on a custom list.
  * Launches the *Reflection screen* forcing a 10-second deep-breathing countdown before enabling bypass controls.
  * Allows temporary access (e.g. 10 minutes) before re-applying the block and refreshing active tabs.
* **Bible Scripture Search**: Local, offline search database of ~1,000 key scriptures categorised by topic tags (*Peace, Anxiety, Strength, Hope, Wisdom, Purpose*).
* **Prayer Journal**: Log prayer petitions, delete items, or check them off as answered to celebrate praise.
* **Habit checklist**: Daily checklists for spiritual routines (breathing, scripture reading, and Thanksgiving).
* **Visual Themes**: Integrated Light, Dark, and System theme synchronization.

---

## Technology Stack

* **Frontend Framework**: React 18 & TypeScript
* **Styling**: Vanilla CSS (Calming forest-green and warm-cream palette)
* **Build System**: Vite 5 (Configured for multi-entry points)
* **API Specifications**: Chrome Extension Manifest V3
  * `chrome.storage.sync` & `chrome.storage.local` (with automated `localStorage` fallbacks for local browser testing)
  * `chrome.declarativeNetRequest` (network redirection)
  * `chrome.alarms` (bypass restoration timers)

---

## Project Directory Layout

```text
ProjectAbide/
├── public/
│   └── manifest.json       # Chrome Manifest V3 descriptor
├── src/
│   ├── background/
│   │   └── background.ts   # Service worker handling network rules & alarms
│   ├── blocked/
│   │   ├── Blocked.tsx     # Intentional browse countdown & breathing screen
│   │   └── main.tsx
│   ├── newtab/
│   │   ├── NewTab.tsx      # Full-page new tab dashboard, search, journal
│   │   └── main.tsx
│   ├── options/
│   │   ├── Options.tsx     # Full options dashboard and settings controller
│   │   └── main.tsx
│   ├── popup/
│   │   ├── Popup.tsx       # Toolbar popup overlay toggle
│   │   └── main.tsx
│   ├── data/
│   │   ├── verses.json     # Daily verses database
│   │   └── bible_search.json # Curated scripture search list
│   ├── utils/
│   │   ├── storage.ts      # Type-safe storage wrapper with fallback
│   │   ├── bible.ts        # Local search matching engine
│   │   └── theme.ts        # Visual theme synchronization script
│   └── index.css           # Global stylesheet and tokens
├── vite.config.ts          # Bundler multi-entry configs
├── tsconfig.json           # Compiler rules
└── package.json            # Scripts & dependencies
```

---

## Getting Started & Build Guide

### 1. Install Dependencies
Run the install command in the project root:
```bash
# In standard terminals
npm install

# If PowerShell script execution policy is restricted:
cmd.exe /c "npm install"
```

### 2. Compile and Build
Compile typescript assets and bundle the distribution:
```bash
# In standard terminals
npm run build

# If PowerShell script execution policy is restricted:
cmd.exe /c "npm run build"
```

---

## How to Load into Google Chrome

1. Open Google Chrome and go to **`chrome://extensions/`**.
2. Turn on **"Developer mode"** using the switch in the top-right corner.
3. Click the **"Load unpacked"** button in the top-left corner.
4. Select the **`dist`** directory inside the project folder:
   `...\ProjectAbide\dist`
5. Click **Select Folder**. The card will load immediately.
6. (Optional) Click the puzzle piece icon on your Chrome toolbar and **pin** ProjectAbide for fast access.

---

## Testing & Verification Routines

### 1. Bible Search Engine
Open a new tab, select **Bible Search**, and type keywords like `anxiety`, `peace`, or `work` to verify match accuracy. Click **Copy** or **Bookmark** to inspect actions.

### 2. Redirection and Alarms
* Open **Settings** (gear icon) and add a site (e.g. `facebook.com`) to the blocklist.
* Navigate to `https://www.facebook.com` in a new tab.
* Confirm that you are redirected to the reflection screen and the 10-second countdown is active.
* Wait for the countdown, click **Continue anyway**, and verify that the page loads.
* Wait 10 minutes to verify the site redirects you back to the pause screen.

---

## Future Roadmap

* **Phase 2 (Database sync)**: Integrate Supabase and PostgreSQL to store bookmarks, journal entries, and reflection statistics online across multiple devices.
* **Phase 3 (AI Companionship)**: Implement localized LLM integrations to answer theology questions, summarize passages, and search verses contextually.
