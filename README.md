# One Another's Burdens

A twelve week gospel companion for anyone who loves someone who is suffering. It keeps the twelve principles and scriptures of the Church's *Support Guide: Help for Spouses and Family of Those in Recovery* and rewrites everything around them to cover any affliction: illness, disability, mental illness, addiction, aging, grief, and a loved one's hard choices. The format follows *The Other Toolbox*.

An independent study guide. Not an official publication of The Church of Jesus Christ of Latter-day Saints.

## Files

- `one-anothers-burdens.md` is the full guide (built from the parts in `content/`).
- `scripts/build.mjs` builds the PDF, Word and Markdown downloads and the website into `public/`.
- `research/verify.py` checks every general conference quote word for word against the talk text, and checks every talk link.

```sh
cat content/*.md > one-anothers-burdens.md
npm install
node scripts/build.mjs
```
