# Quietgram — Web only

Quietgram is a minimal, browser-only companion for Instagram Stories and DMs.

**Hosted site:** https://kuchipatchi09.github.io/instagram/  
**Safari bookmarklet installation:** https://kuchipatchi09.github.io/instagram/setup.html

## What it does

The GitHub Pages site is a starter page, not a clone of Instagram's authenticated inbox. To use your *real* Stories and DMs without an app or extension:

1. Open the [setup page](https://kuchipatchi09.github.io/instagram/setup.html) in Safari.
2. Bookmark the setup page, tap **Quietgram 코드 복사**, and replace your bookmark's URL with the copied `javascript:` address.
3. Sign in on [Instagram's official login](https://www.instagram.com/accounts/login/).
4. While browsing `instagram.com`, activate your Quietgram bookmark.
5. Quietgram overlays a minimal Stories/DM navigation and attempts to hide the feed, Reels, and Explore UI. This operates only in that Instagram tab. Reloading or navigating to a new page may require rerunning the bookmarklet.

You can inspect the entire script in [Quietgram.bookmarklet.js](./Quietgram.bookmarklet.js). It makes no third-party API calls and does not collect passwords, tokens, cookies or message content.

## Why can't this work fully inside quietgram.github.io?

A third-party static website cannot read personal Instagram account session cookies or fetch the complete logged-in Stories/DM experience from another origin. Embedding the actual site inside an iframe is blocked or unreliable due to security headers and browser restrictions. Meta's supported APIs do not provide arbitrary personal accounts' full friend Stories and private inboxes to third-party clients. Claiming otherwise would create a misleading or unsafe sign-in experience.

The provided solution works **on the official instagram.com website**, uses its actual account session, and does not ask the user to enter credentials on Quietgram.

## Limitations

- This does **not** modify the official Instagram iOS app.
- Stories only appear if Instagram Web provides a story carousel that the script can locate; its DOM may change.
- It is not a secure or unbypassable content filter.
- The bookmarklet is page-local and may have to be activated again.
- User scripts and bookmarklets are powerful. Read the source before running it on an authenticated webpage.
- Cross-origin rules mean real DM/story previews cannot be listed on the GitHub Pages landing screen.
- No real-device iPad Safari or Instagram account test has been completed.

## Files

- `index.html` — responsive Quietgram landing page
- `setup.html` — Safari bookmarklet copy/setup
- `Quietgram.bookmarklet.js` — page-local UI overlay on instagram.com
- `Quietgram.user.js` — older optional Safari Userscripts variant
- `manifest.webmanifest`, `icon.svg` — optional home-screen assets
- `preview.html` — static design-only mockup
- `test.js`, `package.json` — legacy userscript smoke tests

Quietgram is an independent project and is not affiliated with Meta or Instagram.
