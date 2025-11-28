# LikeAdmin 小程序认证集成 - 快速开始

## 🎯 核心更新

您的认证系统已根据 **MCP 服务器提供的 LikeAdmin API** 进行了更新。

### 关键接口信息

| 功能 | 端点 | 方法 | 格式 |
|------|------|------|------|
| 小程序登录 | `/api/login/mnpLogin` | POST | form-urlencoded |
| 更新用户信息 | `/api/login/updateUser` | POST | multipart/form-data |
| 获取用户信息 | `/api/user/getUserInfo` | GET | application/json |
| 刷新 Token | `/api/login/refresh` | POST | application/json |

## 🚀 立即开始（3 个步骤）

### 第 1 步：配置后台地址

编辑 `authModule.js`，修改第 11 行：

```javascript
const CONFIG = {
  // 改成你的 LikeAdmin 服务器地址
  API_BASE_URL: 'http://10.0.0.108',  // ← 改这里！
  USE_MOCK: false,
  ENDPOINTS: {
    LOGIN: '/api/login/mnpLogin',
    // ... 其他端点
  }
};
```

### 第 2 步：微信域名配置

1. 登录 [微信小程序官方平台](https://mp.weixin.qq.com)
2. 进入 **开发** → **开发管理** → **服务器域名**
3. 添加你的 LikeAdmin 服务器域名（如 `http://10.0.0.108`）
4. 点击保存

### 第 3 步：编译测试

1. 在微信开发者工具中点击 **编译**
2. 等待编译完成
3. 点击 **小程序登录** 按钮测试

## 📝 常见问题

### Q: 报错 "404 (Not Found)"

**原因**：后台服务地址或接口不正确

**解决**：
1. 确保 LikeAdmin 服务正在运行
2. 验证 `API_BASE_URL` 配置是否正确
3. 用 curl 测试接口：
   ```bash
   curl -X POST http://10.0.0.108/api/login/mnpLogin \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "code=test_code"
   ```

### Q: 报错 "ERR_BLOCKED_BY_CLIENT"

**原因**：域名未在微信小程序后台配置

**解决**：按照 **第 2 步** 配置微信域名

### Q: 想在没有后台的情况下测试应用

**解决**：启用 Mock 模式

编辑 `authModule.js`，第 15 行改为：
```javascript
USE_MOCK: true  // 启用模拟数据
```

然后重新编译。应用会使用假数据完成所有操作。

## 🔄 认证流程

```
微信小程序启动
    ↓
检查本地 Token 是否有效
    ↓
├─ 有效 → 自动登录成功
└─ 无效 → 用户点击"微信登录"
    ↓
获取微信登录凭证 (code)
    ↓
发送到后台 /api/login/mnpLogin
    ↓
后台验证并返回 token
    ↓
保存 token 到本地存储
    ↓
获取用户信息 /api/user/getUserInfo
    ↓
登录完成，进入主页面
```

## 📋 文件说明

| 文件 | 说明 |
|------|------|
| `authModule.js` | 认证核心模块，所有认证逻辑都在这里 |
| `app.js` | 应用入口，实现自动登录检查 |
| `pages/login/login.js` | 登录页面逻辑 |
| `pages/user/user.js` | 用户中心页面 |
| `API_CONFIG_GUIDE.md` | 详细的 API 配置和故障排除指南 |
| `LIKEADMIN_QUICK_START.md` | 本文件 |

## 🎨 重要 API

### 登录

```javascript
const authService = require('../../authModule');

// 执行微信登录
const result = await authService.wechatLogin();
if (result.success) {
  console.log('登录成功，Token:', result.token);
} else {
  console.log('登录失败:', result.error);
}
```

### 获取当前登录状态

```javascript
if (authService.hasValidToken()) {
  console.log('用户已登录');
} else {
  console.log('用户未登录');
}
```

### 获取用户信息

```javascript
const userInfo = authService.getUserInfo();
console.log('用户昵称:', userInfo.nickname);
console.log('用户头像:', userInfo.avatar);
```

### 更新用户信息

```javascript
// 更新用户昵称和头像
const result = await authService.updateUser(nickName, avatarUrl);
if (result.success) {
  console.log('更新成功:', result.data);
} else {
  console.log('更新失败:', result.error);
}
```

### 退出登录

```javascript
authService.logout();
// 然后导航回登录页面
wx.redirectTo({
  url: '/pages/login/login'
});
```

## 🛠️ 故障排除

### 第一步：查看控制台日志

1. 打开微信开发者工具
2. 点击 **Console** 标签
3. 查看是否有错误信息
4. 注意 `请求失败:` 开头的日志，这些包含具体的 URL 和错误码

### 第二步：手动测试接口

使用 curl 或 Postman 测试后台接口是否可用：

```bash
# 测试登录接口
curl -X POST http://10.0.0.108/api/login/mnpLogin \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "code=test_code_123"

# 预期响应（成功）
{
  "code": 0,
  "msg": "登录成功",
  "data": {
    "token": "...",
    "refresh_token": "...",
    "expires_in": 7200,
    "user_id": "..."
  }
}

# 预期响应（失败）
{
  "code": 4041,
  "msg": "登录失败: code 无效"
}
```

### 第三步：启用 Mock 模式验证应用逻辑

如果后台有问题，可以先用 Mock 模式验证应用是否能正常工作：

```javascript
// authModule.js 第 15 行
USE_MOCK: true
```

如果 Mock 模式下应用正常，说明应用逻辑没问题，只是后台配置有问题。

## 📞 需要帮助？

检查清单：

- [ ] 修改了 `authModule.js` 中的 `API_BASE_URL`？
- [ ] 在微信小程序后台配置了服务器域名？
- [ ] 用 curl 测试过接口，确保后台正常运行？
- [ ] 在微信开发者工具中查看过 Console 日志？
- [ ] 尝试过 Mock 模式来验证应用逻辑？
- [ ] 清除过微信开发者工具的编译缓存？

完成以上步骤后，问题应该能得到解决！

## 🔐 安全提示

- ⚠️ **不要**在代码中硬编码敏感信息（如 AppSecret）
- ⚠️ **生产环境**必须使用 HTTPS
- ⚠️ Token 信息已自动保存到本地，避免泄露
- ✅ 所有网络请求都会自动添加 Token（Bearer 认证）
- ✅ Token 过期时会自动刷新

## 📚 更多信息

- 详细的配置指南：查看 `API_CONFIG_GUIDE.md`
- LikeAdmin 官方文档：https://doc.likeadmin.cn/
- 微信小程序文档：https://developers.weixin.qq.com/miniprogram/dev/framework/
- MCP 服务器项目 ID：1363339

---

**最后更新**：2024-11-28  
**状态**：✅ 已集成 LikeAdmin API（基于 MCP 服务器定义）
