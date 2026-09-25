# dsh-deepseek-peak-hint

DeepSeek Harness（DSH）Web 界面插件：在左侧边栏底部、**「今日消费」卡片正上方**常驻一块提示，显示当前处于 DeepSeek API 的 **高峰** 还是 **空闲** 计价时段，并倒计时到下一次切换。

> ⏰ 提醒你什么时候跑大批量任务更省钱。

## 功能

- 🟢 `空闲·半价` —— 当前按高峰价的 **一半** 计费
- 🟠 `高峰·双倍` —— 价格是空闲时段的两倍，大批量任务适合挪到空闲时段再跑
- 悬停（hover）显示完整时刻表、当前时段、下次切换的北京时间、价格行
- 侧栏折叠为 56px 栏轨时，自动退化为只保留状态圆点
- 计价时段按 **北京时间（UTC+8，无夏令时）** 计算，不依赖宿主时区

## 计费规则

按 DeepSeek 官方定价页 [api-docs.deepseek.com/zh-cn/quick_start/pricing](https://api-docs.deepseek.com/zh-cn/quick_start/pricing)：

| 时段 | 时间（北京时间） | 计价 |
|---|---|---|
| 高峰 | 周一至周五 09:00–12:00、14:00–18:00 | ×2 |
| 空闲 | 其余时段（含周末全天） | ×0.5 |

> 已知边界：官方规则中「中国法定节假日全天空闲」在本插件里未内置节假日日历，节假日白天会被算作高峰。需要精确可在 `client.js` 的时段判断里接入节假日表。

## 目录结构

```
dsh-deepseek-peak-hint/
├── package.json        # bundle + client 声明（dsh.bundle.patch / dsh.client）
├── cordis.patch.yml    # 装载行
├── index.js            # Host 侧空实现（渲染全在 Client 侧）
├── client.js           # 时段时钟 + 落位 + 渲染
├── README.md           # 本文件
└── .gitignore
```

## 安装

本插件是一个普通的 DSH profile bundle：`package.json` 里 `dsh.bundle.patch` 指向装载行（`cordis.patch.yml`），`dsh.client` 声明 Web 客户端半侧。

用 Harness 的插件管理器把**本目录**作为本地 bundle 安装即可。它会以 `link:` 方式被 profile 引用，改完代码立即生效；停用/卸载走插件管理页。

## 实现要点

- **落位**：侧栏底部唯一的插槽 `sidebar.footer.action` 是一行紧凑动作，装不下块，且相对卡片的位置会随外壳 Layout 的重排而变化。因此插件把自带容器插到 `[data-dsh-usage-foot-card]`（[dsh-usage](https://github.com/zhu1090093659/dsh-web) 的稳定属性）**之前**，在 Layout 重排时用 `document.body` 上的 MutationObserver（300ms 去抖）把自身自动回位；卡片不存在时则退到设置行上方。
- **渲染**：自建 React root（`react-dom/client` 属于 DSH 平台模块表的种子词，无需声明 `external`）。样式只用主题变量（`--dsw-alias-*`），因此能跟随明暗主题，不引入额外主题切换逻辑。
- **文案**：通过 Client locale 服务注册 `dsh-deepseek-peak-hint` 词条（zh/en）；locale 服务不可用时回落内置词典。计价判断不依赖宿主时区。

## 验证

- 时段逻辑与独立 `Intl`（`Asia/Shanghai`）口径对照：自 2026-01-01 起 14 天逐分钟 **20160 个采样点 0 处不一致**，且每个采样点边界翻转正确、最少。
- 两种 Layout 重排顺序下都紧贴卡片上方，且始终只有一份（幂等）；侧栏缺失时不抛错。

## English

A tiny [DeepSeek Harness](https://github.com/deepseek-ai/dsh) Web UI plugin that pins a pill **directly above the usage plugin's 今日消费 card** in the sidebar foot, showing whether the DeepSeek API is currently in its peak (2×) or off-peak (½) billing window — Beijing time, Mon–Fri 09:00–12:00 and 14:00–18:00 are peak — with a countdown to the next switch. The hover tooltip carries the full schedule. Colors follow the active theme via `--dsw-alias-*` tokens; the schedule is computed in fixed Beijing time and does not depend on the host timezone.

## License

No LICENSE file is provided in this repository.
