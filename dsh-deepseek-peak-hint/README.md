# dsh-deepseek-peak-hint

DeepSeek Harness（DSH）Web 界面插件：在左侧边栏底部、**「今日消费」卡片正上方**常驻一块提示，显示当前处于 DeepSeek API 的**高峰**还是**空闲**计价时段，以及距离下一次切换的倒计时。

- 🟢 `空闲·半价` —— 按高峰价的一半计费
- 🟠 `高峰·双倍` —— 价格是空闲时段的两倍，大批量任务适合挪到空闲时段
- 悬停显示完整时刻表、当前时段、下次切换的北京时间、价格行
- 侧栏折叠为 56px 栏轨时只保留状态圆点

## 计价规则

按 DeepSeek 官方定价页（[api-docs.deepseek.com/zh-cn/quick_start/pricing](https://api-docs.deepseek.com/zh-cn/quick_start/pricing)），以**北京时间**（UTC+8，无夏令时）计算：

| 时段 | 时间 | 计价 |
| --- | --- | --- |
| 高峰 | 周一至周五 09:00–12:00、14:00–18:00 | ×2 |
| 空闲 | 其余时段（含周末全天） | ×0.5 |

> 已知边界：官方规则中「中国法定节假日全天空闲」在本插件里未内置节假日日历，节假日的白天会被算作高峰。需要精确时可在 `client.js` 的时段判断里接入节假日表。

## 目录结构

```
package.json        # bundle + client 声明（dsh.bundle.patch / dsh.client）
cordis.patch.yml    # 装载行
index.js            # Host 侧空实现（渲染全在 Client 侧）
client.js           # 时段时钟 + 落位 + 渲染
```

## 安装

本插件是一个普通的 DSH profile bundle（`package.json` 里 `dsh.bundle.patch` 指向装载行，`dsh.client` 声明 Web 客户端半侧）。安装方式：用 Harness 的插件管理器把**本目录**作为本地 bundle 安装，它会被 profile 以 `link:` 方式引用，改完即生效；停用/卸载走同一处的插件页即可。

## 实现要点

- **落位**：侧栏底部唯一的插槽 `sidebar.footer.action` 是一行紧凑动作，装不下块，且它相对卡片的位置会随壳的重排变化。因此本插件把自带容器插到 `[data-dsh-usage-foot-card]`（[dsh-usage](https://github.com/zhu1090093659/dsh-web) 的稳定属性）**之前**，并用 `document.body` 的 MutationObserver（300ms 去抖）在被 React 重排挤走时自动回位；卡片不存在时退到设置行上方。
- **渲染**：自建 React root（`react-dom/client` 属于 DSH 平台模块表的种子词，无需声明 `external`），样式只用主题 token（`--dsw-alias-*`），跟随明暗主题。
- **文案**：通过 Client locale 服务注册 `dsh-deepseek-peak-hint` 字典（zh/en）；服务不可用时回落到内置字典。计价时段判断不依赖宿主时区。

## 验证

- 时段时钟与独立的 `Intl`（`Asia/Shanghai`）口径对照：自 2026-01-01 起 14 天逐分钟 **20160 个采样点 0 处不一致**，且每个采样点的边界翻转正确、最小。
- 落位在两种壳重排顺序下都紧贴卡片上方，且始终只有一份（幂等）；侧栏缺失时不抛错。

## English

A tiny DSH Web UI plugin that pins a pill **directly above the usage plugin's 今日消费 card** in the sidebar foot, showing whether the DeepSeek API is currently in its peak (2×) or off-peak (½) billing window — Beijing time, Mon–Fri 09:00–12:00 and 14:00–18:00 are peak — with a countdown to the next switch and a hover tooltip carrying the full schedule.

## 许可

本仓库未附带 LICENSE 文件。
