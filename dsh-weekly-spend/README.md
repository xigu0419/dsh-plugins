# dsh-weekly-spend

DeepSeek Harness（DSH）Web 界面插件：在侧边栏底部「今日消费」卡片**内部**、今日金额的正下方追加一行 **本周消费总量**（自然周，周一为一周起点，含今天）。

> 看批量的活儿做到哪、这周花多少，不用再手动加。

## 功能

- 在「今日消费」卡片里多出一行 **本周消费总量**，数值为该周一 00:00（本地时间）起累计的消费金额
- 与卡片自身刷新节奏一致，每 30 秒读取一次用量总览，页面隐藏时暂停，重新可见时立即刷新
- 卡片被宿主重新渲染（轮询、折叠/展开）后自动回位：`document.body` 上的 MutationObserver，300ms 去抖
- 文案走 Client locale 服务（zh/en），locale 不可用时回落内置词典；样式只用继承色 + 透明度，跟随明暗主题
- 请求失败时保留上一次的数值，不出现错误行；卡片不存在（用量插件停用）时本行一并消失

## 安装

本插件是一个标准的 DSH profile bundle。用 Harness 的插件管理器把**本目录**作为本地 bundle 安装即可。

它会以 `link:` 方式被 profile 引用，因此改完 `client.js` 刷新页面即生效；停用/卸载走插件管理页。

## 数据结构

插件只读 `@linxin666/dsh-usage` 已有的同源端点，不引入任何后端改动：

```
GET api/dsh-usage/overview
→ { usage: { days: [{ date: "YYYY-MM-DD", totals: { cost: number, … } }, …] } }
```

`days` 为升序的本地日期列表，最后一项即今天。插件取其中落在当前自然周（周一起）的条目，累加 `totals.cost` 得到本周消费——与「今日消费」同一套折叠时刻估算口径，所以两个数字可以直接相加对照。

URL 写成文档相对路径（`api/dsh-usage/overview`，与 dsh-usage 自己的写法一致），子路径部署下同样解析到正确位置。

## 实现说明

- **落位**：卡片结构是 `<div data-dsh-usage-foot-card>` → `<div data-dsh-part="foot-card">`（有样式的卡面）→ `<button data-dsh-part="foot-card-main">`（正文）。本行插在头条（今日消费）与 `[data-dsh-part="foot-card-usage"]`（tokens/调用次数行）**之间**，因此位于同一个卡面内、紧贴今日金额；卡片被重建时由观察者重新落位。只依赖这些 `data-dsh-part` 公开钩子，不引用 dsh-usage 的哈希类名。
- **数据**：`fetch('api/dsh-usage/overview', { credentials: 'same-origin' })`；宿主已对该端点做权限校验。
- **不侵入**：不改动 dsh-usage 代码，不订阅它的内部状态，只在 DOM 层追加一个静态信息行。
- **生命周期**：行、定时器、观察者、监听器全部注册在 `ctx.effect` 里，插件停用时一次性移除。

## 目录结构

```
dsh-weekly-spend/
├── package.json        # bundle + client 声明（dsh.bundle.patch / dsh.client）
├── cordis.patch.yml    # 装载行
├── index.js            # Host 侧空实现（渲染全在 Client 侧）
├── client.js           # 周统计 + 落位 + 渲染
├── README.md           # 本文件
└── .gitignore
```

## 已知边界

- 周界按本地时区、周一零点计算；跨周/跨年同理
- 折叠成一行摘要条（strip）时不显示本行——那一行是另一种版面，塞不下第二个数字；展开后即出现
- dsh-usage 未挂载卡片时（插件停用、页签未就绪）本行不显示
- 只展示金额（`¥`），不显示 token 数
- 如果 dsh-usage 改了 `data-dsh-part` 钩子或 `usage.days` 结构，本插件需要跟着适配
