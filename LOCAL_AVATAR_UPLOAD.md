# 本地头像保存 & 上传流程

## 📋 功能说明

实现了完整的头像处理流程：**本地保存 → 离线预览 → 上传服务器**

这样做的好处：
- ✅ 用户可以离线预览头像
- ✅ 避免网络中断时丢失头像选择
- ✅ 支持断点续传（如果上传失败，可以重试）
- ✅ 提高用户体验

## 🔄 流程图

### 注册流程
```
用户选择头像
    ↓
chooseAvatar 返回本地文件路径 (file://...)
    ↓
保存到小程序本地缓存 (/path/to/avatar_timestamp.png)
    ↓
离线预览（用户立即看到头像）
    ↓
提交注册表单
    ↓
上传本地头像到服务器
    ↓
服务器返回头像 URL (https://...)
    ↓
调用 updateUser 保存用户信息
    ↓
注册成功
```

### 编辑流程
```
进入编辑模式
    ↓
用户选择新头像
    ↓
保存到本地缓存（实时预览）
    ↓
点击保存
    ↓
上传本地头像到服务器
    ↓
获得服务器 URL
    ↓
调用 updateUser 更新用户信息
    ↓
返回主页
```

## 🛠️ 实现细节

### 1️⃣ 保存到本地缓存

```javascript
// authModule.js
const LOCAL_AVATAR_KEY = 'LOCAL_AVATAR_PATH';  // storage key

async function saveAvatarLocally(avatarFilePath) {
  // 1. 生成目标路径：/path/to/avatar_timestamp.png
  // 2. 使用 FileSystemManager 读取源文件
  // 3. 写入到本地缓存
  // 4. 将路径保存到 storage
  return { success: true, avatarPath: targetPath };
}
```

**关键API**：
- `wx.getFileSystemManager()` - 文件系统管理器
- `fs.readFile()` - 读取文件二进制内容
- `fs.writeFile()` - 写入文件到本地缓存
- `wx.setStorageSync()` - 保存路径到 storage

### 2️⃣ 获取本地头像

```javascript
// authModule.js
function getLocalAvatarPath() {
  return wx.getStorageSync(LOCAL_AVATAR_KEY) || null;
}
```

### 3️⃣ 上传到服务器

```javascript
// authModule.js
async function uploadAvatar(avatarFilePath) {
  // 使用 wx.uploadFile 上传本地文件
  // POST /api/user/uploadAvatar
  // 返回服务器 URL
  return { success: true, avatarUrl: 'https://...' };
}
```

**关键API**：
- `wx.uploadFile()` - 上传文件到服务器
- 使用 multipart/form-data 格式
- 附加 Authorization header

### 4️⃣ 更新用户信息

```javascript
// authModule.js
async function updateUser(nickname, avatarUrl) {
  // 使用已上传的头像 URL
  // POST /api/login/updateUser
  // 更新用户数据库
}
```

## 📝 代码示例

### 注册流程（pages/login/login.js）

```javascript
async performRegister() {
  const { nickName, avatarUrl } = this.data.registerForm;
  
  // 1. 微信登录
  const loginResult = await authService.wechatLogin();
  
  // 2. 本地保存头像
  let finalAvatarUrl = avatarUrl;
  if (avatarUrl.startsWith('file://')) {
    const saveResult = await authService.saveAvatarLocally(avatarUrl);
    if (saveResult.success) {
      const localPath = saveResult.avatarPath;
      
      // 3. 上传到服务器
      const uploadResult = await authService.uploadAvatar(localPath);
      if (uploadResult.success) {
        finalAvatarUrl = uploadResult.avatarUrl;
      }
    }
  }
  
  // 4. 保存用户信息
  const registerResult = await authService.updateUser(nickName, finalAvatarUrl);
}
```

### 编辑流程（pages/user/user.js）

```javascript
async performUpdate() {
  const { nickName, avatarUrl } = this.data.tempUserInfo;
  
  // 1. 检查是否为新头像
  let finalAvatarUrl = avatarUrl;
  if (avatarUrl.startsWith('file://')) {
    // 2. 本地保存
    const saveResult = await authService.saveAvatarLocally(avatarUrl);
    
    if (saveResult.success) {
      // 3. 上传到服务器
      const uploadResult = await authService.uploadAvatar(
        saveResult.avatarPath
      );
      
      if (uploadResult.success) {
        finalAvatarUrl = uploadResult.avatarUrl;
      }
    }
  }
  
  // 4. 更新用户信息
  const updateResult = await authService.updateUser(nickName, finalAvatarUrl);
}
```

## 📊 网络请求序列

### 完整的注册流程请求

```
1. POST /api/login/mnpLogin
   └─ 登录并获得 token

2. POST /api/user/uploadAvatar  (新增)
   ├─ Header: Authorization: Bearer {token}
   ├─ Body: 文件二进制内容 (multipart/form-data)
   └─ Response: { code: 0, data: { url: "https://..." } }

3. POST /api/login/updateUser
   ├─ Header: Authorization: Bearer {token}
   ├─ Body: nickname=...&avatar=https://...
   └─ Response: { code: 0, data: {...} }
```

## 🎯 关键特性

### 特性 1：本地存储路径

```javascript
// storage key
LOCAL_AVATAR_KEY = 'LOCAL_AVATAR_PATH'

// 存储的值
'file:///var/mobile/Containers/Data/.../avatar_1732348800000.png'
```

### 特性 2：文件系统 API

