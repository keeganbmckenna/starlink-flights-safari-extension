# Data sources

The airline Starlink status dataset in
[`web-extension/data/starlink-airlines.js`](../web-extension/data/starlink-airlines.js)
was compiled on **2026-09-13** from public reporting. It is a manually
curated snapshot, not a live feed — re-check and refresh it periodically,
especially the `installing` and `announced` entries, which change quickly.

## How to update

1. Edit the `AIRLINES` array in `web-extension/data/starlink-airlines.js`.
2. Bump `LAST_UPDATED` at the top of that file.
3. Bump `"version"` in `web-extension/manifest.json`.
4. Re-run the Xcode build (see main [README](../README.md)).

## Sources consulted for the initial dataset

- [Alaska Airlines' Starlink Wi-Fi Rollout Is Ahead of Schedule](https://upgradedpoints.com/news/alaska-airlines-starlink-wifi-2026/)
- [United Airlines' Free Starlink Wi-Fi Rollout: 1,000 Planes By End Of 2026](https://onemileatatime.com/news/united-airlines-free-starlink-wi-fi/)
- [Starlink Inflight Internet 2026: The Airline Wi-Fi & CX Guide](https://www.cxtoday.com/service-management-connectivity/starlink-inflight-internet-airlines-wifi-guide-2026/)
- [Southwest Airlines is launching free Starlink WiFi with rollout summer 2026](https://aerospaceglobalnews.com/news/southwest-free-starlink-wifi-summer-2026/)
- [American Airlines Plans Starlink WiFi Rollout Across More Than Five Hundred Narrowbody Jets](https://www.travelandtourworld.com/news/article/w4hq727kwg6o/)
- [Don't book without checking — 46 airlines have Starlink WiFi in 2026 | StarlinkFlights](https://www.starlinkflights.com/airlines/starlink-list)
- [Emirates to operate largest Starlink-enabled fleet](https://www.emirates.com/media-centre/gaining-speed-at-40000-feet-emirates-set-to-operate-the-worlds-largest-starlink-enabled-international-wide-body-fleet-bringing-ultra-fast-connectivity-on-232-boeing-777-and-a380-aircraft/)
- [Emirates Starlink WiFi: ~36 (est.) of 232 aircraft equipped](https://www.starlinkflights.com/airlines/ek)
- [Mapped: Which Airlines Have Starlink WiFi? Every Carrier and Country (2026) | Mappr](https://www.mappr.co/airlines-with-starlink-wifi/)
- Qatar Airways, Air France, Lufthansa Group and WestJet status per aggregated
  2026 airline-Wi-Fi guides (upgradedpoints.com, mappr.co, pointalize.com).

## Known limitation

Within an "installing" airline, the badge cannot tell you whether the
*specific* aircraft on your itinerary has been retrofitted yet — only that
the airline is actively rolling it out. Getting that level of precision
would require per-tail-number or per-flight-number data (e.g. scraping
airline fleet trackers or a live backend), which this project deliberately
does not do — see the "static bundled dataset" decision in the project
README.
