Awesome—this package is rich. I dug through the instructor distribution you shared and mapped the lessons, data, and runtime features so you can rebuild it cleanly as a modern web app. Here’s the full picture plus a pragmatic migration plan.

What’s in the classic upTick package

Overall architecture (original)
	•	Instructor “server” controls class flow (start/stop market, rounds, privileges, reports, auctions).
	•	Student client is a trading terminal (order entry, montage/market depth, analyst/news panes, buying power, event window, etc.).
	•	Lessons are scenario folders with:
	•	lesson - <Name>.xml (or similar): step-by-step orchestration (privileges, market timing, bot toggles, event scripts, reporting hooks, instructor UI layout).
	•	reporting - <Name>.xml: slide/table/chart definitions for debrief (class performance tables, price & volume graphs, etc.).
	•	excel link - <Name>.xml: live data plumbed to Excel cells (market data, macro/derived fields, user metrics).
	•	One or more .xls workbooks with parameters, payoff logic, and live-feed sheets.
	•	Optional .ppt intro/debrief slides and .doc instructor notes.
	•	Admin guide (HTML) walks instructors through account setup, section seating, test runs, auctions, and running class.
	•	A Windows installer and a (non-working) separate student bundle. The working content for feature mapping lives in the instructor zip.

Simulation catalog (15 lesson families)

Below is what each lesson teaches, the instruments involved, and the mechanics the XML/Excel linkages imply. (I’m using the folder and report/lesson XML cues to be precise.)
	1.	Price Formation
	•	Goal: How prices emerge with different liquidity/information structures.
	•	Instruments: A core equity/security (e.g., “AOE”).
	•	Mechanics: Multiple “Sim A/B/C” variants toggle liquidity traders, market-making permissions, and analyst signal visibility. Discrete tick timing (e.g., 8s), Open/Close Market commands, and Start/End blocks per round.
	•	Data/Outputs: Live feed to Excel (last/bid/ask/size, volume), price/volume charts, class performance tables (% return, tx costs, net P&L).
	2.	Market Efficiency / Market Efficiency II
	•	Goal: Speed/accuracy of price adjustment to events/news.
	•	Mechanics: Event window + news pane privileges enabled, timed event injections that shift fundamentals; compare rounds with/without frictions or info asymmetry.
	•	Data/Outputs: Efficiency metrics via tables/graphs; live feed.
	3.	Law of One Price / Law of One Price II
	•	Goal: Cross-asset parity and arbitrage when securities replicate each other.
	•	Mechanics: Two or more assets with equivalent fundamental payoffs; students exploit mispricings.
	•	Data/Outputs: Reporting tables by user (gross trading profits, tx costs, ending equity), parity error visuals.
	4.	Asset Allocation / Asset Allocation II / Asset Allocation III
	•	Goal: Portfolio theory, risk/return tradeoffs across multiple assets and regimes.
	•	Mechanics: Parameterized .xls with return distributions/correlations; students target allocation or track a benchmark; penalties for deviation in some variants.
	•	Data/Outputs: “Target equity” vs. “ending equity,” transaction costs, penalty columns.
	5.	Option Pricing
	•	Goal: Derivative payoffs and hedging/greeks intuition.
	•	Mechanics: Underlying + options; students aim to hit a target equity by trading derivatives; Derivative Payoff and Penalty fields appear in reporting.
	•	Data/Outputs: Class table includes Derivative Payoff, Penalty, Ending Equity with Penalty.
	6.	Index Options
	•	Goal: Index-level options and portfolio hedging.
	•	Mechanics: Option chains on an index; time-boxed rounds; Excel link for live prices/greeks/mark-to-market.
	•	Data/Outputs: Similar to Option Pricing but using index exposures.
	7.	Merger Arbitrage
	•	Goal: Deal-spread trading under event uncertainty.
	•	Mechanics: Event window used to release outcome probabilities/updates; payoff logic in .xls; possible staged rounds (deal rumor → announcement → regulator update → close/fail).
	•	Data/Outputs: P&L by user, spread convergence visuals.
	8.	Event Arbitrage
	•	Goal: Trading around non-merger events (earnings, guidance, macro prints).
	•	Mechanics: Event schedule via instructor; “Liquidation Event.xls” for forced unwind scenarios.
	•	Data/Outputs: Before/after price moves; who paid for information (Info Costs), seat costs, and their effect on net returns.
	9.	Convertible Arbitrage
	•	Goal: Equity–bond hybrid pricing, delta-hedging, convexity.
	•	Mechanics: Convertible bond vs. underlying; privileges for montage/news; hedging dynamics across rounds.
	•	Data/Outputs: Table/slide configs preset for debrief.
	10.	Risky Debt
	•	Goal: Credit risk, spread changes, and capital structure intuition.
	•	Mechanics: “Set Interest Rate” commands present; news/events affect default/spreads.
	•	Data/Outputs: Returns and Tx costs; price/yield tracking.
	11.	CDO
	•	Goal: Tranche payoffs and loss waterfall on a CDX.
	•	Mechanics: Focus on 3–7% and 7–10% tranches; bullet text inside lesson UI explains tranche payoffs given realized losses.
	•	Data/Outputs: Class tables; tranche price/return charts.

