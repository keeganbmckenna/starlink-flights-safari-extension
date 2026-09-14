// Starlink Column for Google Flights - content script.
//
// Google Flights' result list is a plain div/li layout with no real
// <table>, and its CSS class names are obfuscated and change often. The
// most stable hook Google provides is the aria-label text it generates for
// screen readers on each result row (e.g. "6:00 AM - 2:15 PM United,
// nonstop, 5 hr 30 min, JFK to LAX, ..."), so we match against that instead
// of any class name. If Google changes this pattern, the selectors below
// are the first thing to update.
//
// Placement strategy: the accessible "row" Google renders (div[role="link"],
// carrying the whole flight description in its own aria-label) is a
// transparent full-card overlay - the actual visible text (times, airline
// name, price...) lives in a separate sibling subtree that just happens to
// share the same bounding box. Overlaying an absolutely-positioned badge on
// top of that box means fighting Google's own layout (which reflows at
// different browser zoom levels as its responsive breakpoints kick in) to
// avoid covering real content. A more robust approach - used by at least one
// shipped open-source Chrome extension doing the same job - is to insert the
// badge as a genuine sibling right next to the airline name text, in normal
// document flow, so it can never overlap anything: it just becomes part of
// the layout. That only works when the airline name can be found as its own
// text node, so a small corner overlay remains as a fallback for when it
// can't (markup drift, an airline name Google renders differently, etc).

