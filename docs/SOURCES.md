# Sources

Verified list for the pipeline (SPEC.md section 4). Checked 2026-10-17 by the analyst.

## How this was checked, and what is still open

- Checked through web search: publisher help pages, feed directories (Feeder, FeedSpot, IPTC metawatch) and developer docs.
- **Direct HTTP probes from the sandbox were all blocked by the proxy** (status 000 for every URL). So no feed URL below has been fetched by us yet. Status column says how strong the evidence is.
- **Required before go-live:** the first pipeline dry run in GitHub Actions must fetch every feed in `sources.yml`, log HTTP status, item count and newest item date, and drop any feed that fails or is stale (newest item older than 7 days). Tester owns this check.
- **robots.txt was not read for any site.** The pipeline must check robots.txt at runtime (Python `urllib.robotparser`) before each article fetch, send an honest User-Agent with the repo URL, and skip the article if disallowed. Max 1 request per host per 2 s.

## Table

Verdicts: **use** = poll the feed and fetch article pages for quote matching. **link-only** = never fetched; only counted as a source when its URL reaches us (e.g. via Google News) and is stored as a link. **skip** = not used at all.

| Source | Feed / API | Evidence | Automated access | Paywall | Independence | Verdict |
|---|---|---|---|---|---|---|
| Reuters | None. Public RSS ended June 2020 | Strong (several independent reports) | No feed; site is bot-hostile | Registration wall | Wire (original reporting) | link-only |
| AP | None official. apnews.com feeds stopped working in 2024 | Strong (Feeder, Oct 2026) | No feed | Free to read | Wire (original reporting) | link-only |
| BBC News | `https://feeds.bbci.co.uk/news/world/rss.xml` (also `/news/world/europe/rss.xml`) | Strong (directory checked Sept 2026; BBC RSS terms historically allow reuse with attribution) | RSS offered for reuse with attribution | Free (UK); some regions show ads | Independent | use |
| The Guardian | RSS `https://www.theguardian.com/world/ukraine/rss`; Content API `https://content.guardianapis.com/search` | Medium. API limits per third-party docs: free developer key, about 5,000 calls/day, 12/s, non-commercial | API built for automated use; key required (GitHub Actions secret `GUARDIAN_API_KEY`) | Free | Independent | use (API preferred: `show-fields=body` gives text without scraping the page; text is matched in memory, never stored) |
| Politico | `https://rss.politico.com/politics-news.xml` | Weak (directories list `politico.com/rss/`; exact URL unverified) | RSS offered | Free; Politico Pro is paywalled | Independent | use, if dry run passes |
| CNN | `rss.cnn.com/...` | Strong: feeds still load but no new items since 2023–2024 | Feeds dead | Partly metered | Independent | link-only |
| NPR | `https://feeds.npr.org/1014/rss.xml` (Politics) | Medium (directories) | RSS offered | Free | Independent; often runs AP copy | use (watch for AP byline) |
| Al Jazeera English | `https://www.aljazeera.com/xml/rss/all.xml` | Medium (directories) | RSS offered | Free | Independent | use |
| Kyiv Independent | `https://kyivindependent.com/news-archive/rss/` | Medium (IPTC metawatch + FeedSpot) | RSS offered | Free (membership model, no hard wall) | Independent | use |
| Ukrainska Pravda EN | Listed on `https://www.pravda.com.ua/eng/rss-info/`; likely `https://www.pravda.com.ua/eng/rss/` | Medium for the page, weak for the exact URL | RSS offered (all / news / top news / publications) | Free | Independent | use, if dry run passes |
| Ukrinform EN | Likely `https://www.ukrinform.net/rss/block-lastnews` | Weak (FeedSpot lists `ukrinform.net/rss/` topic feeds; exact URL unverified) | RSS offered | Free | State news agency; mostly re-reports others on US topics | use, if dry run passes; low weight |
| Kyiv Post | `https://www.kyivpost.com/feed` (unverified) | Weak | Unknown | Partial paywall | Independent | link-only |
| whitehouse.gov remarks / briefings | Pages `https://www.whitehouse.gov/remarks/`, `/briefings-statements/`. WordPress feed `https://www.whitehouse.gov/remarks/feed/` unverified; Feeder could not read the old `/briefing-room/.../feed/` after 20 Jan 2025 | Weak for the feed | US government work, public domain | Free | **Primary source** | use, if a feed works; otherwise poll the listing page at most every 30 min |
| Google News RSS search | `https://news.google.com/rss/search?q=Trump+Ukraine&hl=en-US&gl=US&ceid=US:en` (also `Trump+Zelensky`, `Trump+Putin`) | Strong that it works; terms not confirmed | Keyless, widely used; Google asks for attribution, non-commercial use | n/a (headlines + links) | Aggregator: each item belongs to its own outlet | use for **discovery only** (see notes) |
| Roll Call Factba.se | `https://rollcall.com/factbase/trump/...` (transcripts, calendar) | Medium that it exists; no API docs or automated-access terms found | Not stated: treat as not allowed | Free to read | Transcripts are near-primary | skip for automation; manual link-only |

## Notes