Common across lessons

	•	Privileges (by numeric ID) control what students see: Analyst Window, Buying Power, Event/News windows, Market Order window, Montage (order book), Excel link, “Bump” buttons, etc.
	•	Controller UI (defined in lesson XML) lets instructors start/stop, step rounds, show hints/instructions, and choose Scenario A/B/C.
	•	Liquidity Traders (bots) can be toggled per round to create baseline order flow/liquidity.
	•	Excel Live Feed: XML maps specific fields (last, bid/ask/size, volume, macro metrics) to named sheets/cells for dashboards/recording.
	•	Reporting: XML defines graphs (prices/volume), tables (class performance), sorting (by username or P&L), color/formatting, plus optional PowerPoint exports for debrief.

⸻

How to modernize it as a web app

Target system goals
	•	Zero-install, browser-based instructor & student clients.
	•	Real-time trading with reliable low-latency updates (hundreds of clients in one lecture).
	•	Scenario engine that replays these lessons (and lets you author new ones) without touching code.
	•	One-click debrief dashboards + export to CSV/PPT/PDF.
	•	Roster import, SSO, grading exports, FERPA-friendly storage and retention.

Proposed architecture

Front end
	•	Next.js (React + TypeScript) for both instructor and student apps.
	•	State & transport: WebSockets for tick/trade/order events; React Query/Zustand for state.
	•	Charts: Plotly/echarts for live price/volume; data tables via AG Grid.
	•	Auth: SSO (Google/Microsoft) with roles (Instructor, TA, Student).

Back end
	•	Simulation Engine Service (TypeScript/Node or Python/FastAPI):
	•	Discrete-time loop (e.g., 1–10s ticks) or event-driven.
	•	Order book matching (limit/market), auctions (sealed/open ascending with bid increment/time interval like the original), and batch “open/close market”.
	•	Bots for liquidity providers (parameterizable intensities/spreads), analysts (signal release), and event injectors.
	•	Deterministic RNG seeds for reproducible runs.
	•	API Gateway (GraphQL or tRPC) that exposes:
	•	Lessons/Scenarios CRUD
	•	Class/Section/Seating & roster import
	•	Market controls (open/close, next round, privilege toggles)
	•	Reporting endpoints (aggregate P&L, returns, rankings)
	•	Data store: Postgres for canonical entities (users, classes, lessons, orders, trades, events), Redis pub/sub for real-time fan-out.
	•	File & export: S3 (or GCS) for session exports; server-side PPT/PDF generation (PptxGenJS + Puppeteer).
	•	Telemetry: Influx/TimescaleDB (optional) for high-frequency tick/trade history if you want to time-travel charts.

Hosting
	•	Front end on Vercel; services on AWS/GCP (Fargate/Cloud Run); managed Postgres (RDS/Cloud SQL); Redis (Upstash/ElastiCache).

Data model (core tables)
	•	User, Course, Section, Enrollment, Seat
	•	Lesson (metadata) and Scenario (versioned configs)
	•	Privilege (id, name, window binding)
	•	Security (type: equity, bond, tranche, option; params)
	•	Round (start/end, tick length)
	•	Event/News (timestamp, payload, effect function)
	•	BotConfig (liquidity trader params, analyst signal cadence)
	•	Order, Trade, Quote (standard market schema)
	•	Accounting (starting equity, tx costs, seat/info costs, penalties)
	•	ReportTemplate (JSON, replaces reporting - *.xml)
	•	Export (CSV/PPT/PDF artifacts)

Replacing the XML/Excel layer with a portable schema
	1.	Lesson XML → JSON schema
	•	Map commands → high-level actions:
	•	Grant/Remove Privilege(id) → publish a privilege list to the student UI.
	•	Set Market(startTick, delaySec, loopOnClose, liquidateOnClose) → simulation clock & liquidation rules.
	•	Open/Close Market → session state toggles.
	•	Set Liquidity Trader(traderId, active?) → BotConfig patch.
	•	Set Interest Rate(curve params) → global pricing params for fixed income/derivatives.
	•	Map simulation blocks (Simulation A/B/C) → Scenario variants with start/end hooks and duration.
	•	Map controller UI → instructor control panel layout (panels, buttons, radio/combos).
	2.	Excel link XML & .xls → Web dashboards + CSV/Sheets
	•	Port Live Feed sheets to a live dashboard panel with configurable widgets (table rows for last/bid/ask/size and macro values).
	•	Keep CSV export for gradebook, Google Sheets sync (optional) via Sheets API if instructors want spreadsheets in parallel.
	•	Recreate derived fields (e.g., “Target Equity”, “Penalty”, “Derivative Payoff”) as server-side or client-side formulas with a library like hot-formula-parser or custom functions.
	3.	Reporting XML → ReportTemplate JSON
	•	Keep the same fields (User, Starting Equity, Seat Costs, Info Costs, % Return, Tx Costs, Gross Trading Profits, Net Profits, Ending Equity).
	•	Add chart templates (line chart: Prices & Volume, stacked bars by user P&L).
	•	Export engine: render to PPT (PptxGenJS) and PDF (Chromium).

