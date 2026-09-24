# DSH Plugins

DeepSeek Harness（DSH）Web 界面插件合集。每个插件是仓库下的一个独立子目录，可单独安装使用。

## 插件列表

| 插件 | 说明 |
| --- | --- |
| [dsh-deepseek-peak-hint](./dsh-deepseek-peak-hint) | 在左侧边栏底部、**「今日消费」卡片正上方**常驻一块提示，显示 DeepSeek API 当前处于**高峰**还是**空闲**计价时段，并倒计时到下一次切换。 |

## 安装方式

每个插件都是标准的 DSH profile bundle：子目录里的 `package.json` 用 `dsh.bundle.patch` 指向装载行、用 `dsh.client` 声明 Web 客户端半侧。

把对应子目录作为**本地 bundle** 安装进你的 DSH profile 即可；profile 会以 `link:` 方式引用该目录，改完即生效，停用/卸载走插件管理页。具体依赖与注意事项见各插件自己的 README。

## 目录约定

```
<插件名>/             # 一个插件一个目录，目录名即包名去掉 scope
  package.json        # bundle + client 声明
  cordis.patch.yml    # 装载行
  index.js            # Host 侧实现
  client.js           # Client（Web）侧实现
  README.md           # 该插件的说明
```

## 许可

本仓库未附带 LICENSE 文件。
