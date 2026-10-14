# JBD Collab Booth: setup guide

This takes you from zero to a working booth. Plan on about an hour. Do it at least a few days before Hall of Flowers, so you have time to run the full flow against a **test** Instagram account.

> Meta renames menus often. If a button below isn't where this guide says, look for the closest match. The underlying steps stay the same.

---

## 0. What you need

- The real Instagram account (`@jeromebakerdesigns`), plus a **second, throwaway Instagram account** for testing
- A Facebook Page for each account. A brand-new page works fine for the test account.
- Admin access to that Facebook Page (and to the Meta Business portfolio, if the Page lives in one)
- A Meta developer account: <https://developers.facebook.com>, signed in with the same Facebook login that manages the Page
- An Anthropic API key from <https://console.anthropic.com>
- A Railway account: <https://railway.com>

---

## 1. Make the Instagram account a Business (or Creator) account

The publishing API only works with professional accounts. **Business** is the recommended type.

1. In the Instagram app, open your profile, then **☰ → Settings and activity → Account type and tools → Switch to professional account**.
2. Pick a category (e.g. *Art*), then choose **Business**.
3. Make sure the account is **public**.

Repeat for the test account.

## 2. Link the Instagram account to a Facebook Page

1. In the Instagram app: **Edit profile → Page** (under *Public business information*) **→ Connect or create**, and choose your Facebook Page.
   - Or from Facebook: **Page → Settings → Linked accounts → Instagram → Connect account**.
2. Confirm the link: in Meta Business Suite (<https://business.facebook.com>), the Page should show the Instagram account as connected.

Repeat for the test account and its own test Page.

## 3. Create the Meta developer app

1. Go to <https://developers.facebook.com/apps> and click **Create app**.
2. Name it something like `JBD Collab Booth`, and use the same contact email you use for Meta.
3. For the use case, pick **Other**, then app type **Business**. If you're offered a "Manage messaging & content on Instagram" use case for the *Facebook Login* flavor, that works too. Don't pick the "Instagram Login" variant: this app talks to `graph.facebook.com` through your Page.
4. If you're asked to connect a Business portfolio, pick the one that owns the Page (or skip it if the Page isn't in one).
5. In the app dashboard, add the **Instagram** product (Instagram Graph API) and **Facebook Login for Business**.
6. Under **App settings → Basic**, note the **App ID** and **App Secret**. You'll need them for the token exchange, and optionally as `META_APP_ID` / `META_APP_SECRET` so `/admin` can show when the token expires.

**Leave the app in Development mode.** We only post to accounts we own, so we don't need App Review. In Development mode, anyone with a role on the app (Admin / Developer / Tester) can grant every permission to their own Pages and Instagram accounts. Make sure the person generating tokens is an **app Admin**: **App roles → Roles**.

## 4. Get the permissions: `instagram_basic` + `instagram_content_publish`

You grant these when you generate the token in Graph API Explorer:

1. Open <https://developers.facebook.com/tools/explorer>.
2. Top right: select **your app** under *Meta App*. Under *User or Page*, choose **Get User Access Token**.
3. Under **Permissions**, add all of these:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
   - `business_management` (only needed if the Page belongs to a Business portfolio, but harmless otherwise)
4. Click **Generate Access Token**. In the Facebook pop-up, choose **the Page and the Instagram account** (check both, and include the test ones). Approve.

You now have a **short-lived user token** (about 1 hour). Copy it.

## 5. Make it a long-lived token

Exchange the short-lived token for a 60-day token. Paste this into a browser (replace the three values):

```
https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_LIVED_TOKEN
```

The response contains `access_token`: that's your **long-lived user token** (≈60 days).

**Recommended: get a Page token that never expires.** Using the long-lived user token:

```
https://graph.facebook.com/v24.0/me/accounts?access_token=LONG_LIVED_USER_TOKEN
```

Each Page in the list has its own `access_token`. A Page token derived from a long-lived user token **doesn't expire**, and it can post for that Page's linked Instagram account. Use the Page token for `IG_ACCESS_TOKEN`.

