/**
 * dsh-weekly-spend — Host half.
 *
 * Intentionally inert: the week-to-date total is computed and rendered entirely
 * in the browser (client.js), by polling the usage plugin's existing
 * `GET /api/dsh-usage/overview` endpoint. No host-side routes, state, or
 * services are added, so this bundle cannot disturb the usage ledger.
 */
export const name = 'dsh-weekly-spend'

export function apply() {}
