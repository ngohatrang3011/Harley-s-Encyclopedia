# Polymath

A personal learning diary built on **keywords**. Write down what you learn and what you wonder about, day by day, and file each entry under one or more keywords. The keywords are the points on your map, and entries they share draw the lines between them.

## Run it

No build step. The only dependency is supabase-js, loaded from a CDN for sign-in and sync. Open `index.html` in a browser, or serve the folder:

```sh
npx serve .        # or: python -m http.server
```

## The model

- **Keyword**: a node on your map, such as *Memory*, *Rust* or *Sleep*. It can have a short description.
- **Entry**: a **note** (something you learned) or a **question** (something you're wondering about), written as plain text. An entry lives inside one or more keywords.
- **Connection**: an entry filed under *Sleep* and *Memory* connects those two keywords, and more shared entries make a thicker line. You can also relate two keywords directly, without an entry.

## Writing
- Type in the box, then add keywords with the picker, or just write `#memory` in your text. Hyphens work for multi-word keywords: `#spaced-repetition` files under *Spaced repetition*.
- **Suggested** keywords appear as you type. They are based on mentions of existing keyword names and on words shared with each keyword's entries.
- Entries without a keyword are fine. They're listed under *No keyword yet* so you can sort them later.
- **Answer** a question inline. The answer note inherits the question's keywords, links back to it, and marks it answered.
- Edit or delete any entry in place. Drafts in the journal box autosave.

## Views
- **Journal**: quick capture, plus a day-by-day feed you can filter by kind and text. The sidebar has an activity heatmap and streak, open questions, unsorted entries, top keywords, a daily *Revisit* suggestion, and backup.
- **Map**: keywords only. Bigger nodes have more entries, thicker lines mean more shared entries, a dashed amber ring marks open questions, and colors show connected clusters. You can highlight open questions, recent activity or unconnected keywords.
- **Keyword page**: everything filed under the keyword (all, questions or notes), a box to add straight into it, connected keywords with shared counts, *relate to…*, *might be related* suggestions, and a neighborhood graph. You can also rename or describe it, merge it into another keyword (for example *ML* into *Machine learning*), or delete it. Deleting a keyword keeps its entries.
- **Keywords**: all keywords, which you can sort, filter and create.

## Keyboard
| Key | Action |
| --- | --- |
| `/` or `Ctrl/⌘ + K` | Search keywords and entries, or save a quick note or question from the search box (with `#keywords`) |
| `n` | Jump to the writing box |
| `Ctrl/⌘ + Enter` | Save |

Text supports paragraphs, `- lists`, `> quotes`, `**bold**`, `*italic*`, `` `code` ``, links and `#keywords`.

## Your data
Without an account, everything is stored in your browser's `localStorage`, on this device and in this browser only. Use **Export** in the journal sidebar for a JSON backup, and **Import** to restore or merge one. When an entry exists on both sides, the newer version wins. Data from the earlier entries-and-links version is converted automatically: topics and tags become keywords, notes and questions become entries. The original is kept under the `polymath:v1:backup-before-keywords` key.

### Accounts and sync (Supabase)
Sign in with the cloud button in the header to back up the diary and use it on every device. Sign-in is by email: a link, or a code typed into the app. What syncs: keywords and entries. The theme and unsent drafts stay on each device.

- **First sign-in** adds whatever is already in the browser to the account. If both copies have the same record, the newer one wins.
- **Edits** are queued and pushed a moment after each save. Other devices pick them up when they open, regain focus, come back online, or once a minute.
- **Offline** edits wait in the queue and sync when the connection returns. The sidebar shows how many are waiting.
- **Conflicts**: the most recent edit to a record wins. Keywords with the same name created on two devices are merged automatically.
- **Signing out** clears this browser's copy. The diary stays in the account.

How it works: each record is one row in the `records` table ([supabase/schema.sql](supabase/schema.sql)), protected by row-level security so people can only reach their own rows. Deletions are stored as tombstones so other devices see them. [sync.js](sync.js) holds the sync engine and the sign-in dialog.

If `config.js` has no Supabase values, the app runs in local-only mode with no sign-in button.

#### Setting up Supabase
1. **Create the table.** In the Supabase dashboard, open *SQL Editor → New query*, paste [supabase/schema.sql](supabase/schema.sql), and click *Run*.
2. **Connect the app.** Under *Project Settings → API*, copy the project URL and the publishable (or `anon`) key into [config.js](config.js). Never use the `service_role` or secret key here.
3. **Allow your site's URLs.** Under *Authentication → URL Configuration*, set *Site URL* to your live site (for example `https://your-site.netlify.app`). Under *Redirect URLs*, add that URL plus any local addresses you test on, such as `http://localhost:3000`.
4. **Let users sign in with a code too (recommended).** Under *Authentication → Emails → Magic Link*, add `{{ .Token }}` to the template, for example `Or enter this code: {{ .Token }}`. The code works when someone opens the email on a different device from the one they're signing in on.
5. **Set up email for real users.** Supabase's built-in email only sends to your own team's addresses and has a low hourly limit. Before launch, connect an email provider (such as Resend, Postmark, SendGrid or Amazon SES) under *Authentication → Emails → SMTP Settings*.

## Files
| File | Purpose |
| --- | --- |
| `app.js` | Keywords, entries, suggestions, routing and all views |
| `sync.js` | Supabase sign-in and cloud sync |
| `config.js` | Supabase project URL and publishable key (empty = local-only) |
| `supabase/schema.sql` | Database table, security policies and the newest-wins trigger |
| `netlify.toml` | Netlify publish settings and security headers |
| `graph.js` | Dependency-free canvas force graph (weighted links, rendering, input) |
| `styles.css` | Theme tokens and layout (light and dark) |