Paste the token into the Access Token Debugger (<https://developers.facebook.com/tools/debug/accesstoken>) to confirm it's valid, shows **Expires: Never** (or about 60 days for a user token), and lists the scopes from step 4.

> Tokens break if you change your Facebook password, remove the app, or lose admin on the Page. The **Status** tab in `/admin` checks the token. Check it the morning of the show.

## 6. Find `IG_USER_ID`

Note: `IG_USER_ID` is **not** your Instagram username, and not the Facebook Page ID.

1. From the `/me/accounts` response above, note the Page's `id`.
2. Then open:

```
https://graph.facebook.com/v24.0/PAGE_ID?fields=instagram_business_account{id,username}&access_token=TOKEN
```

The returned `instagram_business_account.id` (a long number, often starting `1784…`) is `IG_USER_ID`. Check that the `username` is the account you expect.

Repeat steps 4–6 for the test account to get `IG_TEST_USER_ID` and `IG_TEST_ACCESS_TOKEN`. If both Pages were selected in step 4, the same user token covers both, and each Page has its own Page token.

---

## 7. Deploy to Railway

1. Push this repo to GitHub, then in Railway click **New Project → Deploy from GitHub repo** and choose it.
2. **Settings → Source → Root Directory** = `collab-booth` (or leave it blank if the app lives at the repo root).
   Railway reads `railway.json`: it builds with `npm run build` and starts with `npm start`, and the health check is `/api/health`.
3. **Add a Volume** (right-click the service → *Attach volume*). Mount path: `/data`. Photos, the session log, settings and the uploaded frame live here, so they survive redeploys.
4. **Settings → Networking → Generate Domain.** Copy the URL, e.g. `https://jbd-collab-booth.up.railway.app`.
5. **Variables.** Add:

| Variable | Value |
| --- | --- |
| `IG_USER_ID` | from step 6 |
| `IG_ACCESS_TOKEN` | Page token (or long-lived user token) from step 5 |
| `IG_TEST_USER_ID` | the test account's id |
| `IG_TEST_ACCESS_TOKEN` | the test account's token |
| `ANTHROPIC_API_KEY` | your Anthropic key |
| `CAPTION_MODEL` | `claude-haiku-5-5` (the default; change it here to try another model) |
| `ADMIN_PIN` | a PIN for `/admin` (6+ digits) |
| `PUBLIC_BASE_URL` | the Railway URL from step 4, **https, no trailing slash** |
| `GRAPH_API_VERSION` | `v24.0`, or the current version from <https://developers.facebook.com/docs/graph-api/changelog> |
| `DATA_DIR` | `/data` |
| `META_APP_ID`, `META_APP_SECRET` | optional: lets `/admin` show token expiry |

Railway redeploys automatically when you save variables. When it's done, open `https://YOUR-URL/admin`, enter the PIN, and go to **Status → Run health check**. Everything should be green.

> `PUBLIC_BASE_URL` matters: Instagram downloads each photo from `PUBLIC_BASE_URL/media/<id>.jpg`, so it must be the public https address.

---

## 8. Test mode: rehearse the whole flow before the show

1. In `/admin → Settings`, turn on **Test mode** and click **Save**. The kiosk shows a pink **TEST MODE** bar, and every post goes to `IG_TEST_USER_ID` instead of the real account.
2. On the iPad, run the full guest flow. For the handle, use a **public personal account** you control (not the test account itself), so you can see the collab invite arrive.
3. Check:
   - The post appears on the test account with the right caption: AI line with `@handle`, then the 📍 line and hashtags.
   - The guest account gets the **collab invite** in Instagram (activity / DMs). Accept it, and the post shows on that profile too.
   - Enter a **private** or nonexistent handle. The post should still publish (without a collaborator), the guest screen should say the invite couldn't be sent, and the Log should show "no collab".
   - Turn on **Approval mode**, take a photo, then approve it from your phone at `/admin → Queue` (edit the caption first to check that edits stick). Reject one too.
   - **Settings → AI captions → Test on last photo** returns a caption. Toggle AI off, and posts fall back to the template.
   - Turn the iPad's wifi off, post, then turn it back on. The post should upload by itself within about 15 seconds. The attract screen shows "N waiting for wifi" while it waits.
   - **Log → Export CSV** downloads every session.
4. When you're happy, turn **Test mode off** and **Save**. Delete the test posts from the test account if you like.

There's also a fully offline **dry run**: if the IG variables are empty (or `DRY_RUN=1`), the app never calls Instagram. It fakes a successful post, which is handy for local development and kiosk dry runs.

**Publishing limit:** Instagram caps API posts per account per rolling 24 hours (currently 100). The admin header shows how many remain. When only the **buffer** is left (default 5, set in Settings), new posts are **held** instead of failing. They wait in the Queue, where you can post them later or force them through.

---

## 9. iPad kiosk setup

1. Open the Railway URL in **Safari**, then **Share → Add to Home Screen**. Launch it from the home-screen icon, which runs it fullscreen.
2. Allow camera access when prompted. If you ever denied it: **Settings → Apps → Safari → Camera → Allow** (on older iPadOS, **Settings → Safari → Camera**).
3. **Settings → Display & Brightness → Auto-Lock → Never.** Keep the iPad plugged in, and keep **Low Power Mode off**.
4. Turn on **Guided Access**: **Settings → Accessibility → Guided Access → On**, then set a passcode. Open the booth app and **triple-click** the top or side button to start it. Triple-click again and enter the passcode to exit.
5. Staff can open `https://YOUR-URL/admin` on a **phone** to approve posts, watch the log, and change settings live. The kiosk picks up changes within a minute, or at the next guest.

### Thumbs-up trigger

- The camera screen shows "👍 Give us a thumbs up to start the countdown". Holding a thumbs-up for 0.5 s fills the ring, then a 3-2-1 countdown runs and the photo is taken. The shutter button always works too.
- The gesture model is self-hosted and loads once when the app starts. If it can't load, the hint disappears and the shutter button keeps working.
- Tune it under `/admin → Settings → Thumbs-up trigger`: on/off, confidence (default 0.70), hold time, gesture countdown length, and beep sound.
- After a photo, a guest has to lower their thumb before it can trigger again, so a held thumb won't fire twice in a row.

### Frame overlay

Upload a **transparent 1080×1350 PNG** in `/admin → Settings → Camera`. Guests see it on the live preview, and it's composited into the posted photo. Until you upload one, the app uses a placeholder frame.
