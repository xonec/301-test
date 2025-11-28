# 🔧 注册/登录失败 - 故障排除指南

## 🎯 问题描述

**症状**：
- ✅ 后台用户成功创建
- ❌ 小程序显示"注册失败"或"登录失败"
- ❌ 用户可以正常注册，但小程序端显示失败

## 🔍 诊断步骤

### 第 1 步：查看完整的控制台日志

打开微信开发者工具的 **Console** 标签，执行注册操作，查看以下日志序列：

#### ✅ 成功的日志应该包括：

```
========== updateUser 调试信息 =========
Token: xxx...
发送数据: {nickname: "用户昵称", avatar: "file://...或https://..."}

[request] 准备发送请求 {...}
[request] 响应成功 {statusCode: 200, data: {...}}

========== updateUser 处理响应 =========
响应内容: {code: 0, msg: "成功", data: {...}}
响应.code: 0
响应.msg: 成功
响应是字符串吗? false

更新成功 {...}
```

#### ❌ 失败的日志会显示：

```
========== updateUser 处理响应 =========
响应内容: {code: 非0值, msg: "错误信息", ...}
响应.code: 非0值
响应.msg: 错误信息

错误：响应不是JSON对象  或  updateUser 捕获异常
```

### 第 2 步：检查响应的 code 值

| code 值 | 含义 | 解决方案 |
|--------|------|--------|
| `0` | ✅ 成功 | 检查前端逻辑是否有其他问题 |
| `1` | ❌ 通用错误 | 检查后台日志，查看具体错误 |
| `-1` | ❌ 参数错误 | 检查发送的参数名和格式 |
| `401` | ❌ 未授权 | Token 无效或过期 |
| `403` | ❌ 无权限 | 用户权限不足 |
| 其他 | ❌ 后台错误 | 检查后台实现 |

### 第 3 步：检查发送的数据格式

在日志中查看 `发送数据` 一行：

```javascript
发送数据: {
  nickname: "用户昵称",        // ✅ 参数名必须是 nickname（不是 nick_name）
  avatar: "https://..."         // ✅ 必须是 URL（不是 file://）
}
```

**关键点**：
- ✅ 参数名必须匹配后台期望
- ✅ 头像必须是已上传的服务器 URL（不是 `file://` 路径）

### 第 4 步：检查 Token 是否有效

在日志中查看：
```
Token: xxx...  // 应该有值
```

如果是空，说明登录失败。检查微信登录日志：

```
========== 微信登录 =========
登录成功 {token: "...", ...}
或
登录响应错误 {code: 非0, msg: "..."}
```

### 第 5 步：检查网络请求

打开 **Network** 标签，查看以下请求：

#### 请求 1: mnpLogin（微信登录）
```
POST http://10.0.0.108/api/login/mnpLogin
↓
Response: {code: 0, data: {token: "...", expires_in: 7200}}
```

#### 请求 2: uploadAvatar（上传头像，可选）
```
POST http://10.0.0.108/api/user/uploadAvatar
↓
Response: {code: 0, data: {url: "https://..."}}
```

#### 请求 3: updateUser（更新用户信息，关键）
```
POST http://10.0.0.108/api/login/updateUser
Headers: Authorization: Bearer {token}
Body: nickname=...&avatar=https://...
↓
Response: {code: 0, msg: "成功", data: {...}}
```

**检查清单**：
- [ ] statusCode 是 200（HTTP 成功）
- [ ] Response 内容是有效的 JSON
- [ ] response.code 是 0（业务成功）

## 🐛 常见问题与解决方案

### 问题 1：响应格式不是 JSON

**日志显示**：
```
响应是字符串吗? true
错误：响应不是JSON对象 <html>...</html>
```

**原因**：
- 后台返回了 HTML 错误页面（通常是 500 错误）
- 请求被拦截（如被代理或防火墙）
- API 路径错误导致 404

**解决**：
1. 检查后台服务是否正常运行
2. 查看后台日志，找出 500 错误的具体原因
3. 验证 API 路径是否正确：`/api/login/updateUser`

### 问题 2：code 不是 0

**日志显示**：
```
响应.code: 1
响应.msg: "用户已存在"
```

**可能的原因**：
- 用户已注册过（用户存在）
- 参数格式错误
- 后台验证失败

**解决方案**：
根据 `msg` 字段的错误信息，查看后台实现并修复相应问题。

### 问题 3：Token 无效

**日志显示**：
```
发送数据: {nickname: "...", avatar: "..."}
响应.code: 401
响应.msg: "Unauthorized"
```

