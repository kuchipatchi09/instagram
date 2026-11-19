# Quietgram — Stories & DM, without the endless scroll

Quietgram is a minimalist, unofficial Instagram Web companion designed for iPad and iPhone Safari.

## Live site

Once GitHub Pages is enabled for this repository using **main / (root)**:

https://kuchipatchi09.github.io/instagram/

The landing page is `index.html`, and is installable to the Home Screen via Safari's **Share → Add to Home Screen**.

## What works

- A responsive, dark Quietgram landing page on GitHub Pages.
- Links to **Instagram's official sign-in** (`https://www.instagram.com/accounts/login/`) and real Instagram Web Stories/home and DM inbox.
- A separate `Quietgram.user.js` userscript that changes the real `instagram.com` page in Safari, hiding feed/Reels/Explore as a best-effort UI modification.
- No custom account database, credentials collection, or password form.
- App manifest and icon for home-screen use.

## Important limitation

**A standalone GitHub Pages website cannot display ordinary Instagram users' authenticated friend stories and private DMs inside its own domain.** Instagram Web cannot be embedded reliably into a third-party iframe due to browser/embed restrictions; a static site cannot read `instagram.com` cookies or private Instagram API responses. There is no generic official API for accessing arbitrary personal-account stories and DM inboxes.

The real content stays on **instagram.com**, where you sign in directly. This design intentionally avoids copying Instagram sign-in screens or collecting passwords.

The story circles and message skeletons on the landing page are **visual decoration only**, not contacts or message previews.

## iPad install — actual feed reduction

1. Install [Userscripts for Safari](https://apps.apple.com/app/userscripts/id1463298887) and choose a scripts folder.
2. Download [Quietgram.user.js](https://raw.githubusercontent.com/kuchipatchi09/instagram/main/Quietgram.user.js) and move it to that folder.
3. Turn on the Userscripts extension under iPad Settings → Apps → Safari → Extensions. Allow access to `instagram.com`.
4. Open `https://www.instagram.com/` in Safari and sign in **only on the official Instagram website**.
5. Refresh. Stories appear if Instagram Web currently provides its native story carousel and the userscript can detect it. DM opens at `/direct/inbox/`.

**This does not alter the official Instagram app.** The script is best effort and may break when the Instagram website changes. Never place passwords, login cookies or session tokens in GitHub files. Review any userscript before installing: it is powerful code running on an authenticated website.

## Repository

- `index.html` — production homepage / PWA entrypoint
- `manifest.webmanifest`, `icon.svg` — web app metadata
- `Quietgram.user.js` — Safari Instagram UI modification
- `preview.html` — original non-functional design mockup
- `test.js`, `package.json` — original script smoke tests

Quietgram is an independent personal project, not affiliated with Instagram or Meta.
