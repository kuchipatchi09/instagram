# Quietgram

An independent, minimalist Instagram Stories & DM experiment for iPad/iPhone browsers.

## Current project: Quietgram Remote (full-stack prototype)

**Project homepage:** https://kuchipatchi09.github.io/instagram/  
**Full-stack source:** [remote/server.js](remote/server.js) + [remote/public/app.html](remote/public/app.html)  
**Deployment guide:** [REMOTE-README.md](REMOTE-README.md)  
**Private server deployment:** https://render.com/deploy?repo=https://github.com/kuchipatchi09/instagram

Quietgram Remote runs a real Instagram website in an ephemeral server-side Chromium browser and streams its screen to a private web app. It provides navigation buttons for real Stories and DMs, best-effort feed/Reels hiding, and a typing/touch relay.

**This is experimental, not verified against a real Instagram login.** Instagram may block automated browser sessions and restrict accounts. The server operator can technically access credentials and sessions. Use only a trusted private deployment and a private access code. Never commit Instagram passwords, cookies, tokens or your Quietgram access code.

GitHub Pages does **not** host the remote browser; it hosts the homepage and deployment launcher. You must deploy the server yourself. The Render plan in `render.yaml` is a paid 2 GB instance; review costs before approving deployment.

## Other optional mode

The original browser-only bookmarklet and Safari Userscripts version remain in this repository:
- [Bookmarklet setup](setup.html), code [Quietgram.bookmarklet.js](Quietgram.bookmarklet.js)
- [Safari Userscripts mode](Quietgram.user.js)
- [Static design preview](preview.html)

These modify the official `instagram.com` page locally rather than hosting Instagram content on another domain.

## Validation

Code syntax and original URL rules have passed checks. The GitHub Pages workflow has completed, but full remote authentication, touch interactions, account restrictions and Stories/DM usability require a live private server and an account to test.

This unofficial project is not affiliated with Meta or Instagram.
