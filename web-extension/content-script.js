// Starlink Column for Google Flights - content script.
//
// Google Flights' result list is a plain div/li layout with no real
// <table>, and its CSS class names are obfuscated and change often. The
// most stable hook Google provides is the aria-label text it generates for
// screen readers on each result row (e.g. "6:00 AM - 2:15 PM United,
// nonstop, 5 hr 30 min, JFK to LAX, ..."), so we match against that instead
// of any class name. If Google changes this pattern, the selectors below
// are the first thing to update.

(function () {
  const DATA = window.StarlinkAirlineData;
  if (!DATA) return;

  const BADGE_ATTR = "data-starlink-badge-applied";
  const ROW_SELECTOR = 'li[role="listitem"], div[role="listitem"]';

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

  function annotateRow(row) {
    if (row.getAttribute(BADGE_ATTR) === "1") return;
    const text = getRowLabelText(row);
    // Skip rows that don't look like a flight result (no duration/stops info).
    if (!text || !/nonstop|stop\b|stops\b|hr\s|\bmin\b/i.test(text)) return;

    row.setAttribute(BADGE_ATTR, "1");
    const match = findAirlineMatch(text);
    const status = match ? match.status : "unknown";
    const note = match ? match.note : "";

    const wrapper = document.createElement("div");
    wrapper.className = "starlink-column-cell";
    wrapper.appendChild(makeBadge(status, note));

    const computed = window.getComputedStyle(row);
    if (computed.position === "static") {
      row.style.position = "relative";
    }
    row.appendChild(wrapper);
  }

  function annotateAll(root) {
    const rows = root.querySelectorAll(ROW_SELECTOR);
    rows.forEach(annotateRow);
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length === 0) continue;
      annotateAll(document.body);
      break;
    }
  });

  function start() {
    annotateAll(document.body);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
