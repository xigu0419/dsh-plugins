# DSH Plugins

DeepSeek Harness（DSH）Web 界面插件合集。
本仓库采用「一个插件一个子目录」的组织方式，每个插件可独立安装、独立维护。

## 插件列表

| 插件 | 说明 | 状态 |
|---|---|---|
| [dsh-deepseek-peak-hint](./dsh-deepseek-peak-hint) | 在左侧边栏底部、**「今日消费」卡片正上方**常驻提示，显示 DeepSeek API 当前处于高峰还是空闲计价时段，并倒计时到下一次切换。 | ✅ 可用 |

## 安装方式

每个插件都是标准的 DSH profile bundle：

- `package.json` 里的 `dsh.bundle.patch` 指向装载行（`cordis.patch.yml`）
- `dsh.client` 声明 Web 客户端的注入方式
- 插件目录可被插件管理器以 **本地 bundle** 形式安装，你会看到 profile 里以 `link:` 方式引用它 —— 这样改完代码立即生效

具体安装步骤、依赖与说明请看各插件子目录里的 README。

## 目录约定

```
/                           # 仓库根目录 = 插件合集
├── README.md               # 本文件，插件索引
└── <plugin-name>/          # 一个插件占一个子目录
    ├── package.json        # bundle + client 声明
    ├── cordis.patch.yml    # 装载行
    ├── index.js            # Host 侧实现
    ├── client.js           # Client（Web）侧实现
    ├── README.md           # 插件自身的说明
    └── .gitignore
```

## 给开发者

### 加一个新插件

1. 在根目录新建一个 `<plugin-name>/` 子目录
2. 照抄 `dsh-deepseek-peak-hint/` 的结构
3. 更新本文件的插件列表表格
4. 提交并推送（或用你习惯的方式 PR）

### 版本管理习惯（建议）

- 一次提交只做一件事，提交信息写清楚"做了什么、为什么"
- 大改动前先想好要不要开分支
- 稳定能用的状态打 tag（例如 v1.1.0）

## 许可

本仓库未附带 LICENSE 文件。