```javascript
const fs = wx.getFileSystemManager();

// 读取文件
fs.readFile({
  filePath: 'file://...',
  encoding: 'binary',
  success: (res) => {
    console.log('文件大小:', res.data.length);
  }
});

// 写入文件
fs.writeFile({
  filePath: '/path/to/cache/avatar.png',
  data: binaryData,
  encoding: 'binary'
});
```

### 特性 3：上传文件

```javascript
wx.uploadFile({
  url: 'http://10.0.0.108/api/user/uploadAvatar',
  filePath: '/path/to/cache/avatar.png',
  name: 'avatar',  // 参数名
  header: {
    'Authorization': 'Bearer token'
  },
  success: (res) => {
    const data = JSON.parse(res.data);
    console.log('上传 URL:', data.data.url);
  }
});
```

## 🔐 数据流

```
chooseAvatar (临时文件)
    ↓
getFileSystemManager().readFile()
    ↓
binary data (内存中)
    ↓
getFileSystemManager().writeFile()
    ↓
永久本地缓存 (/path/to/avatar_xxx.png)
    ↓
setStorageSync(LOCAL_AVATAR_KEY, path)
    ↓
uploadFile() 发送到服务器
    ↓
服务器返回 URL
    ↓
updateUser(nickname, url) 保存数据库
    ↓
最终保存的头像 URL (https://...)
```

## 📱 调试方法

### 1️⃣ 查看控制台日志

打开微信开发者工具 Console，看以下日志序列：

```
[登录页] 开始注册 {nickName: "...", avatarUrl: "file://..."}
[登录页] 微信登录结果 {success: true, token: "..."}
[登录页] 检测到本地文件，开始保存到本地缓存
[saveAvatarLocally] 开始保存头像 {source: "file://...", target: "/path/to/avatar_xxx"}
[saveAvatarLocally] 保存成功 {targetPath: "/path/to/avatar_xxx"}
[登录页] 本地保存成功 /path/to/avatar_xxx
[登录页] 开始上传头像到后台
[uploadAvatar] 开始上传头像 {filePath: "/path/to/avatar_xxx"}
[request] 准备发送请求 {url: "http://10.0.0.108/api/user/uploadAvatar"}
[uploadAvatar] 上传成功 {statusCode: 200, response: {...}}
[登录页] 上传成功，获得服务器URL: https://...
[登录页] 调用 updateUser {nickName: "...", avatarUrl: "https://..."}
[request] 准备发送请求 {url: "http://10.0.0.108/api/login/updateUser"}
[request] 响应成功 {statusCode: 200, data: {...}}
```

### 2️⃣ 查看 Storage

在微信开发者工具 Storage 标签中，查看：
```
LOCAL_AVATAR_PATH = "/var/mobile/Containers/Data/.../avatar_1732348800000.png"
USER_INFO = { nickname: "...", avatar: "https://..." }
```

### 3️⃣ 查看本地文件

```
用户数据目录: /var/mobile/Containers/Data/...
avatar_1732348800000.png     ← 本地缓存的头像
avatar_1732348800001.png     ← 另一个本地缓存
...
```

### 4️⃣ 查看 Network 请求

在 Network 标签中，应该看到：
1. `POST /api/user/uploadAvatar` - 上传头像文件
2. `POST /api/login/updateUser` - 更新用户信息

## 🐛 常见问题

### 问题 1：头像上传失败

**日志**:
```
[uploadAvatar] 上传失败 {error: "404 Not Found"}
```

**原因**：
- 后台没有 `/api/user/uploadAvatar` 接口
- 接口路径错误
- 服务器未启动

**解决**：
- 检查后台是否有头像上传接口
- 从 MCP 服务器查询正确的接口
- 修改 `CONFIG.ENDPOINTS.UPLOAD_AVATAR`

### 问题 2：本地保存失败

**日志**:
```
[saveAvatarLocally] 读取失败 {error: "ERR_..."}
```

**原因**：
- 权限不足
- 文件系统 API 不可用
- 路径错误

**解决**：
- 检查微信开发者工具的文件权限
- 在真机上测试
- 查看完整的错误信息

### 问题 3：上传成功但 URL 返回错误

**日志**:
```
[uploadAvatar] 上传成功但 URL 为空
```

**原因**：
- 后台响应格式不同
- URL 字段名不是 `url` 或 `avatar`

**解决**：
在 `uploadAvatar` 中修改 URL 提取逻辑：
```javascript
// 假设后台返回 avatar_url 字段
const avatarUrl = responseData.data.avatar_url || responseData.data.url;
```

## 📚 相关文件

- `authModule.js` - `saveAvatarLocally()`, `uploadAvatar()`
- `pages/login/login.js` - 注册流程修改
- `pages/user/user.js` - 编辑流程修改
- `REGISTRATION_FIX.md` - 之前的修复说明

## 🚀 下一步

1. **测试完整流程**
   - 打开控制台
   - 执行注册操作
   - 查看所有日志是否正常

2. **检查后台接口**
   - 确认 `/api/user/uploadAvatar` 接口存在
   - 确认响应格式正确
   - 检查上传的文件是否正确保存

3. **真机测试**
   - 在真实微信客户端中测试
   - 验证离线预览功能
   - 检查上传速度

4. **性能优化**（可选）
   - 实现图片压缩
   - 显示上传进度
   - 支持断点续传

---

**最后更新**：2024-11-28

**相关 API 文档**：
- [FileSystemManager](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.html)
- [uploadFile](https://developers.weixin.qq.com/miniprogram/dev/api/network/upload/wx.uploadFile.html)
- [Storage](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.setStorage.html)