**原因**：
- Token 在 updateUser 之前过期了
- Token 格式错误

**解决**：
```javascript
// authModule.js 中检查 Token 是否正确
console.log('Token:', token);
console.log('Authorization header:', `Bearer ${token}`);
```

### 问题 4：参数名不匹配

**日志显示**：
```
发送数据: {
  nick_name: "...",   // ❌ 错误：应该是 nickname
  avatar: "..."
}
```

**解决**：
检查 updateUser 函数中的参数名是否与后台期望一致。

### 问题 5：头像是 file:// 路径

**日志显示**：
```
发送数据: {
  nickname: "...",
  avatar: "file:///..."  // ❌ 错误：应该是 https://
}
```

**原因**：
- 头像上传失败
- 没有调用 `uploadAvatar` 函数

**解决**：
1. 检查是否正确调用了 `uploadAvatar`
2. 查看上传的日志是否成功
3. 如果上传失败，检查后台的 `/api/user/uploadAvatar` 接口

## 📊 完整的诊断流程

```
开始注册
    ↓
[检查日志 1] 微信登录成功？
    ├─ 否 → 查看登录错误信息，检查后台地址
    └─ 是 ↓
[检查日志 2] 头像本地保存成功？
    ├─ 否 → 检查文件系统权限
    └─ 是 ↓
[检查日志 3] 头像上传到服务器成功？
    ├─ 否 → 检查 /api/user/uploadAvatar 接口
    └─ 是 ↓
[检查日志 4] updateUser 请求发送成功？
    ├─ 否 → 检查网络请求
    └─ 是 ↓
[检查日志 5] 响应 code === 0？
    ├─ 否 → 查看 response.msg 的错误信息
    └─ 是 ↓
✅ 注册成功！
```

## 🔧 快速修复清单

根据日志选择对应的修复步骤：

### 如果日志显示 "响应.code: 0"（但小程序仍显示失败）

**可能原因**：前端 JS 逻辑有问题

**检查**：
```javascript
// pages/login/login.js
if (registerResult.success) {  // 这行是否执行？
  wx.showToast({ title: '注册成功' });
}
```

打印完整的 registerResult：
```javascript
console.log('registerResult 完整内容:', JSON.stringify(registerResult, null, 2));
```

### 如果日志显示 "响应.code: 不是 0"

**查看后台文档**，理解该 code 值的含义，然后：
1. 检查参数是否正确
2. 检查用户状态是否符合要求
3. 查看后台日志获取详细错误

### 如果日志显示网络请求失败

**可能原因**：
- 后台服务未启动
- API 地址错误
- 网络连接问题

**检查**：
```javascript
// authModule.js
console.log('API_BASE_URL:', CONFIG.API_BASE_URL);  // 应该是 http://10.0.0.108
```

## 📝 后台需要提供的信息

如果需要后台协助调试，收集以下信息：

1. **updateUser 接口文档**：
   - 确切的参数名（nickname 还是 nick_name）
   - 成功和失败时的响应格式
   - 可能的错误代码及含义

2. **后台日志**：
   - 对应请求的完整日志
   - 任何错误或异常信息
   - 数据库中的用户记录是否正确更新

3. **API 规范**：
   - Content-Type 是否必须是 multipart/form-data
   - Authorization header 格式是否正确
   - 是否有其他必需的 header

## 🎓 进阶调试技巧

### 技巧 1：使用 Mock 模式测试前端逻辑

```javascript
// authModule.js
const CONFIG = {
  USE_MOCK: true,  // 改成 true
  // ...
};
```

这样可以跳过后台，仅测试前端逻辑。

### 技巧 2：检查完整的网络请求头

在 Network 标签中，点击 updateUser 请求，查看 **Request Headers**：

```
POST /api/login/updateUser HTTP/1.1
Host: 10.0.0.108
Content-Type: multipart/form-data
Authorization: Bearer xxx...
```

### 技巧 3：保存日志用于分析

在控制台右键选择 "Save as..." 保存日志，分享给后台团队。

## 📞 需要帮助？

提供以下信息时最有帮助：

1. **完整的控制台日志**（从开始到结束）
2. **Network 标签中失败请求的详细信息**
3. **后台的对应日志**
4. **期望的响应格式**

---

**相关文件**：
- `authModule.js` - 认证核心模块
- `pages/login/login.js` - 注册页面
- `LOCAL_AVATAR_UPLOAD.md` - 头像上传流程
- `REGISTRATION_FIX.md` - 注册修复说明
