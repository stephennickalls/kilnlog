// File: server/utils/firingList.js
//
// LAZY LIST (Aug 2026): one definition of "what a firing LIST row is" and
// "how big a page is", shared by GET /api/firings and GET /api/bootstrap.
// Nitro auto-imports everything exported from server/utils, so neither route
// needs an import statement.
//
// Before this, both routes ran `select('*')` over every firing the user had
// ever created. A potter three years in has hundreds of rows; the sidebar
// renders all of them with no virtualisation, so payload AND DOM grew without
// limit. Nothing about that got faster over time.

// Rows per page. The CLIENT hardcodes the same number (app.vue's
// FIRINGS_PAGE) because it infers "there may be more" from
// `page.length === limit` - if these two drift, the "Load older" button
// appears or disappears one page early. Change both together.
export const FIRINGS_PAGE_SIZE = 30

// THIS IS A WHITELIST. A column the client needs on a list row must be added
// here explicitly or it silently arrives undefined.
//
// CONE-FIRST (Aug 2026): fuel (sidebar glyph, console framing) and
// auto_end_hours (AutoEndedNotice states the real threshold rather than a
// hardcoded string) joined the list row.
//
// OMITTED - and why:
//   notes    - up to 5000 chars of prose per firing, and never read from a
//              list row. The notes modal reads selectedFiring, which comes
//              from /api/firings/:id in full.
//   user_id  - already the filter predicate; the client never looks at it.
export const FIRING_LIST_COLUMNS =
  'id, name, created_at, started_at, ended_at, paused_at, restarted_at, auto_ended, schedule_offset, fuel, auto_end_hours'

// readings has 5 columns; the chart needs 3.
// OMITTED: firing_id (implied by the parent row) and created_at (the row's
// insert time, not the reading's - `timestamp` is the one that means
// anything). On a 14-hour firing logged each minute that's ~840 rows, so the
// two dead columns are real bytes on the one payload we can't make lazy.
export const READING_COLUMNS = 'id, timestamp, temperature'