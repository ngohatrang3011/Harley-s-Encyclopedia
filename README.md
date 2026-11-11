# Polymath

A personal learning diary built on **keywords**. Write down what you learn and what you wonder about, day by day, and file each entry under one or more keywords. The keywords are the points on your map, and entries they share draw the lines between them.

## Run it

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

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
- **Library**: 37 curated learning paths. Track progress on them, and use *Add as keyword* to bring one into your diary.

## Keyboard
| Key | Action |
| --- | --- |
| `/` or `Ctrl/⌘ + K` | Search keywords, entries and the library, or save a quick note or question from the search box (with `#keywords`) |
| `n` | Jump to the writing box |
| `Ctrl/⌘ + Enter` | Save |

Text supports paragraphs, `- lists`, `> quotes`, `**bold**`, `*italic*`, `` `code` ``, links and `#keywords`.

## Your data
Everything is stored in your browser's `localStorage`, on this device and in this browser only. Use **Export** in the journal sidebar for a JSON backup, and **Import** to restore or merge one. When an entry exists on both sides, the newer version wins. Data from the earlier entries-and-links version is converted automatically: topics and tags become keywords, notes and questions become entries. The original is kept under the `polymath:v1:backup-before-keywords` key.

## Files
| File | Purpose |
| --- | --- |
| `app.js` | Keywords, entries, suggestions, routing and all views |
| `graph.js` | Dependency-free canvas force graph (weighted links, rendering, input) |
| `data.js` | Curated library topics and resources |
| `styles.css` | Theme tokens and layout (light and dark) |
