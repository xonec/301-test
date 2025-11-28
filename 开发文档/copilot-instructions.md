# Copilot Instructions for This Repo

## 项目概览
- 本仓库是一个微信小程序 demo，基于 `tdesign-miniprogram` UI 组件库，主要用于展示各类组件用法。
- 小程序入口在 `app.js`/`app.json`，页面代码位于 `pages/`，自定义通用组件位于 `components/`，第三方 UI 库在 `miniprogram_npm/tdesign-miniprogram/`。
- `project.config.json` 中已经配置了调试入口、Skyline 渲染等开发者工具选项，不需要在代码中重复处理这些配置。

## 架构与页面结构
- 每个页面位于 `pages/<name>/` 下，通常包含 `index.js`/`<name>.js`、`<name>.wxml`、`<name>.wxss`、`<name>.json` 四个文件，遵循标准小程序 Page 结构。
- 首页 `pages/home/home.*` 是组件导航中心：
  - `home.js` 通过 `import themeChangeBehavior from 'tdesign-miniprogram/mixins/theme-change'` 添加主题切换行为，更新页面数据时要通过 `this.setData`。
  - 组件列表数据从 `./data/index` 导入（普通模式 `list` 与 Skyline 模式 `skylineList`），根据 `options.skyline` 切换。
  - `clickHandle` 从 `pull-down-list` 的 `e.detail.item` 中读取 `name/path`，未显式配置 `path` 时按驼峰转 kebab 的规则生成路径：
    - 首字母转小写；
    - 其余大写字母前插入 `-` 并转小写；
    - 生成 `/pages/<kebab-name>/<[skyline/]kebab-name>`。
  - 新增示例页面时应保证文件夹和页面路径与该转换规则匹配，或者给数据显式提供 `path` 字段。
- `app.js` 在 `onShow` 中通过 `gulpError` 将构建错误重定向到 `pages/gulp-error/index`，不要移除或绕过这段逻辑：
  - `gulpError` 从 `./utils/gulpError` 导入，当值不是 `'gulpErrorPlaceHolder'` 时会 `wx.redirectTo` 到错误页面。

## 自定义组件模式
- 自定义组件放在 `components/` 下，通常包含 `index.js`、`index.wxml`、`index.wxss`、`index.json`，遵循小程序 `Component` API：
  - `components/demo-block/`：
    - 在 `index.js` 中使用 `Component({ options: { multipleSlots: true }, properties: { ... }, methods: { clickHandle } })`。
    - 事件通过 `this.triggerEvent('clickoper', type)` 向父组件冒泡，新增事件时保持命名风格（形如 `click***`，事件名小写连字符或小写单词）。
  - `components/pull-down-list/`：
    - 通过 `externalClasses: ['t-class']` 暴露外部样式类，新增样式扩展时优先使用外部类而不是硬编码选择器。
    - `childArr` 有 `observer`，根据 `defaultOpen` 自动设置 `childBoxHeight`，折叠/展开通过修改 `childBoxHeight` 完成；新增交互时避免直接操作 DOM，改动必须通过 data。
    - 点击子项通过 `this.triggerEvent('click', e.target.dataset)` 将 `dataset` 透传给父组件，父级如 `home.wxml` 中用 `bind:click="clickHandle"` 接收，需要保证 `data-` 属性命名与 `home.js` 中的消费结构兼容（`e.detail.item` 等）。
  - 隐私组件 `components/trd-privacy/`：
    - 在 `home.js` 通过 `this.selectComponent('#trdPrivacy')` 获取实例，并调用 `showPrivacyWin` 方法；扩展其它页面的隐私弹窗逻辑时复用这一模式。

## 第三方 UI 组件使用
- TDesign 组件统一从 `tdesign-miniprogram` 引入，示例：
  - 页面 `usingComponents` 中定义：
    ```json
    {
      "usingComponents": {
        "t-footer": "tdesign-miniprogram/footer/footer",
        "trd-privacy": "/components/trd-privacy/privacy",
        "pull-down-list": "../../components/pull-down-list"
      }
    }
    ```
  - WXML 中直接写 `<t-footer />` 等标签。
- 组件 demo 页面位于 `pages/<component>/`（如 `pages/button/`、`pages/dialog/`），实现方式应优先参考 `miniprogram_npm/tdesign-miniprogram/<component>/` 下的官方用法。

## 开发与调试工作流
- 本项目依赖微信开发者工具运行和预览：
  - 在 IDE 中打开当前项目根目录，配置 `appid`（已在 `project.config.json` 中填写）。
  - 运行/预览时不要手动改动 `project.config.json` 中的路径配置，以免破坏预设的调试入口列表（`condition.miniprogram.list`）。
- 构建异常处理：
  - 若 gulp 构建出错，`utils/gulpError.js` 会包含错误信息，并在小程序启动时自动跳转 `pages/gulp-error/index`；修改脚本或构建流程时，确保该文件仍然能被 `app.js` 正常导入和读取。

## 代码风格与约定
- JavaScript 使用 ES6 语法但保持小程序环境兼容，通常不使用 TypeScript；新文件保持和现有文件相同的模块导入与函数写法（普通函数而非箭头函数作为 Page/Component 方法）。
- 页面与组件数据更新一律通过 `this.setData`，不要直接修改 `this.data` 后期望自动刷新。
- 事件命名：
  - WXML 中统一使用 `bind:` 前缀（如 `bindtap="goSkyline"`、`bind:click="clickHandle"`）。
  - 组件内部触发事件时使用语义化名称（如 `clickoper`、`click`），外部监听者从 `e.detail` 读取业务数据。
- 资源路径：
  - 图片等静态资源放在 `assets/` 下，通过 `/assets/...` 绝对路径引用；新增资源时沿用命名风格（如 `TDesign-logo_dark.png` / `TDesign-logo_light.png`）。

## 适合让 AI 做的改动
- 新增 demo 页面或补充现有组件示例，前提是：
  - 将页面路径与 `home` 页列表数据对应好（`list/skylineList`）；
  - 在 `pages/<component>/` 下按现有结构创建文件并注册 `usingComponents`。
- 封装公共逻辑：
  - 可将重复的导航、参数解析等逻辑抽取到 `utils/` 中，但要保持与 `home.js` 中既有的使用方式兼容（例如 `getQueryByUrl` 的行为）。




### 核心技术规范

保持视觉整洁。采用标准微信小程序尺寸比例（375x667像素）。**特别禁止：不得使用localStorage、sessionStorage等浏览器存储API，必须使用内存存储方案。**

### 设计系统要求

**配色方案：**采用浅色暖色调，避免深色或过于饱和的颜色，严禁使用蓝紫渐变色。**视觉效果：**严格控制装饰元素使用，避免过度的渐变、玻璃效果和圆角设计。**图标系统：**使用手绘SVG图标，严禁使用emoji表情符号，禁用简单色块占位符。**组件多样性：**采用列表式、卡片式、表格式等多种布局形式，避免设计元素单一化。**专业度：**确保界面具备企业级产品的成熟度和专业感。**角色差异化：**根据不同用户角色设计专门的界面流程和底部导航结构。


---

如有未覆盖的约定、工作流或你希望特别强调的注意事项，请告诉我，我可以据此细化或调整本说明。