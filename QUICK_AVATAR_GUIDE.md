# 🎯 本地头像保存 & 上传 - 快速参考

## 📌 核心流程

```
选择头像 (file://) 
  ↓
保存到本地缓存 ✨ (新增)
  ↓
上传到服务器
  ↓
获得服务器 URL
  ↓
保存到数据库
```

## 🔧 新增函数

### authModule.js 中新增的三个函数

| 函数名 | 功能 | 返回值 |
|--------|------|--------|
| `saveAvatarLocally(filePath)` | 保存头像到本地缓存 | `{success: bool, avatarPath: string}` |
| `getLocalAvatarPath()` | 获取本地头像路径 | `string \| null` |
| `removeLocalAvatar()` | 删除本地头像 | `void` |
| `uploadAvatar(filePath)` | 上传头像到服务器 | `{success: bool, avatarUrl: string}` |

## 📝 使用示例

### 注册时使用

```javascript
// pages/login/login.js
const avatarUrl = 'file:///...';  // chooseAvatar 返回

// 1. 本地保存
const saveResult = await authService.saveAvatarLocally(avatarUrl);
// 返回: { success: true, avatarPath: '/path/to/avatar_xxx.png' }

// 2. 上传到服务器
const uploadResult = await authService.uploadAvatar(saveResult.avatarPath);
// 返回: { success: true, avatarUrl: 'https://...' }

// 3. 保存到数据库
await authService.updateUser(nickName, uploadResult.avatarUrl);
```

### 编辑时使用

```javascript
// pages/user/user.js
if (newAvatarUrl.startsWith('file://')) {
  // 同样的流程...
  const saveResult = await authService.saveAvatarLocally(newAvatarUrl);
  const uploadResult = await authService.uploadAvatar(saveResult.avatarPath);
  finalUrl = uploadResult.avatarUrl;
} else {
  finalUrl = newAvatarUrl;  // 已经是 URL，无需处理
}
```

## 🌐 网络请求

### 三步请求序列

```
Step 1: 登录
POST /api/login/mnpLogin
→ 获得 token

Step 2: 上传头像 ✨
POST /api/user/uploadAvatar
Headers: Authorization: Bearer {token}
Body: file binary (multipart)
→ 返回服务器 URL

Step 3: 更新信息
POST /api/login/updateUser
Body: nickname & avatar (URL)
→ 注册/更新完成
```

## 💾 数据存储

### Storage 中的数据

```javascript
{
  "USER_TOKEN": "xxx",
  "LOCAL_AVATAR_PATH": "/var/mobile/Containers/.../avatar_1732348800000.png",
  "USER_INFO": {
    "nickname": "用户昵称",
    "avatar": "https://example.com/avatars/xxx.png"  // 服务器 URL
  }
}
```

### 本地文件系统

```
用户数据目录/
├── avatar_1732348800000.png   ← 第一次选择的头像
├── avatar_1732348800001.png   ← 修改后的头像
└── ...
```

## 🔍 调试检查清单

- [ ] `chooseAvatar` 返回 `file://` 路径
- [ ] `saveAvatarLocally` 成功保存到本地
- [ ] `uploadAvatar` 成功上传到服务器
- [ ] 服务器返回 `https://` URL
- [ ] `updateUser` 使用了服务器 URL
- [ ] Storage 中的 URL 被正确保存
- [ ] 数据库中的头像 URL 正确

## ⚠️ 重要提示

### file:// vs https://

```javascript
// ❌ 不要直接保存 file://
updateUser(nickname, "file:///...")  // 后台无法识别

// ✅ 正确做法：先上传再保存
const url = await uploadAvatar("file:///...");
updateUser(nickname, url);  // 使用 https://
```

### 离线预览

```javascript
// 本地缓存路径可以直接在 image 组件中使用
<image src="{{ avatarPath }}" />  // file:// 路径可以显示

// 但保存到数据库必须是服务器 URL
updateUser(nickname, serverUrl);  // https:// URL
```

## 🚀 验证步骤

### 1️⃣ 观看日志
```
[登录页] 检测到本地文件
[saveAvatarLocally] 保存成功
[uploadAvatar] 上传成功
[登录页] 获得服务器URL
```

### 2️⃣ 检查 Storage
```
LOCAL_AVATAR_PATH = "/path/to/avatar_xxx"
USER_INFO.avatar = "https://..."
```

### 3️⃣ 检查后台
```
数据库中的 avatar 字段 = "https://..."
```

## 📊 流程对比

### 旧流程（不保存本地）
```
file:// → 直接上传 → URL
❌ 问题：选择后不能立即预览，网络中断时丢失选择
```

### 新流程（保存本地）
```
file:// → 本地保存 → 上传 → URL
✅ 优点：可立即预览，支持离线操作，网络稳定后再上传
```

## 🎨 用户体验

### 注册时
1. 用户点击选择头像
2. **立即看到头像预览** ✨（本地保存）
3. 填写昵称
4. 点击注册
5. 后台上传头像到服务器
6. 注册完成

### 编辑时
1. 用户进入编辑模式
2. 选择新头像
3. **立即看到新头像** ✨（本地保存）
4. 修改昵称
5. 点击保存
6. 后台上传头像到服务器
7. 返回主页看到新头像

## 📦 文件大小

### 存储空间使用

```
chooseAvatar 返回的图片
  ↓
  × 2 (本地缓存 + 服务器)
  = 2 倍存储空间

示例：
- 头像文件：500KB
- 本地缓存：500KB
- 服务器存储：500KB
- 总计：1MB per 用户修改
```

### 清理策略

```javascript
// 上传成功后删除本地缓存（可选）
if (uploadResult.success) {
  authService.removeLocalAvatar();
}
```

## 🔗 相关文档

- 完整说明：[LOCAL_AVATAR_UPLOAD.md](./LOCAL_AVATAR_UPLOAD.md)
- 注册修复：[REGISTRATION_FIX.md](./REGISTRATION_FIX.md)
- 调试指南：[DEBUG_REGISTRATION.md](./DEBUG_REGISTRATION.md)

---

**关键代码位置**：
- `authModule.js`: 第 572-727 行
- `pages/login/login.js`: 第 195-227 行
- `pages/user/user.js`: 第 126-167 行
