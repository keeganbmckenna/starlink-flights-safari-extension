// Starlink Wi-Fi status by airline, for the "Starlink column" content script.
//
// This is a manually curated, best-effort snapshot compiled from public
// airline announcements and aviation press coverage. It is NOT sourced from
// a live API or per-flight tail-number data, so within an airline that is
// "installing" the badge cannot tell you whether *your specific* aircraft
// has been retrofitted yet — only that the airline is actively doing so.
// See ../../docs/DATA_SOURCES.md for citations and how to refresh this file.
//
// Status values:
//   "fleetwide"   - Starlink is installed fleet-wide (or on effectively all
//                   aircraft you'd be booked on); very high confidence.
//   "installing"  - Active rollout in progress; some aircraft have it, some
//                   don't yet. Confidence varies by airline.
//   "announced"   - A deal/commitment exists but installation has not
//                   meaningfully started yet.
//   "other"       - Airline has committed to a *different* satellite Wi-Fi
//                   provider (e.g. Amazon Leo/Kuiper), not Starlink.
//   "unknown"     - No public Starlink information found for this airline.
//                   (Airlines not in this list also fall back to "unknown".)

(function (global) {
  const LAST_UPDATED = "2026-09-13";

  // Each entry: canonical name + aliases as they might appear in Google
  // Flights result rows (airline name text, marketing carrier names, etc).
  const AIRLINES = [
    {
      names: ["Hawaiian Airlines", "Hawaiian"],
      status: "fleetwide",
      note: "First major carrier with Starlink across its entire fleet (A321neo and A330).",
    },
    {
      names: ["JSX"],
      status: "fleetwide",
      note: "First airline anywhere to fly with Starlink installed.",
    },
    {
      names: ["airBaltic", "Air Baltic"],
      status: "fleetwide",
      note: "First airline in Europe with Starlink fleet-wide.",
    },
    {
      names: ["ZIPAIR", "Zipair"],
      status: "fleetwide",
      note: "First airline in Asia with Starlink fleet-wide.",
    },
    {
      names: ["Arajet"],
      status: "fleetwide",
      note: "Fully installed per public reporting.",
    },
    {
      names: ["Aero"],
      status: "fleetwide",
      note: "Fully installed per public reporting.",
    },
    {
      names: ["United", "United Airlines"],
      status: "installing",
      note: "Largest Starlink deployment globally: 400+ aircraft equipped, targeting 1,000+ mainline and regional aircraft by end of 2026.",
    },
    {
      names: ["Alaska Airlines", "Alaska"],
      status: "installing",
      note: "Rollout ahead of schedule in 2026. Former Hawaiian Airlines aircraft already have it; mainline Alaska jets are being retrofitted.",
    },
    {
      names: ["Southwest", "Southwest Airlines"],
      status: "installing",
      note: "Free Starlink Wi-Fi launched summer 2026, expanding to 300+ aircraft by end of year.",
    },
    {
      names: ["Qatar Airways"],
      status: "installing",
      note: "Boeing 777, A350 and 787-8 widebody fleet done; 787-9s finishing in 2026; A320 narrowbodies last.",
    },
    {
      names: ["Air France"],
      status: "installing",
      note: "Rolled out on A350s; full fleet expected by end of 2026.",
    },
    {
      names: ["Emirates"],
      status: "installing",
      note: "~15% of 232-aircraft 777/A380 fleet equipped as of mid-2026 (~14 aircraft/month); targeting completion by mid-2027.",
    },
    {
      names: ["WestJet"],
      status: "installing",
      note: "737 narrowbody fleet fully done; 787-9s being fitted through end of 2026.",
    },
    {
      names: ["Virgin Atlantic"],
      status: "installing",
      note: "Actively installing on A350 fleet.",
    },
    {
      names: ["SAS", "Scandinavian Airlines"],
      status: "installing",
      note: "Fleet-wide installation underway.",
    },
    {
      names: ["Air New Zealand"],
      status: "installing",
      note: "Rolling out across the fleet.",
    },
    {
      names: ["Iberia"],
      status: "installing",
      note: "IAG group carrier; installation underway.",
    },
    {
      names: ["Lufthansa"],
      status: "installing",
      note: "Lufthansa Group (also Air Dolomiti, Austrian, Brussels Airlines, Edelweiss, Eurowings, ITA Airways, SWISS): first aircraft flying with Starlink from Q3 2026, fleetwide across ~850 aircraft by 2029.",
    },
    {
      names: ["SWISS", "Swiss International Air Lines"],
      status: "installing",
      note: "Lufthansa Group rollout just beginning in 2026; see Lufthansa entry.",
    },
    {
      names: ["Austrian Airlines", "Austrian"],
      status: "installing",
      note: "Lufthansa Group rollout just beginning in 2026; see Lufthansa entry.",
    },
    {
      names: ["Brussels Airlines"],
      status: "installing",
      note: "Lufthansa Group rollout just beginning in 2026; see Lufthansa entry.",
    },
    {
      names: ["ITA Airways", "ITA"],
      status: "installing",
      note: "Lufthansa Group rollout just beginning in 2026; see Lufthansa entry.",
    },
    {
      names: ["Eurowings"],
      status: "installing",
      note: "Lufthansa Group rollout just beginning in 2026; see Lufthansa entry.",
    },
    {
      names: ["Edelweiss", "Edelweiss Air"],
      status: "installing",
      note: "Lufthansa Group rollout just beginning in 2026; see Lufthansa entry.",
    },
    {
      names: ["Air Dolomiti"],
      status: "installing",
      note: "Lufthansa Group rollout just beginning in 2026; see Lufthansa entry.",
    },
    {
      names: ["British Airways"],
      status: "announced",
      note: "IAG group-wide Starlink commitment (~500 aircraft); installation not yet substantial.",
    },
    {
      names: ["Vueling"],
      status: "announced",
      note: "IAG group carrier; Starlink commitment announced.",
    },
    {
      names: ["Aer Lingus"],
      status: "announced",
      note: "IAG group carrier; Starlink commitment announced.",
    },
    {
      names: ["American Airlines", "American"],
      status: "announced",
      note: "Plans to install Starlink on 500+ narrowbody jets starting Q1 2027.",
    },
    {
      names: ["Korean Air"],
      status: "announced",
      note: "Starlink commitment announced; installation still early.",
    },
    {
      names: ["Asiana Airlines", "Asiana", "Air Busan"],
      status: "announced",
      note: "Starlink commitment announced via Hanjin/Korean Air group.",
    },
    {
      names: ["Delta", "Delta Air Lines"],
      status: "other",
      note: "Committed to Amazon's Project Kuiper satellite Wi-Fi (expected from 2028), not Starlink.",
    },
    {
      names: ["JetBlue"],
      status: "other",
      note: "Committed to Amazon's Project Kuiper satellite Wi-Fi (expected from 2027), not Starlink.",
    },
  ];

  // Build a case-insensitive alias -> entry lookup map once.
  const ALIAS_MAP = new Map();
  for (const entry of AIRLINES) {
    for (const name of entry.names) {
      ALIAS_MAP.set(name.toLowerCase(), entry);
    }
  }

  global.StarlinkAirlineData = {
    lastUpdated: LAST_UPDATED,
    airlines: AIRLINES,
    aliasMap: ALIAS_MAP,
  };
})(typeof window !== "undefined" ? window : this);