Student trading workstation (web)
	•	Montage/Depth: L1/L2 prices & sizes, order book, last trade, volume.
	•	Order Entry: Market/limit, sizes, cancel/replace; optional “Bump” buttons to adjust price/size quickly.
	•	Analyst & News panes: Toggle by privilege; show signals with timestamps.
	•	Buying Power & Positions: Real-time P&L, margin checks; penalties applied at round end when relevant.
	•	Timer & Round banner: Countdown and “next round” cues.
	•	Accessibility: Keyboard shortcuts; light/dark modes.

Instructor console (web)
	•	Pre-class: Create sections, import roster CSV, auto-assign seats, dry-run a scenario.
	•	Live controls: Open/close market, advance round, toggle Simulation A/B/C, inject events, push temporary privilege changes.
	•	Dashboards: Live price/volume, leaderboards, order flow widgets, “who bought info/seat” summaries.
	•	Debrief: One-click build of the classic tables/graphs (matching legacy columns), export PPT/PDF/CSV.

Simulation-specific notes (faithful ports)
	•	Price Formation: Preserve three modes (A/B/C) with different bot/privilege sets and the 8-second tick cadence. Maintain liquidation on close = true behavior when specified.
	•	Options / Index Options: Add instrument definitions for strikes/maturities/greeks; compute Derivative Payoff and Penalty exactly as in legacy .xls.
	•	CDO: Implement CDX loss path with tranche attachment/detachment; payoff:
	•	e.g., 7–10% tranche pays 100 if realized loss < 7%, 0 if > 10%, linear interpolation in between (based on lesson text).
	•	Merger/Event Arb: Event scheduler that sets probability updates or terminal outcomes; support forced Liquidation Event when configured.
	•	Risky Debt: Global interest rate command sets discounting/spread curves; news moves hazard rates/spreads.
	•	Law of One Price: Define equivalent payoff mapping between assets; add an arbitrage score panel for debrief.

Migration plan

Phase 0 — Extract & spec
	•	Parse each lesson - *.xml, reporting - *.xml, and excel link - *.xml into a unified LessonSpec document.
	•	Inventory Privilege IDs by name (Analyst, Buying Power, Event, Montage, News, Market Order, Excel Link, Bump Buttons, etc.) so the web UI can keep the same switches.

Phase 1 — Core engine + basic UI
	•	Build the matching engine, order model, and WebSocket fan-out.
	•	Implement Open/Close, tick clock, round manager, liquidity bot v1, and privilege system.
	•	Student UI with montage, order entry, buying power, timer.
	•	Instructor console with start/stop/next-round and a simple live leaderboard.

Phase 2 — Lessons & events
	•	Implement the LessonSpec runtime (Scenario A/B/C, start/end hooks, commands).
	•	Add Event/News injectors, analyst signal module, interest-rate command.
	•	Recreate auctions (current price, bid increment, time interval rounds) as an instructor-triggered activity.

Phase 3 — Reporting & exports
	•	Port reporting XML into ReportTemplate JSON; build debrief charts/tables.
	•	PPT/PDF/CSV export parity with color/format options analogous to legacy attributes.

Phase 4 — Authoring tools
	•	Visual lesson editor (drag-drop panels, rounds, commands).
	•	“Test with bots” mode, then “Test with students.”
	•	Versioning and shareable templates.

Phase 5 — Admin polish
	•	SSO, roster import, seating map; gradebook export; data retention policy; per-school branding.

Backwards compatibility / import strategy
	•	One-time importers:
	•	XML → JSON: directly transform legacy lesson/reporting/excel-link files into the new schema.
	•	XLS → JSON: extract constants/tables used for payoffs and live feeds; for complex formulas, embed equivalent JS formulas.
	•	Validation suite:
	•	Golden runs for each lesson (seeded RNG) comparing legacy vs. new engine: price paths, trades, and report aggregates should match within tolerance.

What to keep, what to drop
	•	Keep: Privilege granularity, Simulation A/B/C variants, round-based pacing, bots, auctions, live debrief.
	•	Modernize: Excel live feed → native dashboards (with optional Google Sheets sync).
	•	Drop: Windows-only installer, PowerPoint templates as sources (replace with generated decks).
	•	Add: Accessibility, mobile-friendly student view, cloud saves, retry/resume, anonymized exports for research.

⸻

Quick checklist to get started
	•	Define the LessonSpec JSON (commands, scenarios, privileges, events, bots, reports).
	•	Implement the matching engine and WebSocket scaffolding.
	•	Port Price Formation first (it touches most systems), then Option Pricing, CDO, Merger Arb.
	•	Build the reporting layer + PPT export.
	•	Create the XML/XLS importers to ingest your existing content.

If you want, I can turn the Price Formation lesson XML you provided into a concrete LessonSpec JSON and a minimal instructor/student UI wireflow next.