# 更新用户信息（头像和昵称）- 功能指南

## 📖 功能说明

用户可以在个人中心页面编辑和更新自己的头像和昵称。

### 流程图

```
用户点击"编辑信息"
    ↓
显示微信授权对话框（请求用户授权）
    ↓
用户选择新头像和昵称
    ↓
后台调用 /api/login/updateUser 接口
    ↓
更新本地存储中的用户信息
    ↓
刷新页面显示新信息
```

## 🔧 技术实现

### 后台接口

**端点**: `POST /api/login/updateUser`  
**请求头**: `Authorization: Bearer {token}`  
**请求格式**: `multipart/form-data`

**请求参数**:
```
nickname: 用户昵称 (string)
avatar: 用户头像 URL (string)
```

**响应格式**:
```json
{
  "code": 0,
  "msg": "更新成功",
  "data": {
    "user_id": "用户ID",
    "nickname": "新昵称",
    "avatar": "新头像URL"
  }
}
```

### 客户端调用

在 `pages/user/user.js` 中：

```javascript
// 更新用户信息
async onEditInfo() {
  const userInfo = authService.getUserInfo();
  
  // 获取用户授权并选择新头像和昵称
  const profileRes = await new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc: '用于更新用户信息',
      success: (res) => resolve(res),
      fail: (err) => reject(err)
    });
  });

  // 调用更新 API
  const { nickName, avatarUrl } = profileRes.userInfo;
  const updateResult = await authService.updateUser(nickName, avatarUrl);
  
  if (updateResult.success) {
    // 更新成功，刷新页面
    this.loadUserInfo();
  }
}
```

## 📋 使用方式

### 在应用中

1. **进入个人中心页面**
   - 点击底部导航栏的"我的"标签
   - 进入 `/pages/user/user` 页面

2. **编辑用户信息**
   - 点击"编辑信息"按钮
   - 授予微信用户信息权限
   - 选择新的头像和昵称
   - 等待更新完成

3. **确认更新**
   - 页面会显示"更新成功"提示
   - 用户信息即时刷新显示新内容

### 使用 API 直接更新

如果需要在其他页面更新用户信息，可以直接调用：

```javascript
const authService = require('../../authModule');

// 直接更新用户昵称和头像
const result = await authService.updateUser(nickname, avatarUrl);

if (result.success) {
  console.log('更新成功', result.data);
  // 刷新全局用户信息
} else {
  console.log('更新失败', result.error);
}
```

## 🐛 常见问题

### Q: 更新失败，报错 "401 Unauthorized"

**原因**: Token 已过期或无效

**解决**:
1. 确保用户已正确登录
2. 检查本地存储中的 Token 是否有效
3. 尝试重新登录

### Q: 更新失败，报错 "422 Unprocessable Entity"

**原因**: 请求参数格式不正确

**解决**:
1. 确保 `nickname` 和 `avatar` 都是字符串
2. 确保 `avatar` 是有效的 URL
3. 检查后台接口是否期望不同的参数名（如 `nick_name` 而不是 `nickname`）

### Q: 头像 URL 无法加载

**原因**: 
1. 头像 URL 格式不正确
2. 头像服务器未在微信小程序域名白名单中

**解决**:
1. 确保使用有效的完整 URL（包括 https://）
2. 在微信小程序后台的服务器域名配置中添加头像服务器地址

### Q: 用户取消了微信授权

**现象**: 点击"编辑信息"后没有任何反应

**原因**: 用户在 wx.getUserProfile 对话框中点击了"拒绝"

**解决**: 用户需要重新点击"编辑信息"按钮并授予权限

## 🔒 安全提示

- ✅ Token 自动在请求头中发送
- ✅ 所有网络请求都经过 HTTPS（生产环境）
- ✅ 头像和昵称由微信用户亲自选择
- ✅ 更新后的信息实时保存到本地和后台

## 📱 页面结构

### 用户中心页面 (`pages/user/user.js`)

```
用户中心页面
  ├── 用户头像展示
  ├── 用户昵称展示
  ├── 用户 ID 展示
  ├── 编辑信息按钮 ← 点击触发更新
  └── 退出登录按钮
```

## 🧪 测试指南

### 本地测试（使用 Mock 模式）

1. 编辑 `authModule.js` 第 21 行：
   ```javascript
   USE_MOCK: true
   ```

2. 编译并运行应用

3. 点击"编辑信息"按钮，应该能正常完成更新（使用模拟数据）

### 实际测试（连接后台）

1. 确保 LikeAdmin 后台服务正在运行
2. 配置正确的 `API_BASE_URL`
3. 在微信开发者工具中查看 Console 日志
4. 观察网络请求是否成功发送和返回

## 📊 数据流

```
用户选择头像/昵称
    ↓
wx.getUserProfile() 返回 { nickName, avatarUrl }
    ↓
authService.updateUser(nickName, avatarUrl)
    ↓
request() 发送 POST /api/login/updateUser
    ↓
后台验证 Token 并更新数据库
    ↓
返回 { code: 0, data: {...} }
    ↓
本地存储更新
    ↓
页面刷新显示新信息
```

## 🔌 集成 API

如果需要自定义实现，可以使用以下底层方法：

```javascript
// 发送更新请求（底层）
const response = await authService.request('/api/login/updateUser', {
  method: 'POST',
  data: {
    nickname: '新昵称',
    avatar: 'https://example.com/avatar.jpg'
  },
  header: {
    'Authorization': `Bearer ${authService.getToken()}`
  },
  contentType: 'multipart/form-data'
});
```

## 📞 获取帮助

如果遇到问题，请检查：

- [ ] 后台服务是否正在运行？
- [ ] API 地址配置是否正确？
- [ ] Token 是否有效且未过期？
- [ ] 微信小程序域名配置是否包含后台服务器地址？
- [ ] 网络日志显示了什么错误信息？

查看 `API_CONFIG_GUIDE.md` 获取更多配置和故障排除信息。
