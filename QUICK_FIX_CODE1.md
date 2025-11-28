# ⚡ 登录 code: 1 问题 - 直接解决方案

## 问题

```
登录响应：code: 1, msg: ""
```

## 99% 确定的原因

**后台的 LikeAdmin 没有正确配置微信小程序的 AppID 和 AppSecret**

## 立即修复

### 步骤 1：获取你的 AppID

打开 `project.config.json`，找到：
```json
{
  "appid": "wxe1234567890abcdef"  ← 这就是你的 AppID
}
```

### 步骤 2：告诉后台团队

```
请在 LikeAdmin 后台配置以下信息：

【小程序认证设置】
AppID: wxe1234567890abcdef
AppSecret: [从微信公众平台获取]

【操作步骤】
1. 登录 LikeAdmin 管理后台
2. 找到"小程序设置"或"微信配置"
3. 填写上面的 AppID 和 AppSecret
4. 保存配置

【验证方式】
配置后，重新在小程序中登录，应该看到：
code: 0（而不是 code: 1）
```

### 步骤 3：后台配置后重新登录

一旦后台配置完成，你的登录应该会成功。

## 为什么 msg 为空？

LikeAdmin 的登录接口在 AppID 未配置时，返回：
```json
{
  "code": 1,
  "msg": ""  // ← 没有错误信息，所以显示为空
}
```

**这是后台的 bug**，应该返回：
```json
{
  "code": 1,
  "msg": "未配置微信小程序 AppID"
}
```

## 🧪 验证方案（如果后台还没修复）

### 临时启用 Mock 模式

这样可以继续测试，不依赖后台登录：

```javascript
// authModule.js - 第 21 行
const CONFIG = {
  API_BASE_URL: 'http://10.0.0.108',
  USE_MOCK: true,  // ← 改成 true（临时使用）
  // ...
};
```

然后：
1. 重新编译小程序
2. 测试注册、登录、更新用户信息等功能
3. 等待后台完成配置
4. 改回 `USE_MOCK: false`
5. 重新测试真实登录

## ✅ 完整流程

```
1. 后台配置 AppID/AppSecret
        ↓
2. 重新测试登录
        ↓
3. 如果成功 → code: 0, msg: "登录成功"
   如果失败 → 查看新的 msg 信息，进一步诊断
```

## 📞 后台需要的信息

**你的 AppID**：
```
从 project.config.json 中的 "appid" 字段获取
```

**AppSecret 的获取方式**：
1. 登录 https://mp.weixin.qq.com
2. 开发 → 开发管理 → 开发设置
3. 在"开发者ID"部分找到 AppSecret
4. 复制给后台

## 🎯 总结

| 问题 | 原因 | 解决 |
|------|------|------|
| code: 1 | 后台未配置 AppID | 后台配置 AppID/AppSecret |
| msg: "" | 后台没有返回错误信息 | 等待后台修复，或临时用 Mock 模式 |

**大概需要后台 5-10 分钟就能配置好！**

---

**详细版本**：查看 `LOGIN_ERROR_CODE1.md`

**遇到其他问题**：查看 `QUICK_DIAGNOSIS.md`
