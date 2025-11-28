# 注册失败调试指南

## 问题现象
- ✅ 管理后台能看到新用户
- ❌ 小程序显示"注册失败"
- ❌ 用户的昵称和头像没有更新到后台

## 调试步骤

### 1️⃣ 打开开发者工具控制台
1. 在微信开发者工具中选择 **Console** 标签
2. 刷新小程序（Ctrl+R 或 Cmd+R）
3. 执行注册操作

### 2️⃣ 查看控制台输出

你应该能看到以下日志序列：

```
[登录页] 开始注册 {nickName: "你的昵称", avatarUrl: "file://..."}
[request] 准备发送请求 {url: "http://10.0.0.108/api/login/mnpLogin", ...}
[request] 响应成功 {statusCode: 200, data: {...}}
登录成功 {token: "xxx", ...}
[登录页] 微信登录结果: {success: true, token: "xxx"}
[登录页] 开始更新用户信息
[request] 准备发送请求 {url: "http://10.0.0.108/api/login/updateUser", ...}
[request] 响应成功 {statusCode: 200, data: {...}}
准备更新用户信息: {url: "/api/login/updateUser", nickname: "...", ...}
更新用户信息响应: {code: 0, msg: "成功", ...}
更新成功 {updated: {...}, response: {...}}
[登录页] 更新结果: {success: true, ...}
```

### 3️⃣ 常见问题

#### 问题 A：登录失败
日志显示：
```
登录响应错误 {code: 非0, msg: "..."}
```

**可能原因**：
- AppID 配置错误
- 微信服务器问题
- 网络连接问题

**解决方案**：
- 检查 `project.config.json` 中的 AppID 是否正确设置
- 确认后台服务地址 `http://10.0.0.108` 能否访问

#### 问题 B：更新用户信息失败
日志显示：
```
更新失败 {code: 非0, msg: "..."}
```

**可能原因**：
- 参数格式错误（应该是 `nickname` 和 `avatar`）
- Token 无效或过期
- 后台接口返回错误

**解决方案**：
查看 updateUser 的请求：
```
[request] 准备发送请求 {
  url: "http://10.0.0.108/api/login/updateUser",
  method: "POST",
  contentType: "multipart/form-data",
  headers: {Authorization: "Bearer xxx"},
  data: {nickname: "...", avatar: "..."}
}
```

检查：
- ✅ 参数名是否为 `nickname` 和 `avatar`
- ✅ Authorization header 是否包含 token
- ✅ contentType 是否为 `multipart/form-data`

#### 问题 C：响应格式错误
日志显示：
```
更新失败 {code: undefined, msg: undefined}
```

**可能原因**：
- 后台返回的响应格式不是预期的 JSON
- 后台返回了 HTML 错误页面（例如 404 或 500）

**解决方案**：
检查 Network 标签中的 `/api/login/updateUser` 请求：
1. 打开微信开发者工具的 **Network** 标签
2. 执行注册操作
3. 找到 `updateUser` 请求
4. 查看 **Response** 选项卡
5. 确认响应格式是否为：
```json
{
  "code": 0,
  "msg": "成功",
  "data": {
    "nickname": "...",
    "avatar": "...",
    "user_id": "..."
  }
}
```

### 4️⃣ Network 标签检查

在微信开发者工具中打开 **Network** 标签：

#### 请求 1: mnpLogin
```
POST http://10.0.0.108/api/login/mnpLogin
Content-Type: application/x-www-form-urlencoded
Body: code=...

Response (应该是):
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
```

#### 请求 2: updateUser
```
POST http://10.0.0.108/api/login/updateUser
Content-Type: multipart/form-data
Authorization: Bearer {token}
Body: nickname=...&avatar=...

Response (应该是):
{
  "code": 0,
  "msg": "更新成功",
  "data": {
    "nickname": "...",
    "avatar": "...",
    "user_id": "..."
  }
}
```

## 可能的后端问题

如果网络请求看起来都正确，但后台返回错误，可能是：

1. **参数名不匹配**
   - 小程序发送: `nickname`, `avatar`
   - 后台期望: 其他名称？
   - 解决方案：检查后台文档或日志

2. **多部分表单编码问题**
   - 微信小程序的 `multipart/form-data` 可能需要特殊处理
   - 小程序发送的可能不是标准的多部分格式

3. **头像 URL 格式问题**
   - chooseAvatar 返回的是 `file://` URL
   - 后台可能需要先上传到服务器再保存
   - 当前实现直接保存 `file://` URL 可能无效

## 建议的修复方案

### 方案 1：检查后台接口文档
```
从 MCP 服务器查询最新的 /api/login/updateUser 接口定义
确认：
- 确切的参数名称
- 是否需要上传文件
- 响应格式
```

### 方案 2：添加头像上传步骤
如果后台不接受 `file://` URL，需要先上传头像到服务器：

```javascript
// 伪代码
const uploadResult = await uploadAvatar(avatarUrl);
const updateResult = await updateUser(nickname, uploadResult.avatarUrl);
```

### 方案 3：测试 Mock 模式
临时启用 Mock 模式来测试前端逻辑：

```javascript
// authModule.js
const CONFIG = {
  USE_MOCK: true,  // ← 改成 true
  // ...
};
```

这样可以排除后台问题，确认前端代码是否正确。

## 需要收集的信息

请运行注册流程，然后提供：

1. **控制台日志**：完整的控制台输出
2. **Network 请求**：
   - mnpLogin 请求和响应
   - updateUser 请求和响应
3. **后台日志**：后台服务器中对应请求的日志
4. **错误信息**：小程序显示的确切错误信息

这样我就能准确找到问题所在！

---

**最后一步**：确认这些文件没有问题：
- ✅ `/Users/hogar/Desktop/WeChatProjects-301-main/authModule.js`
- ✅ `/Users/hogar/Desktop/WeChatProjects-301-main/pages/login/login.js`
- ✅ `/Users/hogar/Desktop/WeChatProjects-301-main/app.json`
