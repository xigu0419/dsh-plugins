/**
 * dsh-weekly-spend — Web client module.
 *
 * Adds a "本周消费总量" line INSIDE the usage plugin's 今日消费 card, directly
 * under the headline amount.
 *
 * Where the card lives: @linxin666/dsh-usage mounts its foot card into the
 * sidebar foot as `<div data-dsh-usage-foot-card>` (a plain container) holding
 * `<div data-dsh-part="foot-card">` (the styled card box). Inside that box the
 * body is `<button data-dsh-part="foot-card-main">` with one span per line:
 * the headline, `[data-dsh-part="foot-card-usage"]`, optional balances, and the
 * updated-at footer. This module anchors on those published `data-dsh-part`
 * hooks and inserts its own line directly BEFORE the usage line, so the week
 * total reads as part of the same box — right beneath 今日消费. The card's
 * hashed CSS-module classes are never referenced; the row carries its own
 * inline style, using `color: inherit` plus opacity so it follows whatever
 * theme the shell paints.
 *
 * Data: the usage host serves the same overview document its own browser half
 * reads (`GET api/dsh-usage/overview`, document-relative like that client, so a
 * sub-path deployment resolves it correctly). `usage.days` is the ascending
 * local-day ledger, today last; the row sums every day of the current local
 * calendar week (Monday 00:00 inclusive) — the same fold-time estimate the
 * 今日消费 headline shows, so the two numbers share one accounting basis.
 *
 * Lifecycle: the host mounts the card at its own pace, and React re-renders it
 * on every poll or collapse toggle. A debounced `document.body` MutationObserver
 * re-seats the row whenever the shell displaces it, a DOM marker keeps the row
 * unique per page load, and everything is registered under `ctx.effect` so the
 * disposer removes the row, the timers, the observer and the listeners.
 * Failures stay silent: a failed fetch keeps the last good value.
 *
 * Collapsed card: the one-line strip is a deliberately different surface with
 * no room for a second figure, so the row shows in the expanded card only.
 *
 * @module @local/dsh-weekly-spend/client
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-weekly-spend',
  factory() {
    /** Dictionary namespace this module registers with the locale service. */
    const NS = 'dsh-weekly-spend'

    /** Chinese copy (key-set source of truth). */
    const zh = {
      'week.label': '本周消费总量',
      'week.tip': '本周一 00:00（本地时间）起累计，含今天；与「今日消费」同源的估算值',
    }

    /** English copy, mirroring the zh key set. */
    const en = {
      'week.label': 'This week',
      'week.tip': 'Accumulated from Monday 00:00 local time, today included; same estimate as today spend',
    }

    /** The usage host's overview document; document-relative, as its own client calls it. */
    const OVERVIEW_PATH = 'api/dsh-usage/overview'

    /** The usage plugin's published foot-card hooks (never its stylesheet classes). */
    const CONTAINER_SELECTOR = '[data-dsh-usage-foot-card]'
    const CARD_MAIN_SELECTOR = '[data-dsh-part="foot-card-main"]'
    const USAGE_LINE_SELECTOR = '[data-dsh-part="foot-card-usage"]'

    /** This module's own row, marked with the same `data-dsh-part` convention. */
    const ROW_SELECTOR = '[data-dsh-part="foot-card-week"]'
    const ROW_PART = 'foot-card-week'

    /** Poll cadence: the card's own relaxed 30 s loop, so the two stay in step. */
    const POLL_MS = 30_000

    /** Coalescing delay for re-seating after shell re-renders. */
    const RESEAT_MS = 300

    /** Hard ceiling for one overview call. */
    const FETCH_TIMEOUT_MS = 20_000

    /** Row chrome: one quiet full-width line, aligned like the card's own rows. */
    const ROW_STYLE = [
      'display:flex',
      'align-items:baseline',
      'justify-content:space-between',
      'gap:8px',
      'font-size:11px',
      'line-height:1.4',
      'font-variant-numeric:tabular-nums',
      'white-space:nowrap',
      'overflow:hidden',
    ].join(';')

    /** The label keeps the muted weight of the card's title. */
    const LABEL_STYLE = 'min-width:0;overflow:hidden;text-overflow:ellipsis;opacity:.65'

    /** The value matches the headline's alignment (and clears the corner chevron). */
    const VALUE_STYLE = 'margin-right:18px;font-weight:600'

    /**
     * Parse a `YYYY-MM-DD` ledger key into local-midnight ms, avoiding the
     * mixed timezone semantics of `Date.parse` on date-only ISO strings.
     */
    function parseDayKey(value) {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value))
      if (match === null) return NaN
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime()
    }

    /**
     * Week-to-date cost from an overview payload: every `usage.days` entry on or
     * after this week's local Monday. Returns null when the payload carries no
     * usable day list.
     */
    function weekCost(payload) {
      const days = payload !== null && typeof payload === 'object' && payload.usage !== undefined
        ? payload.usage.days
        : undefined
      if (!Array.isArray(days) || days.length === 0) return null
      const now = new Date()
      const mondayMs = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - ((now.getDay() + 6) % 7),
      ).getTime()

      let total = 0
      // The list ascends, so walking back from today stops at the week boundary.
      for (let index = days.length - 1; index >= 0; index -= 1) {
        const day = days[index]
        const dayMs = parseDayKey(day !== null && typeof day === 'object' ? day.date : undefined)
        if (!Number.isFinite(dayMs)) continue
        if (dayMs < mondayMs) break
        const cost = day.totals !== undefined && day.totals !== null ? day.totals.cost : undefined
        if (typeof cost === 'number' && Number.isFinite(cost)) total += cost
      }
      return total
    }

    /** `¥12.34`, grouped once the week reaches five figures. */
    function formatMoney(value) {
      const text = value.toFixed(2)
      return '¥' + (Math.abs(value) >= 10_000 ? text.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : text)
    }

    /** Build the row element once; `t` is re-read on every paint. */
    function buildRow() {
      const row = document.createElement('span')
      row.setAttribute('data-dsh-part', ROW_PART)
      row.style.cssText = ROW_STYLE

      const label = document.createElement('span')
      label.setAttribute('data-dsh-weekly-spend', 'label')
      label.style.cssText = LABEL_STYLE

      const value = document.createElement('span')
      value.setAttribute('data-dsh-weekly-spend', 'value')
      value.style.cssText = VALUE_STYLE

      row.appendChild(label)
      row.appendChild(value)
      return { row, label, value }
    }

    /**
     * Client plugin body: register the dictionary, then seat the row inside the
     * usage card and keep it fed from the overview document.
     */
    function apply(ctx) {
      const locale = ctx.get('locale')

      ctx.effect(() => {
        if (locale === undefined) return () => {}
        try {
          return locale.register(NS, { zh, en })
        } catch {
          return () => {}
        }
      }, 'dsh-weekly-spend: dictionaries')

      /** Locale-aware copy with the inline dictionary as the fallback. */
      const fallbackDict = typeof navigator !== 'undefined'
        && typeof navigator.language === 'string'
        && navigator.language.toLowerCase().indexOf('zh') === 0
        ? zh
        : en
      const t = (key) => {
        if (locale !== undefined) {
          try {
            const value = locale.bind(NS)(key)
            if (typeof value === 'string' && value.length > 0 && value !== key) return value
          } catch {
            // Fall through to the inline dictionary.
          }
        }
        const value = fallbackDict[key]
        return typeof value === 'string' ? value : key
      }

      ctx.effect(() => {
        if (typeof document === 'undefined') return () => {}
        // DOM-level idempotency: a re-evaluated module (HMR, duplicate apply)
        // must never seat a second row.
        if (document.querySelector(ROW_SELECTOR) !== null) return () => {}

        const { row, label, value } = buildRow()
        let week = null
        let active = true
        let pollTimer = null
        let reseatTimer = null

        const paint = () => {
          label.textContent = t('week.label')
          value.textContent = week === null ? '—' : formatMoney(week)
          row.title = t('week.tip')
          row.setAttribute('aria-label', t('week.label') + ' ' + value.textContent)
        }

        /**
         * Attach the row at its seat — directly above the card's tokens/calls
         * line — or detach it while the card is absent, collapsed, or still
         * loading (none of those render the anchor).
         */
        const seat = () => {
          const main = document.querySelector(CONTAINER_SELECTOR + ' ' + CARD_MAIN_SELECTOR)
          const anchor = main === null ? null : main.querySelector(USAGE_LINE_SELECTOR)
          if (anchor === null) {
            if (row.parentNode !== null) row.remove()
            return
          }
          if (row.parentNode !== main || row.nextElementSibling !== anchor) main.insertBefore(row, anchor)
        }

        const refresh = () => {
          if (!active || document.visibilityState === 'hidden') return
          const init = { credentials: 'same-origin', headers: { accept: 'application/json' } }
          if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
            init.signal = AbortSignal.timeout(FETCH_TIMEOUT_MS)
          }
          fetch(OVERVIEW_PATH, init).then(
            (response) => (response.ok ? response.json() : null),
            () => null,
          ).then((payload) => {
            if (!active || payload === null) return
            const next = weekCost(payload)
            if (next === null) return
            week = next
            paint()
          }).catch(() => {
            // Keep the last good value; a transient transport failure is not news.
          })
        }

        const stopPolling = () => {
          if (pollTimer === null) return
          window.clearInterval(pollTimer)
          pollTimer = null
        }
        const startPolling = () => {
          if (pollTimer !== null || document.visibilityState !== 'visible') return
          pollTimer = window.setInterval(refresh, POLL_MS)
        }
        const onVisibility = () => {
          if (document.visibilityState === 'visible') {
            refresh()
            startPolling()
          } else {
            stopPolling()
          }
        }
        const onBodyChange = () => {
          if (reseatTimer !== null) return
          reseatTimer = window.setTimeout(() => {
            reseatTimer = null
            seat()
          }, RESEAT_MS)
        }

        const observer = typeof MutationObserver === 'function' ? new MutationObserver(onBodyChange) : null
        if (observer !== null) {
          observer.observe(document.body !== null ? document.body : document.documentElement, {
            childList: true,
            subtree: true,
          })
        }
        document.addEventListener('visibilitychange', onVisibility)

        /** Repaint on a language switch (the row is plain DOM, not a React tree). */
        let unsubscribeLocale = () => {}
        if (locale !== undefined && typeof locale.subscribe === 'function') {
          try {
            unsubscribeLocale = locale.subscribe(paint)
          } catch {
            unsubscribeLocale = () => {}
          }
        }

        paint()
        seat()
        refresh()
        startPolling()

        return () => {
          active = false
          stopPolling()
          if (reseatTimer !== null) window.clearTimeout(reseatTimer)
          if (observer !== null) observer.disconnect()
          document.removeEventListener('visibilitychange', onVisibility)
          try {
            unsubscribeLocale()
          } catch {
            // The locale service tore down first.
          }
          row.remove()
        }
      }, 'dsh-weekly-spend: 今日消费 card row')
    }

    return { apply }
  },
})
