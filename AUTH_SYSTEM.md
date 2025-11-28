# 用户认证系统文档

## 概述

这是一个完整的微信小程序用户认证系统，包括登录、注册、自动登录、token管理等功能。

## 系统架构

### 核心模块

1. **auth.js** - 认证服务模块
   - 微信登录（获取code）
   - 用户注册
   - Token管理（存储、刷新、过期检查）
   - 自动登录机制
   - 用户信息获取

2. **http.js** - HTTP请求拦截器
   - 自动添加authorization header
   - Token过期自动刷新
   - 统一错误处理
   - 文件上传功能

3. **app.js** - 应用级别的登录检查
   - 应用启动时检查登录状态
   - 自动登录逻辑
   - 全局数据管理

### 页面模块

1. **pages/login/login** - 登录注册页面
   - 微信一键登录
   - 用户注册（含头像上传）
   - Tab切换界面

2. **pages/user/user** - 用户中心
   - 显示用户信息
   - 退出登录
   - 编辑信息入口

## 工作流程

### 1. 应用启动流程

```
应用启动
  ↓
检查是否有有效token
  ↓
有效token → 获取用户信息 → 进入主页面
  ↓
无效或不存在 → 尝试自动登录
  ↓
自动登录成功 → 进入主页面
  ↓
自动登录失败 → 跳转到登录页
```

### 2. 登录流程

```
点击"微信一键登录"
  ↓
调用 wx.login() 获取 code
  ↓
发送 code 到后台获取 token
  ↓
保存 token 和过期时间到本地存储
  ↓
获取用户信息
  ↓
进入主页面
```

### 3. 注册流程

```
输入昵称 + 选择头像
  ↓
点击"完成注册"
  ↓
先进行微信登录（获取token）
  ↓
上传头像到后台
  ↓
发送用户信息到后台注册
  ↓
保存用户信息到本地存储
  ↓
进入主页面
```

### 4. Token刷新流程

```
请求API时返回 401
  ↓
自动调用刷新token接口
  ↓
获得新token并保存
  ↓
重试原请求
  ↓
返回结果
```

## API接口说明

### 认证相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `/auth/login` | POST | 微信登录（发送code）|
| `/auth/register` | POST | 用户注册 |
| `/auth/user/info` | GET | 获取用户信息 |
| `/auth/refresh-token` | POST | 刷新token |
| `/auth/upload-avatar` | POST | 上传头像 |

### 请求示例

#### 1. 微信登录

```javascript
POST /auth/login
{
  "code": "wx_code_from_wx_login"
}

Response:
{
  "code": 0,
  "data": {
    "token": "eyJhbGc...",
    "expires_in": 7200,
    "refresh_token": "refresh_token_xxx"
  }
}
```

#### 2. 用户注册

```javascript
POST /auth/register
{
  "nick_name": "用户昵称",
  "avatar": "http://xxx.com/avatar.jpg"
}

Response:
{
  "code": 0,
  "data": {
    "user_id": 123,
    "nick_name": "用户昵称",
    "avatar": "http://xxx.com/avatar.jpg"
  }
}
```

#### 3. 获取用户信息

```javascript
GET /auth/user/info
Header: Authorization: Bearer token

Response:
{
  "code": 0,
  "data": {
    "user_id": 123,
    "nick_name": "用户昵称",
    "avatar": "http://xxx.com/avatar.jpg",
    "created_at": "2024-01-01 10:00:00"
  }
}
```

## 使用指南

### 1. 在页面中使用认证服务

```javascript
import * as authService from '../../services/auth';

// 检查是否已登录
if (authService.hasValidToken()) {
  // 已登录，可以发送需要认证的请求
}

// 获取当前用户信息
const userInfo = authService.getUserInfo();

// 手动刷新用户信息
const result = await authService.fetchUserInfo();
```

### 2. 使用HTTP请求拦截器

```javascript
import * as http from '../../services/http';

// 发送GET请求（自动添加token）
const data = await http.get('/api/some-endpoint');

// 发送POST请求
const result = await http.post('/api/some-endpoint', {
  name: 'value'
});

// 上传文件
const uploadResult = await http.upload('/auth/upload-avatar', tempFilePath);
```

### 3. 处理登录过期

当用户token过期时，http.js会自动：
1. 尝试刷新token
2. 如果刷新成功，重试原请求
3. 如果刷新失败，跳转到登录页

开发者无需手动处理token过期的情况。

## 本地存储说明

系统使用以下键存储数据：

| 键名 | 说明 |
|-----|------|
| `USER_TOKEN` | 当前有效的token |
| `USER_INFO` | 用户信息（昵称、头像等） |
| `TOKEN_EXPIRE_TIME` | Token过期时间戳 |
| `REFRESH_TOKEN` | 刷新token（用于获取新token） |

## 配置说明

### 后台地址

当前系统使用的后台地址：`http://10.0.0.108`

如需修改，请在以下文件中更新：
- `services/auth.js` - `API_BASE_URL`
- `services/http.js` - `API_BASE_URL`
- `app.js` - `globalData.apiBaseUrl`

### Token过期时间

默认token过期时间为7200秒（2小时）

系统会在token过期前5分钟自动标记为过期，并触发刷新

## 安全注意事项

1. **Token存储**：Token存储在本地，建议使用HTTPS传输
2. **Token过期检查**：系统会自动检查token过期时间，无需手动管理
3. **请求签名**：所有需要认证的请求都会自动添加Authorization header
4. **错误处理**：401错误会自动触发token刷新和登录重定向

## 常见问题

### Q: 如何判断用户是否已登录？

```javascript
import * as authService from '../../services/auth';

if (authService.hasValidToken()) {
  // 已登录
} else {
  // 未登录
}
```

### Q: 如何在其他页面访问用户信息？

```javascript
// 方法1：从auth服务获取
import * as authService from '../../services/auth';
const userInfo = authService.getUserInfo();

// 方法2：从全局数据获取
const app = getApp();
const userInfo = app.globalData.userInfo;
```

### Q: Token过期后会自动处理吗？

是的，当请求返回401时，系统会自动：
1. 调用刷新token接口
2. 更新本地token
3. 重试原请求

开发者无需手动处理。

### Q: 如何实现退出登录？

```javascript
import * as authService from '../../services/auth';

authService.logout(); // 清除所有登录信息

wx.redirectTo({
  url: '/pages/login/login'
});
```

## 开发建议

1. **登录检查**：在需要认证的页面onLoad中检查登录状态
2. **错误处理**：为所有API请求添加try-catch处理
3. **用户体验**：在加载用户信息时显示loading，完成后隐藏
4. **调试**：使用console.log检查token和用户信息的存储情况

## 更新日志

### v1.0.0 (初始版本)
- ✅ 微信登录功能
- ✅ 用户注册功能
- ✅ 自动登录机制
- ✅ Token管理和刷新
- ✅ HTTP请求拦截器
- ✅ 用户中心页面
