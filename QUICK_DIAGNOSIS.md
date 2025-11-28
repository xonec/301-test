# 🚨 快速诊断：注册/登录失败

## 3 步快速诊断

### 步骤 1：打开 Console 查看最后的日志

找到以下日志（从下往上看）：

```
========== updateUser 处理响应 =========
响应内容: {code: ?, msg: "...", ...}
```

**检查 code 值**：
- ✅ `code: 0` → **跳到步骤 3**
- ❌ `code: 非0` → **跳到步骤 2**

### 步骤 2：根据错误代码修复（如果 code ≠ 0）

| code | 错误信息 | 可能原因 | 修复方案 |
|------|---------|--------|--------|
| 401 | Unauthorized | Token 无效 | 检查登录是否成功 |
| 403 | Forbidden | 无权限 | 检查用户权限 |
| 1 | 用户已存在 | 用户重复注册 | 用新用户重试 |
| 其他 | (查看 msg) | 后台错误 | 查看后台日志 |

**立即检查**：
1. 在日志中找到 `msg` 字段的完整错误信息
2. 去后台检查对应的日志
3. 根据错误信息修复后台代码

### 步骤 3：如果 code === 0 但仍显示失败

打开 Network 标签，找到 `updateUser` 请求：

```
statusCode: 200  ✅
response: {code: 0, ...}  ✅
```

如果都正确，问题在**前端 JS 逻辑**：

```javascript
// pages/login/login.js 的 performRegister 方法
console.log('registerResult:', registerResult);
// 如果 registerResult.success === true，说明 updateUser 返回成功了
// 检查为什么没有跳转页面
```

**检查清单**：
- [ ] `registerResult.success` 是否为 true？
- [ ] 是否触发了 `wx.switchTab` 跳转？
- [ ] 是否有其他 try-catch 捕获异常？

---

## 🔴 如果还是不行

### 收集这些信息给后台：

1. **完整的控制台日志**：
   ```
   从 [登录页] 开始注册
   到
   更新成功 或 更新失败
   ```

2. **Network 请求详情**：
   - updateUser 的 Request body
   - updateUser 的 Response body

3. **参数检查**：
   ```
   发送数据: {nickname: "...", avatar: "..."}
   ```
   - ✅ nickname 和 avatar 字段名是否正确？
   - ✅ avatar 值是 `file://` 还是 `https://`？

### 直接看代码位置

**问题可能在这些地方**：
1. `authModule.js` - 第 706-732 行（updateUser 函数的请求部分）
2. `authModule.js` - 第 720-749 行（响应处理部分）
3. `pages/login/login.js` - 第 236-259 行（注册流程）

---

## 💡 最可能的原因

**根据"后台能创建用户，小程序显示失败"的症状，最可能是**：

### 原因 A：updateUser 响应 code ≠ 0
- 检查后台的 `/api/login/updateUser` 是否正确处理了请求
- 查看参数名是否与后台期望一致（nickname 还是 nick_name？）

### 原因 B：响应格式错误（返回 HTML 而不是 JSON）
- 日志会显示：`响应是字符串吗? true`
- 说明后台返回了错误页面（通常是 500）
- 检查后台服务是否在运行

### 原因 C：Token 无效或过期
- 日志会显示：`code: 401` 或 `Unauthorized`
- 检查微信登录是否真的成功
- 查看 token 是否被正确保存

### 原因 D：头像 URL 格式错误
- 如果 avatar 还是 `file://` 路径，说明上传头像没成功
- 检查 `/api/user/uploadAvatar` 接口是否正常工作

---

## ✅ 验证方法

### 在控制台执行这个命令验证：

```javascript
// 检查是否保存了 token
const token = wx.getStorageSync('USER_TOKEN');
console.log('TOKEN 存在:', !!token, token ? token.substring(0, 20) + '...' : '');

// 检查是否保存了用户信息
const userInfo = wx.getStorageSync('USER_INFO');
console.log('USER_INFO:', userInfo);

// 检查 API 基础地址
const auth = require('../../authModule');
console.log('API 地址:', auth.CONFIG?.API_BASE_URL || '未找到');
```

**预期结果**：
- TOKEN 存在: true xxx...
- USER_INFO: { nickname: "...", avatar: "..." }
- API 地址: http://10.0.0.108

---

## 📞 反馈日志时请包括

复制以下内容到文本：

```
【注册测试】
时间：2024-11-28 xx:xx:xx
昵称：测试用户
头像：已选择

【控制台日志】
[粘贴从 [登录页] 开始注册 到最后一条日志]

【Network 请求】
updateUser 请求：
- URL: http://10.0.0.108/api/login/updateUser
- Method: POST
- Headers: {...}
- Body: {...}
- Response: {...}

【问题描述】
- 后台用户是否已创建？是/否
- 小程序显示什么错误？
- 是否有其他异常？
```

这样能快速定位问题！
