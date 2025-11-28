# API 配置指南

## 接口信息（来自 MCP 服务器）

### 小程序登录接口

**端点**: `/api/login/mnpLogin` 
**方法**: POST  
**请求格式**: `application/x-www-form-urlencoded`  
**服务器**: `http://www.likeadmin.localhost` 或你配置的 LikeAdmin 服务器地址

**请求参数**:
```
code: 微信登录凭证
```

**响应格式**:
```json
{
  "code": 0,
  "msg": "登录成功",
  "data": {
    "token": "access_token_string",
    "refresh_token": "refresh_token_string",
    "expires_in": 7200,
    "user_id": "user_id"
  }
}
```

### 2. 更新用户信息接口

**端点**: `/api/login/updateUser`  
**方法**: POST  
**请求格式**: `multipart/form-data`  
**认证**: 最需要在请求头中添加 `Authorization: Bearer {token}`

**请求参数**:
```
nickname: 昵称 (string)
avatar: 头像 URL (string)
```

**响应格式**:
```json
{
  "code": 0,
  "msg": "更新成功",
  "data": {
    "user_id": "user_id",
    "nickname": "昵称",
    "avatar": "头像URL"
  }
}
```

## 问题说明

如果遇到 `404 (Not Found)` 错误，表示后台服务地址或接口路径有问题。

```
POST http://10.0.0.108/api/login/mnpLogin 404 (Not Found)
```

## 解决方案

### 1. 快速测试（使用 Mock 模式）

如果后台服务还未部署，可以先启用 Mock 模式进行开发测试：

编辑 `authModule.js` 第 15 行：

```javascript
// 配置项
const CONFIG = {
  API_BASE_URL: 'http://10.0.0.108',
  
  // 改为 true 启用 Mock 模式（无需后台，可以进行功能测试）
  USE_MOCK: true,  // ← 改这里
  
  ENDPOINTS: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    USER_INFO: '/auth/user/info',
    REFRESH_TOKEN: '/auth/refresh-token',
    UPLOAD_AVATAR: '/auth/upload-avatar'
  }
};
```

启用后，应用会使用模拟数据完成登录、注册等操作，无需实际的后台服务。

### 2. 生产环境配置

根据你的后台框架和部署方式，修改以下配置：

#### 本地开发

```javascript
const CONFIG = {
  API_BASE_URL: 'http://localhost:8000',  // 本地后台地址
  USE_MOCK: false,
  // ... endpoints
};
```

#### 测试服务器

```javascript
const CONFIG = {
  API_BASE_URL: 'http://10.0.0.108',  // 测试服务器地址
  USE_MOCK: false,
  // ... endpoints
};
```

#### 线上服务

```javascript
const CONFIG = {
  API_BASE_URL: 'https://api.example.com',  // 线上 API 地址
  USE_MOCK: false,
  // ... endpoints
};
```

### 3. 不同框架的接口端点配置

根据你的后台框架，可能需要调整接口端点：

#### LikeAdmin PHP/Java 版（推荐）

```javascript
const CONFIG = {
  API_BASE_URL: 'http://10.0.0.108',  // 改成你的 LikeAdmin 服务器地址
  USE_MOCK: false,
  ENDPOINTS: {
    LOGIN: '/api/login/mnpLogin',           // 小程序登录（从 MCP 服务器获取）
    REGISTER: '/api/login/mnpLogin',        // 先用登录接口，后续可根据实际接口调整
    USER_INFO: '/api/user/getUserInfo',     // 获取用户信息（待确认）
    REFRESH_TOKEN: '/api/login/refresh',    // 刷新 token（待确认）
    UPLOAD_AVATAR: '/api/user/uploadAvatar' // 上传头像（待确认）
  }
};
```

重要注意：
- **登录请求使用 form 格式**: 已自动处理，可不需手动设置
- **其他请求使用 JSON 格式**: 默认配置
- 记住修改 `API_BASE_URL` 为你的实际服务器地址！

#### 自定义框架

如果接口路径不同，修改 `ENDPOINTS` 对象：