- **Wire copy is the main independence trap.** NPR, Al Jazeera, Politico, Ukrinform and many others run AP or Reuters copy. Two outlets carrying the same AP story are one source, not two. Rule for coder: if the fetched page has a wire byline or credit (`Associated Press`, `(AP)`, `Reuters`, `AFP`), its independence group becomes that wire (`ap`, `reuters`, `afp`), not the outlet.
- **Google News** gives Reuters, AP, CNN and Politico coverage without fetching those sites. Use the item's `<source url>` to set its outlet and independence group. Fetch the target page only if that outlet is a `use` source in `sources.yml`; otherwise store the link only. Google News item links are redirect URLs; store the resolved outlet URL if it is cheap to get, else the Google link. If the UI lists Google News items, credit "via Google News".
- **Primary sources** (whitehouse.gov) count as full corroboration on their own (SPEC 5). A whitehouse.gov transcript plus one outlet is the strongest case.
- **Article text is never stored.** Fetched HTML or API body is held in memory only for verbatim matching, then dropped.
- **Paywalled or bot-hostile sites** (Reuters, Kyiv Post) are never fetched, only linked.
- **Ukrainian-language feeds** (Suspilne, UP Ukrainian) are left out of MVP: verbatim matching works on English quotes, and Ukrainian outlets translate them.

## White House public schedule (for the 🎤 "At the microphone" state)

- **No machine-readable official schedule found.** Obama's White House published the daily schedule via RSS and iCal (2010); no evidence the current site does.
- Roll Call Factba.se has a calendar page (`rollcall.com/factbase/trump/calendar`) and once offered JSON/CSV/iCal, but no current endpoint or terms were found, and the October 2026 page showed "No calendar data available".
- **Verdict:** per the decision of 2026-10-17, 🎤 is **not in MVP**. Open question for Kondrat later: drop it, or set it by hand.

## Recommended starter set

1. BBC News World (RSS)
2. The Guardian Content API (query `Trump AND (Ukraine OR Zelensky OR Putin)`)
3. NPR Politics (RSS)
4. Al Jazeera English (RSS)
5. Kyiv Independent (RSS)
6. Ukrainska Pravda EN (RSS)
7. Politico politics news (RSS)
8. Ukrinform EN (RSS, low weight)
9. whitehouse.gov remarks (primary)
10. Google News RSS search, 3 queries (discovery only)

## For `pipeline/sources.yml`

URLs marked `verify: true` must pass the first dry run before they count.

```yaml
sources:
  - name: BBC News World
    url: https://feeds.bbci.co.uk/news/world/rss.xml
    type: rss
    independence_group: bbc
    primary: false
    verify: false
  - name: The Guardian
    url: https://content.guardianapis.com/search?q=Trump%20AND%20(Ukraine%20OR%20Zelensky%20OR%20Putin)&show-fields=body&order-by=newest&page-size=50
    type: api
    independence_group: guardian
    primary: false
    verify: false
    api_key_env: GUARDIAN_API_KEY
  - name: NPR Politics
    url: https://feeds.npr.org/1014/rss.xml
    type: rss
    independence_group: npr
    primary: false
    verify: true
  - name: Al Jazeera English
    url: https://www.aljazeera.com/xml/rss/all.xml
    type: rss
    independence_group: aljazeera
    primary: false
    verify: true
  - name: Kyiv Independent
    url: https://kyivindependent.com/news-archive/rss/
    type: rss
    independence_group: kyivindependent
    primary: false
    verify: true
  - name: Ukrainska Pravda EN
    url: https://www.pravda.com.ua/eng/rss/
    type: rss
    independence_group: pravda
    primary: false
    verify: true
  - name: Politico
    url: https://rss.politico.com/politics-news.xml
    type: rss
    independence_group: politico
    primary: false
    verify: true
  - name: Ukrinform EN
    url: https://www.ukrinform.net/rss/block-lastnews
    type: rss
    independence_group: ukrinform
    primary: false
    verify: true
  - name: White House remarks
    url: https://www.whitehouse.gov/remarks/feed/
    type: rss
    independence_group: whitehouse
    primary: true
    verify: true
  - name: Google News - Trump Ukraine
    url: https://news.google.com/rss/search?q=Trump+Ukraine&hl=en-US&gl=US&ceid=US:en
    type: rss
    independence_group: per_item   # take outlet from <source url>; discovery only
    primary: false
    verify: false
  - name: Google News - Trump Zelensky
    url: https://news.google.com/rss/search?q=Trump+Zelensky&hl=en-US&gl=US&ceid=US:en
    type: rss
    independence_group: per_item
    primary: false
    verify: false
  - name: Google News - Trump Putin
    url: https://news.google.com/rss/search?q=Trump+Putin&hl=en-US&gl=US&ceid=US:en
    type: rss
    independence_group: per_item
    primary: false
    verify: false

# Never fetched; only stored as links when they reach us via Google News.
link_only_domains:
  - reuters.com      # group: reuters
  - apnews.com       # group: ap
  - cnn.com          # group: cnn
  - kyivpost.com     # group: kyivpost
  - rollcall.com     # group: factbase

# Wire bylines that override the outlet's independence group.
wire_markers:
  ap: ["Associated Press", "(AP)"]
  reuters: ["Reuters"]
  afp: ["AFP", "Agence France-Presse"]
```
