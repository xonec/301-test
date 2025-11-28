# 快速开始指南

## ✅ 已修复的问题

- ✅ 所有 ES6 `import/export` 已转换为 CommonJS `require/module.exports`
- ✅ 所有认证服务已完整集成
- ✅ 登录页面和用户中心已创建
- ✅ 自动登录机制已实现

## 🚀 现在你可以做什么

### 1. 微信小程序调试
直接在微信开发者工具中打开项目，应用会自动：
- 检查本地是否有有效token
- 如果有，直接进入主页面（自动登录）
- 如果没有，跳转到登录页面

### 2. 测试登录流程
```
1. 点击"微信一键登录"按钮
2. 授权微信登录
3. 系统自动获取用户信息
4. 进入主页面
```

### 3. 测试注册流程
```
1. 点击"注册"选项卡
2. 点击"使用微信信息自动填充"（可选）
3. 输入昵称
4. 选择头像
5. 点击"完成注册"
```

### 4. 在其他页面使用认证

在任何页面中使用认证服务：

```javascript
const authService = require('../../services/auth');

// 检查是否已登录
if (authService.hasValidToken()) {
  // 已登录
  const userInfo = authService.getUserInfo();
  console.log('用户信息:', userInfo);
}

// 退出登录
authService.logout();
```

### 5. 发送需要认证的API请求

```javascript
const http = require('../../services/http');

// 发送GET请求（自动添加token）
const data = await http.get('/api/user/profile');

// 发送POST请求
const result = await http.post('/api/user/update', {
  nickName: '新昵称'
});
```

## 📁 项目结构

```
WeChatProjects-301-main/
├── services/
│   ├── auth.js          # 认证服务（核心逻辑）
│   └── http.js          # HTTP请求拦截器
├── pages/
│   ├── login/           # 登录注册页面
│   ├── user/            # 用户中心页面
│   ├── statistics-outer/  # 外包统计工具
│   ├── statistics-inner/  # 内包统计工具
│   └── statistics-std/    # 标准差计算工具
├── app.js               # 应用入口（包含自动登录逻辑）
├── app.json             # 应用配置（已注册登录页面）
└── AUTH_SYSTEM.md       # 详细文档
```

## 🔑 核心概念

### Token管理
- Token自动保存到本地存储（key: `USER_TOKEN`）
- Token过期时间自动记录
- 在token过期前5分钟自动标记为无效
- 过期时自动刷新

### 自动登录流程
```
应用启动
  ↓
检查本地token
  ↓
有效 → 获取用户信息 → 进入主页面
无效 ↓
  尝试微信自动登录
    ↓
    成功 → 进入主页面
    失败 → 跳转登录页
```

### API请求流程
```
发送请求
  ↓
自动添加token到header
  ↓
获得响应
  ↓
检查401（token过期）
  ↓
是 → 自动刷新token → 重试请求
否 → 返回结果
```

## ⚠️ 重要配置

### 后台地址
目前设置为：`http://10.0.0.108`

如需修改，请在以下文件中更新：
- `services/auth.js` 第12行: `const API_BASE_URL = '...'`
- `services/http.js` 第11行: `const API_BASE_URL = '...'`

### 本地存储键
系统使用以下键存储数据：
- `USER_TOKEN` - 当前token
- `USER_INFO` - 用户信息
- `TOKEN_EXPIRE_TIME` - token过期时间
- `REFRESH_TOKEN` - 刷新token

## 🐛 常见错误及解决方案

### 错误：module not found
**原因**：模块导入路径错误

**解决**：检查导入语句，确保使用相对路径
```javascript
// ✅ 正确
const authService = require('../../services/auth');

// ❌ 错误
const authService = require('services/auth');
```

### 错误：token自动刷新失败
**原因**：后台没有实现 `/auth/refresh-token` 接口

**解决**：在后台实现该接口，返回新token

### 错误：获取用户信息失败
**原因**：后台没有实现 `/auth/user/info` 接口

**解决**：在后台实现该接口，返回用户信息

## 📞 需要帮助？

1. 查看 `AUTH_SYSTEM.md` 获取完整API文档
2. 检查浏览器控制台的错误信息
3. 查看网络请求是否正确发送

## 🎉 下一步

1. 在后台实现对应的API接口
2. 修改后台地址为实际服务器地址
3. 在其他页面集成认证逻辑
4. 进行端到端测试

祝你使用愉快！✨