```javascript
ENDPOINTS: {
  LOGIN: '/api/v1/auth/login',           // 根据实际调整
  REGISTER: '/api/v1/auth/register',
  USER_INFO: '/api/v1/user/profile',
  REFRESH_TOKEN: '/api/v1/auth/refresh',
  UPLOAD_AVATAR: '/api/v1/user/avatar'
}
```

### 4. 微信小程序域名配置

如果遇到网络请求被阻止，需要在微信小程序后台配置服务器域名：

1. 登录 [微信小程序官方平台](https://mp.weixin.qq.com)
2. 进入 **开发** → **开发管理** → **服务器域名**
3. 添加你的后台服务域名（如 `http://10.0.0.108` 或 `https://api.example.com`）
4. 点击保存提交

**重要**：
- 服务器域名必须是 HTTPS（生产环境）
- HTTP 仅限开发调试
- 需要验证域名所有权

### 5. 常见问题排查

#### 错误：`404 (Not Found)`

**原因**：
1. 后台服务地址错误
2. 接口路径不正确
3. 后台服务未启动

**解决**：
1. 检查 `API_BASE_URL` 是否正确
2. 确认后台服务正在运行
3. 验证接口路径与后台框架一致
4. 使用 Mock 模式测试应用逻辑

#### 错误：`ERR_BLOCKED_BY_CLIENT`

**原因**：
- 域名未在微信小程序后台配置

**解决**：
- 在微信小程序官方平台配置服务器域名

#### 错误：`ERR_INVALID_URL`

**原因**：
- URL 格式不正确

**解决**：
- 确保 `API_BASE_URL` 格式正确（包含协议）
- 示例：`http://localhost:8000` 或 `https://api.example.com`

### 6. 后台接口规范

#### LikeAdmin 小程序登录接口 (POST /api/login/mnpLogin)

**请求格式**: application/x-www-form-urlencoded

请求样例：
```
code=weixin_code_from_wx_login
```

响应样例：
```json
{
  "code": 0,
  "msg": "登录成功",
  "data": {
    "token": "eyJhbGc...",
    "refresh_token": "refresh_eyJhbGc...",
    "expires_in": 7200,
    "user_id": "123456"
  }
}
```

---

#### 其他接口（需要从 MCP 服务器查询或与后端确认）

以下接口需要你从 MCP 服务器（项目 ID: 1363339）或与后端开发者确认具体的端点、请求格式和响应格式：

- **获取用户信息**: `/api/user/getUserInfo` (GET)
- **刷新 Token**: `/api/login/refresh` (POST)
- **上传头像**: `/api/user/uploadAvatar` (POST)
- **用户注册**: 待确认

#### 快速测试接口

使用 curl 测试小程序登录接口：

```bash
curl -X POST http://10.0.0.108/api/login/mnpLogin \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "code=test_code_123"
```

如果收到成功响应，说明后台服务和接口都已正确配置。

## 使用方法示例

### 启用 Mock 模式进行开发

```javascript
// authModule.js 第 15 行
const CONFIG = {
  API_BASE_URL: 'http://10.0.0.108',
  USE_MOCK: true,  // 启用 Mock
  // ...
};
```

然后应用可以正常运行，所有登录/注册操作都会使用 Mock 数据。

### 切换到实际后台

```javascript
// authModule.js 第 15 行
const CONFIG = {
  API_BASE_URL: 'http://10.0.0.108',  // 后台真实地址
  USE_MOCK: false,  // 禁用 Mock
  // ...
};
```

## 调试技巧

1. **查看控制台日志**：
   - 打开微信开发者工具的 Console 标签
   - 观察请求日志了解具体错误信息

2. **使用网络工具测试**：
   - 用 Postman 或 curl 测试后台接口
   - 确保接口可以正常调用

3. **启用详细日志**：
   - 所有网络错误都会输出到控制台
   - 包括请求 URL、错误信息等

## 联系支持

如果按照以上步骤仍无法解决问题，请提供：
1. 错误信息和完整的控制台日志
2. 后台框架版本和配置
3. 微信小程序配置截图
4. 网络请求的 Postman 测试结果
