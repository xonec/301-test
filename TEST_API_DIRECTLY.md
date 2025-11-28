# 直接测试后台 API - 调试指南

使用 curl 或 Postman 直接测试后台 API，绕过小程序，快速定位问题。

## 前置条件

1. 已登录并获得 token（从之前的登录日志中复制）
2. 后台 LikeAdmin 运行在 `http://10.0.0.108`

## 📋 测试列表

### Test 1: 登录接口 ✅
```bash
curl -X POST "http://10.0.0.108/api/login/mnpLogin" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "code=001nIXpD1YOz7u0e29ND26nIXpD1YOz7u0e29ND2"
```

**预期响应**（据观察）：
```json
{
  "code": 1,
  "msg": "",
  "data": {
    "id": 7,
    "token": "ccd875a9bb2fc27fc68a78cfdf041054",
    "nickname": "用户12722185",
    "avatar": "http://10.0.0.108/resource/image/...",
    "is_new_user": 1
  }
}
```

---

### Test 2: 获取用户信息 - 方式 A（只用 header）
```bash
TOKEN="a94dec58f13e3117f7204281e16ad363"  # 替换成你的 token

curl -X GET "http://10.0.0.108/api/user/getUserInfo" \
  -H "Authorization: Bearer a94dec58f13e3117f7204281e16ad363" \
  -H "Content-Type: application/json"
```

**预期响应**（如果成功）：
```json
{
  "code": 0,
  "msg": "获取成功",
  "data": {
    "id": 7,
    "nickname": "用户12722185",
    "avatar": "...",
    ...
  }
}
```

**实际响应**（根据观察）：
```json
{
  "code": 0,
  "msg": "请求参数缺token",
  "data": []
}
```

---

### Test 3: 获取用户信息 - 方式 B（在 URL 中添加 token）⭐ 推荐
```bash
TOKEN="a94dec58f13e3117f7204281e16ad363"  # 替换成你的 token

curl -X GET "http://10.0.0.108/api/user/getUserInfo?token=$a94dec58f13e3117f7204281e16ad363" \
  -H "Authorization: Bearer a94dec58f13e3117f7204281e16ad363" \
  -H "Content-Type: application/json"
```

**预期响应**：
```json
{
  "code": 0,
  "msg": "获取成功",
  "data": {
    ...
  }
}
```

---

### Test 4: 更新用户信息 - 方式 A（form-urlencoded + header）
```bash
TOKEN="a94dec58f13e3117f7204281e16ad363"

curl -X POST "http://10.0.0.108/api/login/updateUser" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "nickname=墨晔&avatar=http://10.0.0.108/resource/image/...&token=${TOKEN}"
```

**预期响应**：
```json
{
  "code": 0,
  "msg": "更新成功",
  "data": {
    "id": 7,
    "nickname": "墨晔",
    "avatar": "..."
  }
}
```

---

### Test 5: 更新用户信息 - 方式 B（multipart/form-data）
```bash
TOKEN="a94dec58f13e3117f7204281e16ad363"
AVATAR_URL="http://10.0.0.108/resource/image/adminapi/default/default_avatar.png"

curl -X POST "http://10.0.0.108/api/login/updateUser" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "nickname=墨晔" \
  -F "avatar=${AVATAR_URL}" \
  -F "token=${TOKEN}"
```

---

### Test 6: 更新用户信息 - 方式 C（在 URL 中添加 token）⭐ 推荐
```bash
TOKEN="a94dec58f13e3117f7204281e16ad363"
AVATAR_URL="http://10.0.0.108/resource/image/adminapi/default/default_avatar.png"

curl -X POST "http://10.0.0.108/api/login/updateUser?token=${TOKEN}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "nickname=墨晔&avatar=${AVATAR_URL}&token=${TOKEN}"
```

---

## 🔍 如何使用

### 方法 1：命令行 (macOS/Linux)

1. 打开终端
2. 从上面复制一个 curl 命令
3. **替换 token 值**（使用你登录时获得的实际 token）
4. 运行命令
5. 观察响应

### 方法 2：Postman

1. 打开 Postman
2. 新建 Request
3. 选择方法（GET/POST）
4. 输入 URL
5. 在 Headers 中添加：
   ```
   Authorization: Bearer {token}
   ```
6. 根据测试类型：
   - **Test 2/3**：不需要请求体
   - **Test 4/5/6**：在 Body 中添加参数
     ```
     nickname: 墨晔
     avatar: http://...
     token: {token}
     ```

---

## 📊 结果解释

### 成功的响应（code: 0）
```json
{"code": 0, "msg": "...", "data": {...}}
```
✅ 说明 token 被正确识别

### 失败的响应（msg: "请求参数缺token"）
```json
{"code": 0, "msg": "请求参数缺token", "data": []}
```
❌ 说明：
- 后台无法识别你发送的 token
- token 格式或位置错误
- 后台的 token 验证逻辑有问题

---

## 💡 快速诊断流程

### 第 1 步：确认 token 有效
```bash
# 登录获取新 token
TOKEN_VALUE=$(curl -s -X POST "http://10.0.0.108/api/login/mnpLogin" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "code=xxx" | jq -r '.data.token')

echo "Token: ${TOKEN_VALUE}"
```

### 第 2 步：测试 getUserInfo
```bash
curl -X GET "http://10.0.0.108/api/user/getUserInfo?token=${TOKEN_VALUE}" \
  -H "Authorization: Bearer ${TOKEN_VALUE}"
```

- **成功**？ ✅ 说明 URL 参数方式有效
- **失败**？ ❌ 继续第 3 步

### 第 3 步：测试 updateUser
```bash
curl -X POST "http://10.0.0.108/api/login/updateUser?token=${TOKEN_VALUE}" \
  -H "Authorization: Bearer ${TOKEN_VALUE}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "nickname=测试&avatar=http://...&token=${TOKEN_VALUE}"
```

- **成功**？ ✅ 说明需要在 URL 参数中添加 token
- **失败**？ ❌ 后台可能有其他问题，需要与开发者沟通

---

## 🎯 根据测试结果修改代码

### 如果 Test 3 和 Test 6 都成功

需要修改 `authModule.js` 中的 `updateUser` 函数，在 URL 中添加 token：

```javascript
// 第 721 行左右修改为：
const endpointUrl = CONFIG.ENDPOINTS.UPDATE_USER + '?token=' + token;

const response = await new Promise((resolve) => {
  wx.request({
    url: CONFIG.API_BASE_URL + endpointUrl,
    // ... 其他配置
  });
});
```

### 如果 Test 2 失败但 Test 3 成功

需要修改 `fetchUserInfo` 在 URL 中添加 token（已经修改过了，检查一下）

---

## 📝 记录你的测试结果

在这里记录每个测试的结果：

- [ ] Test 1 (登录): ________
- [ ] Test 2 (getUserInfo - header only): ________
- [ ] Test 3 (getUserInfo - URL 参数): ________
- [ ] Test 4 (updateUser - form-urlencoded): ________
- [ ] Test 5 (updateUser - multipart): ________
- [ ] Test 6 (updateUser - URL 参数): ________

**结论**：
后台需要在 __________ 中获取 token
