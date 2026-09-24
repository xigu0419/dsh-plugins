/**
 * DeepSeek API peak/off-peak pricing hint for the Web sidebar foot.
 *
 * Policy (api-docs.deepseek.com pricing page): DeepSeek bills by Beijing time
 * (UTC+8, no DST). Peak hours are Monday-Friday 09:00-12:00 and 14:00-18:00;
 * every other hour — nights, weekends — is off-peak at half the peak price.
 *
 * Placement: the sidebar foot offers one content seat (`sidebar.footer.action`),
 * a compact action ROW that cannot host a block and whose position relative to
 * the usage card is not stable. The card itself is injected into `footArea` by
 * @linxin666/dsh-usage. This module therefore seats its own block directly
 * BEFORE that card node, and re-seats on shell re-renders — so the hint is
 * anchored above 今日消费 whichever order the shell reconciles the foot into.
 * Fallback order when the usage plugin is absent: before the Settings seat.
 * @module @local/dsh-deepseek-peak-hint/client
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-deepseek-peak-hint',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Own React root for the injected container; a platform-table seed word. */
    let createRoot = null
    try {
      const reactDomClient = require('react-dom/client')
      if (reactDomClient !== null && typeof reactDomClient.createRoot === 'function') createRoot = reactDomClient.createRoot
    } catch {
      createRoot = null
    }

    /** Dictionary namespace this package registers. */
    const NS = 'dsh-deepseek-peak-hint'

    /** Chinese copy (key-set source of truth). */
    const zh = {
      'hint.peak': '高峰·双倍',
      'hint.offPeak': '空闲·半价',
      'hint.untilOffPeak': '后转空闲',
      'hint.untilPeak': '后转高峰',
      'hint.unit.day': '天',
      'hint.unit.hour': '小时',
      'hint.unit.minute': '分',
      'hint.aria': 'DeepSeek API 计价时段提示',
      'hint.tip.title': 'DeepSeek API 计价时段（北京时间）',
      'hint.tip.peak': '高峰（双倍计价）：周一至周五 09:00-12:00、14:00-18:00',
      'hint.tip.off': '空闲（半价计价）：其余时段，含周末全天',
      'hint.tip.now': '当前：',
      'hint.tip.next': '下次切换：',
      'hint.tip.price': 'deepseek-flash 输出价：空闲 ¥4 / 高峰 ¥8（每百万 tokens）',
      'hint.tip.note': '中国法定节假日全天空闲，此处未含节假日日历。',
      'hint.tip.source': 'api-docs.deepseek.com/zh-cn/quick_start/pricing',
    }

    /** English copy, mirroring the zh key set. */
    const en = {
      'hint.peak': 'Peak·2x',
      'hint.offPeak': 'Off-peak·1/2',
      'hint.untilOffPeak': ' to off-peak',
      'hint.untilPeak': ' to peak',
      'hint.unit.day': 'd',
      'hint.unit.hour': 'h',
      'hint.unit.minute': 'm',
      'hint.aria': 'DeepSeek API billing period hint',
      'hint.tip.title': 'DeepSeek API billing periods (Beijing time)',
      'hint.tip.peak': 'Peak (double rate): Mon-Fri 09:00-12:00, 14:00-18:00',
      'hint.tip.off': 'Off-peak (half rate): every other hour, weekends included',
      'hint.tip.now': 'Now: ',
      'hint.tip.next': 'Next switch: ',
      'hint.tip.price': 'deepseek-flash output: off-peak ¥4 / peak ¥8 per 1M tokens',
      'hint.tip.note': 'Chinese statutory holidays bill off-peak all day; no holiday calendar is applied here.',
      'hint.tip.source': 'api-docs.deepseek.com/zh-cn/quick_start/pricing',
    }

    /** The published peak windows in minutes-of-day, Beijing time: inclusive start, exclusive end. */
    const PEAK_WINDOWS = [[9 * 60, 12 * 60], [14 * 60, 18 * 60]]

    /** Beijing is UTC+8 year-round (no DST), so a fixed shift is exact. */
    const BEIJING_OFFSET_MS = 8 * 3_600_000

    /** Countdown refresh granularity. */
    const TICK_MS = 5_000

    /** Selector of this module's injected container (DOM-level idempotency key). */
    const CONTAINER_ATTR = 'data-dsh-peak-hint'

    /** The usage plugin's own stable foot-card selector; the anchor this block sits above. */
    const USAGE_CARD_SELECTOR = '[data-dsh-usage-foot-card]'

    /** A rail narrower than this renders the dot only. */
    const COMPACT_WIDTH_PX = 140

    /** Coalescing delay for re-seating after shell re-renders. */
    const RESEAT_DELAY_MS = 300

    /** The peak window containing `minuteOfDay`, if any. */
    function withinWindow(minuteOfDay) {
      for (const window of PEAK_WINDOWS) {
        if (minuteOfDay >= window[0] && minuteOfDay < window[1]) return window
      }
      return undefined
    }

    /**
     * The DeepSeek billing period at `ms` plus the instant it next flips:
     * the window's close while peaking, the next weekday window's open otherwise.
     */
    function periodAt(ms) {
      const shifted = new Date(ms + BEIJING_OFFSET_MS)
      const weekday = shifted.getUTCDay()
      const minuteOfDay = shifted.getUTCHours() * 60 + shifted.getUTCMinutes()
      const current = weekday >= 1 && weekday <= 5 ? withinWindow(minuteOfDay) : undefined
      if (current !== undefined) {
        return {
          peak: true,
          boundaryMs: ms + (current[1] - minuteOfDay) * 60_000
            - shifted.getUTCSeconds() * 1_000 - shifted.getUTCMilliseconds(),
        }
      }
      // Next window start: later today (weekday only), else the following days'
      // first morning window. The scan bound keeps a malformed clock terminating.
      for (let dayOffset = 0; dayOffset < 8; dayOffset += 1) {
        const day = new Date(ms + BEIJING_OFFSET_MS + dayOffset * 86_400_000)
        const dayWeekday = day.getUTCDay()
        if (dayWeekday < 1 || dayWeekday > 5) continue
        const realDayStart = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()) - BEIJING_OFFSET_MS
        for (const window of PEAK_WINDOWS) {
          if (dayOffset === 0 && window[0] <= minuteOfDay) continue
          return { peak: false, boundaryMs: realDayStart + window[0] * 60_000 }
        }
      }
      // Unreachable (the scan covers a full week); a conservative off-peak answer.
      return { peak: false, boundaryMs: ms + 86_400_000 }
    }

    /** Compact duration such as `3小时12分` / `3h12m`. */
    function humanDuration(ms, t) {
      const totalMinutes = Math.max(0, Math.round(ms / 60_000))
      const days = Math.floor(totalMinutes / 1_440)
      const hours = Math.floor((totalMinutes % 1_440) / 60)
      const minutes = totalMinutes % 60
      if (days > 0) return days + t('hint.unit.day') + hours + t('hint.unit.hour')
      if (hours > 0) return hours + t('hint.unit.hour') + minutes + t('hint.unit.minute')
      return minutes + t('hint.unit.minute')
    }

    /** `MM-DD HH:mm` in Beijing time, without depending on Intl time zones. */
    function beijingStamp(ms) {
      const shifted = new Date(ms + BEIJING_OFFSET_MS)
      const pad = (value) => String(value).padStart(2, '0')
      return pad(shifted.getUTCMonth() + 1) + '-' + pad(shifted.getUTCDate())
        + ' ' + pad(shifted.getUTCHours()) + ':' + pad(shifted.getUTCMinutes())
    }

    /** The hover text: the schedule, the current period, the flip instant and the price line. */
    function tipText(period, t) {
      const state = period.peak ? t('hint.peak') : t('hint.offPeak')
      const next = period.peak ? t('hint.untilOffPeak') : t('hint.untilPeak')
      return [
        t('hint.tip.title'),
        t('hint.tip.peak'),
        t('hint.tip.off'),
        '',
        t('hint.tip.now') + state,
        t('hint.tip.next') + beijingStamp(period.boundaryMs) + '（' + next.trim() + '）',
        '',
        t('hint.tip.price'),
        t('hint.tip.note'),
        t('hint.tip.source'),
      ].join('\n')
    }

    /** The hint block; `compact` (56px rail) draws the state dot alone. */
    function PeakHint(props) {
      const t = props.t
      const compact = props.compact === true
      const [now, setNow] = React.useState(() => Date.now())

      React.useEffect(() => {
        const handle = window.setInterval(() => { setNow(Date.now()) }, TICK_MS)
        return () => { window.clearInterval(handle) }
      }, [])

      const period = periodAt(now)
      const accent = period.peak
        ? 'var(--dsw-alias-state-warn-primary)'
        : 'var(--dsw-alias-state-success-primary)'
      const stateText = period.peak ? t('hint.peak') : t('hint.offPeak')
      const switchText = period.peak ? t('hint.untilOffPeak') : t('hint.untilPeak')
      const title = tipText(period, t)
      const dot = h('span', {
        'aria-hidden': true,
        style: {
          flex: 'none', width: 8, height: 8, borderRadius: '50%',
          background: accent, display: 'block',
        },
      })

      if (compact) {
        return h('span', {
          title, 'aria-label': t('hint.aria') + ': ' + stateText,
          style: {
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, cursor: 'default',
          },
        }, dot)
      }

      return h('span', {
        title, 'aria-label': t('hint.aria') + ': ' + stateText,
        style: {
          display: 'flex', alignItems: 'center', gap: 6, boxSizing: 'border-box',
          width: '100%', padding: '6px 8px', marginBottom: 6, borderRadius: 10,
          border: '1px solid var(--dsw-alias-border-l1)',
          background: 'var(--dsw-alias-bg-layer-1)',
          fontSize: 12, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden',
          fontVariantNumeric: 'tabular-nums', cursor: 'default',
        },
      },
        dot,
        h('span', { style: { flex: 'none', color: accent, fontWeight: 500 } }, stateText),
        h('span', {
          style: {
            minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
            color: 'var(--dsw-alias-label-secondary)',
          },
        }, humanDuration(period.boundaryMs - now, t) + switchText),
      )
    }

    /** Inline fallback when the locale service is unavailable. */
    const fallbackDict = typeof navigator !== 'undefined'
      && typeof navigator.language === 'string'
      && navigator.language.toLowerCase().indexOf('zh') === 0
      ? zh
      : en

    function fallback(key) {
      const value = fallbackDict[key]
      return typeof value === 'string' ? value : key
    }

    /** The sidebar column element, or null before the shell mounts. */
    function sidebarColumn() {
      return document.querySelector('[data-pane="sidebar"], [class*="sidebarCol"]')
    }

    /** The shell's sidebar foot area (footer actions + usage card + Settings row). */
    function footArea() {
      const column = sidebarColumn()
      return column === null ? null : column.querySelector('[class*="footArea"]')
    }

    /**
     * Seat the container directly above the usage card — else above the Settings
     * seat when the usage plugin is absent, else at the foot's tail.
     */
    function reseat(container) {
      const foot = footArea()
      if (foot === null) return
      const card = foot.querySelector(USAGE_CARD_SELECTOR)
      if (card !== null) {
        if (container.nextElementSibling !== card) foot.insertBefore(container, card)
        return
      }
      const settings = foot.querySelector('[class*="settingsArea"]')
      if (settings !== null) {
        if (container.nextElementSibling !== settings) foot.insertBefore(container, settings)
        return
      }
      if (foot.lastElementChild !== container) foot.append(container)
    }

    /** Re-check coalesced body mutations; the shell re-renders can displace the node. */
    function watchBody(onChange) {
      if (typeof MutationObserver !== 'function' || typeof document === 'undefined') return () => {}
      let timer
      const observer = new MutationObserver(() => {
        if (timer !== undefined) return
        timer = window.setTimeout(() => { timer = undefined; onChange() }, RESEAT_DELAY_MS)
      })
      observer.observe(document.body !== null ? document.body : document.documentElement, {
        childList: true, subtree: true,
      })
      return () => {
        if (timer !== undefined) window.clearTimeout(timer)
        observer.disconnect()
      }
    }

    /** Client plugin body: register the dictionaries, then seat the block. */
    function apply(ctx) {
      const locale = ctx.get('locale')

      ctx.effect(() => {
        if (locale === undefined) return () => {}
        try {
          return locale.register(NS, { zh, en })
        } catch {
          return () => {}
        }
      }, 'dsh-deepseek-peak-hint: dictionaries')

      // Rebound per call so the copy follows a locale switch without re-registering.
      const t = (key) => {
        if (locale !== undefined) {
          try {
            const value = locale.bind(NS)(key)
            if (typeof value === 'string' && value.length > 0 && value !== key) return value
          } catch {
            // Fall through to the inline dictionary.
          }
        }
        return fallback(key)
      }

      ctx.effect(() => {
        if (typeof document === 'undefined') return () => {}
        if (createRoot === null) {
          console.warn('[dsh-deepseek-peak-hint] react-dom/client is unavailable; the peak/off-peak hint is not seated')
          return () => {}
        }
        // DOM-level idempotency: never seat a second block.
        if (document.querySelector('[' + CONTAINER_ATTR + ']') !== null) return () => {}

        const container = document.createElement('div')
        container.setAttribute(CONTAINER_ATTR, '')
        const root = createRoot(container)

        let compact = null
        const seat = () => {
          reseat(container)
          const foot = footArea()
          const next = foot === null ? false : foot.clientWidth < COMPACT_WIDTH_PX
          if (next !== compact) {
            compact = next
            root.render(h(PeakHint, { t, compact: next }))
          }
        }

        seat()
        const unwatch = watchBody(seat)

        return () => {
          unwatch()
          try {
            root.unmount()
          } catch {
            // The container was already detached by a shell re-render.
          }
          container.remove()
        }
      }, 'dsh-deepseek-peak-hint: sidebar block')

      return undefined
    }

    return { apply }
  },
})
