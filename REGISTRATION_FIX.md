# 注册流程修复 - 头像上传功能

## 问题诊断

管理后台能创建用户，但小程序注册失败，昵称和头像没有更新。

### 根本原因

`chooseAvatar` API 返回的是本地文件路径（`file://` 格式），而不是 HTTP URL：
```javascript
// chooseAvatar 返回的格式
{
  avatarUrl: "file:///var/mobile/Containers/Data/Documents/avatar.jpg"
}
```

后台的 `/api/login/updateUser` 接口期望：
- 已上传到服务器的头像 URL（`https://...` 或 `http://...`）
- 或者直接接收文件上传

前端直接发送 `file://` 路径给后台，后台无法识别，导致注册失败。

## 解决方案

### 新增头像上传功能

添加了 `uploadAvatar()` 函数来处理头像文件上传：

```javascript
// authModule.js
async function uploadAvatar(avatarFilePath) {
  // 使用 wx.uploadFile 上传文件到后台
  // POST /api/user/uploadAvatar
  // 返回已上传的头像 URL
}
```

### 修改注册流程

```
用户选择头像和昵称
    ↓
执行微信登录 → 获得 token
    ↓
检查头像是否为本地文件 (file://)
    ├─ 是 → 调用 uploadAvatar() 上传文件 → 获得服务器 URL
    └─ 否 → 直接使用 URL
    ↓
调用 updateUser(nickname, avatarUrl) 更新用户信息
    ↓
注册成功 → 跳转首页
```

## 代码修改

### 1. authModule.js - 新增函数

```javascript
// 上传头像文件
async function uploadAvatar(avatarFilePath) {
  const token = getToken();
  if (!token) {
    return { success: false, error: '未登录' };
  }

  return new Promise((resolve) => {
    wx.uploadFile({
      url: CONFIG.API_BASE_URL + '/api/user/uploadAvatar',
      filePath: avatarFilePath,  // file:// 本地路径
      name: 'avatar',            // 参数名
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        const responseData = JSON.parse(res.data);
        if (responseData.code === 0) {
          resolve({
            success: true,
            avatarUrl: responseData.data.url
          });
        } else {
          resolve({
            success: false,
            error: responseData.msg
          });
        }
      },
      fail: (err) => {
        resolve({
          success: false,
          error: err.errMsg
        });
      }
    });
  });
}
```

### 2. pages/login/login.js - 修改注册流程

```javascript
async performRegister() {
  // 1. 微信登录
  const loginResult = await authService.wechatLogin();
  
  // 2. 检查头像是否需要上传
  let finalAvatarUrl = avatarUrl;
  if (avatarUrl.startsWith('file://')) {
    const uploadResult = await authService.uploadAvatar(avatarUrl);
    if (uploadResult.success) {
      finalAvatarUrl = uploadResult.avatarUrl;
    }
  }
  
  // 3. 更新用户信息（使用已上传的头像URL）
  const registerResult = await authService.updateUser(
    nickName, 
    finalAvatarUrl
  );
}
```

## 网络请求流程

现在的注册流程会发送以下请求：

### 请求 1: 微信登录
```
POST http://10.0.0.108/api/login/mnpLogin
Content-Type: application/x-www-form-urlencoded
Body: code=...
```

### 请求 2: 上传头像 (新增)
```
POST http://10.0.0.108/api/user/uploadAvatar
Content-Type: multipart/form-data
Authorization: Bearer {token}
Body: 文件内容 (multipart)
```

**响应格式**（预期）:
```json
{
  "code": 0,
  "msg": "上传成功",
  "data": {
    "url": "https://example.com/avatars/abc123.jpg"
  }
}
```

### 请求 3: 更新用户信息
```
POST http://10.0.0.108/api/login/updateUser
Content-Type: multipart/form-data
Authorization: Bearer {token}
Body: nickname=...&avatar=https://example.com/avatars/abc123.jpg
```

## 调试方法

### 方法 1: 查看控制台日志

打开开发者工具 Console，应该能看到：

```
[登录页] 检测到本地文件，开始上传
[uploadAvatar] 开始上传头像 {filePath: "file://..."}
[uploadAvatar] 上传成功 {statusCode: 200, response: {...}}
[登录页] 上传成功，获得URL: https://example.com/avatars/...
[登录页] 开始更新用户信息 {nickName: "...", avatarUrl: "https://..."}
```

### 方法 2: 查看 Network 标签

检查是否有以下请求：

1. ✅ `POST /api/login/mnpLogin` - 登录
2. ✅ `POST /api/user/uploadAvatar` - 上传头像 (新增)
3. ✅ `POST /api/login/updateUser` - 更新用户信息

如果缺少第 2 个请求，说明后台可能不需要上传文件。

## 可能的问题

### 问题 1: 后台没有 /api/user/uploadAvatar 接口

**表现**：
```
[uploadAvatar] 上传失败 {error: "404 Not Found"}
[登录页] 上传失败，使用本地路径
```

**解决方案**：
- 检查后台是否有头像上传接口
- 如果没有，需要从 MCP 服务器查询正确的接口名
- 或者修改 `CONFIG.ENDPOINTS` 中的 `UPLOAD_AVATAR` 配置

### 问题 2: 后台接受 file:// 路径

**表现**：
头像上传失败，但直接发送 `file://` 路径给 updateUser 反而成功

**解决方案**：
注释掉 uploadAvatar 逻辑：
```javascript
// if (avatarUrl.startsWith('file://')) {
//   const uploadResult = await authService.uploadAvatar(avatarUrl);
//   ...
// }
```

### 问题 3: 响应格式不同

如果后台的 uploadAvatar 响应格式不同，需要修改解析逻辑：

```javascript
// 假设后台返回的 URL 字段名是 avatar_url
const responseData = JSON.parse(res.data);
resolve({
  success: true,
  avatarUrl: responseData.data.avatar_url  // ← 改这里
});
```

## 后续步骤

1. **测试上传流程**：
   - 打开控制台
   - 执行注册操作
   - 查看是否出现 uploadAvatar 的日志

2. **查看 Network 请求**：
   - 确认 uploadAvatar 请求是否发送
   - 检查响应状态和格式

3. **查看后台日志**：
   - 确认后台收到了 uploadAvatar 请求
   - 检查是否正确保存了文件
   - 检查返回的 URL 是否正确

4. **如果还是失败**：
   - 从 MCP 服务器查询最新的接口文档
   - 确认 `/api/user/uploadAvatar` 接口是否存在
   - 检查接口的参数名和响应格式

## 相关文件

- `/Users/hogar/Desktop/WeChatProjects-301-main/authModule.js` - uploadAvatar 函数实现
- `/Users/hogar/Desktop/WeChatProjects-301-main/pages/login/login.js` - performRegister 流程修改
- `/Users/hogar/Desktop/WeChatProjects-301-main/API_CONFIG_GUIDE.md` - API 配置文档

## 完整的新参数说明

在 `authModule.js` 的 CONFIG 中已有：
```javascript
UPLOAD_AVATAR: '/api/user/uploadAvatar'  // 上传头像（新增）
```

可以根据实际情况修改此路径。
