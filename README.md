# Quietgram HTML — iPad Safari edition

## What is actually functional?
- `Quietgram.user.js`: A Safari Userscripts script which runs **on instagram.com** and displays the *real, logged-in* site's Stories and DMs. It does not fetch Instagram private APIs or store your login. It hides/blocklists feed/Reels/Explore links and hides the rest of the home feed.
- `preview.html`: A self-contained **design mockup** matching the screenshot. Example friends/messages are placeholders; it cannot show actual Instagram stories/DM inside the HTML file.

## Install without a Mac (iPad)
1. Install **Userscripts** by quoid from the App Store: https://apps.apple.com/app/userscripts/id1463298887
2. Open Userscripts once and select its scripts folder. Find that folder in the Files app (often On My iPad → Userscripts).
3. Copy **Quietgram.user.js** into the folder. The filename must end with `.user.js`.
4. In Settings → Apps → Safari → Extensions (menu wording varies), enable Userscripts. Grant website permission for **instagram.com**, or follow the extension's on-screen instructions.
5. Visit `https://www.instagram.com/` in Safari, and sign in **only on Instagram's own website**.
6. Refresh. The fixed minimalist header/footer should appear on home and DM screens. On Home, the actual Instagram Story carousel is preserved when the script can locate it. If no carousel is found, a fallback appears after a few seconds instead of fictional content.
7. DM navigates to `https://www.instagram.com/direct/inbox/`. Stories uses Instagram's real home Story tray. After opening a story, native Instagram controls take over.

## Limitations / safety
- Native iPhone/iPad Instagram **app** is unaffected; this only modifies Safari's instagram.com page.
- Instagram may change the DOM and remove story links; there is no universal public endpoint for all followed accounts' story feeds. In that case the interface cannot restore missing stories, and the 'show original web' option is provided.
- The script blocks navigation, not Instagram's server, and is **not** a security boundary. Browser back navigation, other tabs, or disabling Userscripts can bypass it.
- In some versions of Instagram Web, Stories or DM options differ from the official app. Use Preview for design only.
- The script does not read passwords, cookies, messages or story media, and sends no data to third parties. Install only code you trust, as any userscript allowed on Instagram can potentially read webpage content.

## Testing
- Open a real story from a native story circle; verify the story viewer controls still work.
- Open DM and send a test message.
- Tap a Reels or post link: it should be blocked.
- If real story icons do not appear, first turn off the script and confirm whether the native Instagram web homepage shows them. If not, CSS/JS cannot recreate them without access to private Instagram APIs.