(function () {
  const DATA = window.StarlinkAirlineData;
  if (!DATA) return;

  const INLINE_CLASS = "starlink-badge--inline";
  const CORNER_CLASS = "starlink-badge--corner";
  // As of 2026-09, Google renders each result as a div[role="link"] whose own
  // aria-label carries the full flight description (airline, times, stops,
  // "Select flight"). Older markup used role="listitem" instead.
  const ROW_SELECTOR = 'div[role="link"], li[role="listitem"], div[role="listitem"]';

  const STATUS_LABEL = {
    fleetwide: "Starlink",
    installing: "Starlink (installing)",
    announced: "Starlink (announced)",
    other: "No Starlink",
    unknown: "No Starlink data",
  };

  const STATUS_TITLE = {
    fleetwide: (note) => `Starlink Wi-Fi: fleet-wide. ${note}`,
    installing: (note) => `Starlink Wi-Fi: rolling out now, not on every aircraft yet. ${note}`,
    announced: (note) => `Starlink Wi-Fi: announced, installation not yet underway. ${note}`,
    other: (note) => `Different satellite Wi-Fi provider (not Starlink). ${note}`,
    unknown: () => "No public Starlink information found for this airline yet.",
  };

  function findAirlineMatch(text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    let best = null;
    for (const [alias, entry] of DATA.aliasMap.entries()) {
      // Word-boundary-ish match so "United" doesn't match "United Kingdom".
      const idx = lower.indexOf(alias);
      if (idx === -1) continue;
      const before = idx === 0 ? " " : lower[idx - 1];
      const after = idx + alias.length >= lower.length ? " " : lower[idx + alias.length];
      const isWordBoundary = /[^a-z0-9]/.test(before) && /[^a-z0-9]/.test(after);
      if (!isWordBoundary) continue;
      // Prefer the longest matching alias (e.g. "Air France" over "Air").
      if (!best || alias.length > best.alias.length) {
        best = { entry, alias };
      }
    }
    return best ? best.entry : null;
  }

  function makeBadge(status, note) {
    const badge = document.createElement("span");
    badge.className = `starlink-badge starlink-badge--${status}`;
    badge.textContent = STATUS_LABEL[status] || STATUS_LABEL.unknown;
    badge.title = (STATUS_TITLE[status] || STATUS_TITLE.unknown)(note || "");
    return badge;
  }

  function getRowLabelText(row) {
    if (row.hasAttribute("aria-label")) return row.getAttribute("aria-label");
    const labelled = row.querySelector("[aria-label]");
    return labelled ? labelled.getAttribute("aria-label") : row.textContent;
  }

  // The accessible row and the visible card are separate subtrees that Google
  // stacks to share one bounding box. Find the visible one by walking up from
  // the row and checking each ancestor's other children for real flight text.
  function findVisualSibling(row) {
    let parent = row.parentElement;
    for (let i = 0; i < 6 && parent; i++) {
      for (const child of parent.children) {
        if (child === row) continue;
        if (/\d{1,2}:\d{2}\s*(AM|PM)/i.test(child.textContent || "")) return child;
      }
      parent = parent.parentElement;
    }
    return null;
  }

  // Look for the airline's name rendered as its own short text node (Google
  // shows the marketing name, e.g. "American", not the full legal name) so
  // the badge can be inserted right after it as a normal sibling. Matches on
  // more than exact equality because multi-carrier codeshare/self-transfer
  // rows can render two airline names back to back with no separator in one
  // text node (e.g. "AeromexicoDelta") - a word-boundary substring check
  // still finds the right node to anchor to without matching unrelated text.
  function findAirlineNameNode(root, entry) {
    if (!root || !entry) return null;
    const candidates = entry.names.map((n) => n.toLowerCase());
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const t = node.textContent.trim();
      if (!t || t.length > 40) continue;
      const lower = t.toLowerCase();
      const isMatch = candidates.some((c) => {
        const idx = lower.indexOf(c);
        if (idx === -1) return false;
        const before = idx === 0 ? " " : lower[idx - 1];
        const after = idx + c.length >= lower.length ? " " : lower[idx + c.length];
        return /[^a-z0-9]/.test(before) && /[^a-z0-9]/.test(after);
      });
      if (isMatch) return node;
    }
    return null;
  }

  function annotateRow(row) {
    const text = getRowLabelText(row);
    // Skip rows that don't look like a flight result (no duration/stops info).
    if (!text || !/nonstop|stop\b|stops\b|hr\s|\bmin\b/i.test(text)) return;

    const match = findAirlineMatch(text);
    const status = match ? match.status : "unknown";
    const note = match ? match.note : "";

    // Most rows split the real content into a separate sibling subtree (see
    // findVisualSibling's comment), but some - e.g. "Separate tickets"
    // self-transfer itineraries - put everything directly inside the row
    // itself instead. Try the row first (cheap no-op when it holds nothing
    // but our own badge), then fall back to the sibling pattern.
    const nameNode = match
      ? findAirlineNameNode(row, match) || findAirlineNameNode(findVisualSibling(row), match)
      : null;
    const anchor = nameNode ? nameNode.parentElement : null;

    // Google can hydrate the airline name text a beat after the row itself
    // first appears, so an earlier pass may have fallen back to a corner
    // badge before the name was there to anchor to. Now that it's found,
    // drop the stale corner badge rather than showing both at once.
    const existingCorner = row.querySelector(`:scope > .${CORNER_CLASS}`);
    if (anchor && existingCorner) existingCorner.remove();

    if (anchor && anchor.parentNode) {
      // Already inserted and still attached? Google's re-renders can wipe a
      // node it didn't create, so this has to check what's actually there
      // right now rather than a one-time flag.
      const next = anchor.nextElementSibling;
      if (next && next.classList.contains(INLINE_CLASS)) return;
      const badge = makeBadge(status, note);
      badge.classList.add(INLINE_CLASS);
      anchor.parentNode.insertBefore(badge, anchor.nextSibling);
      return;
    }

    // Fallback for when the airline name can't be found as its own text node
    // (markup drift, an unlisted airline's name rendered differently, etc):
    // a small corner badge that needs no knowledge of the row's internals.
    if (existingCorner) return;
    const badge = makeBadge(status, note);
    badge.classList.add(CORNER_CLASS);
    const computed = window.getComputedStyle(row);
    if (computed.position === "static") {
      row.style.position = "relative";
    }
    row.appendChild(badge);
  }

  function annotateAll(root) {
    // Google's markup can carry more than one role="link"/"listitem" element
    // describing the very same flight (e.g. a nested sub-element within the
    // full-card link) - both would independently pass the flight-like text
    // check below, so dedupe by the row's own label text within this pass to
    // avoid badging the same flight twice.
    const seenText = new Set();
    root.querySelectorAll(ROW_SELECTOR).forEach((row) => {
      const text = getRowLabelText(row);
      if (text) {
        if (seenText.has(text)) return;
        seenText.add(text);
      }
      annotateRow(row);
    });
  }

  let scheduled = false;
  function scheduleAnnotate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      annotateAll(document.body);
    });
  }

  // Re-run on every mutation, including pure removals: Google can strip our
  // badge without adding anything back, and that's exactly the case where a
  // re-check needs to happen so annotateRow can re-attach it.
  const observer = new MutationObserver(() => {
    scheduleAnnotate();
  });

  function start() {
    annotateAll(document.body);
    observer.observe(document.body, { childList: true, subtree: true });
    // Google's responsive breakpoints (which can hide the airline-name node
    // entirely at some widths) key off viewport width, which browser zoom
    // changes without necessarily mutating the DOM - re-check on resize too.
    window.addEventListener("resize", scheduleAnnotate);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
