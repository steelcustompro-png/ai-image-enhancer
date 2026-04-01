# OAuth 登录配置指南

## 已实现的登录方式

1. ✅ **Google** (已配置)
2. 🔧 **GitHub** (需要配置)
3. 🔧 **LinkedIn** (需要配置)
4. 🔧 **Facebook** (需要配置)

---

## GitHub OAuth 配置

### 1. 创建 OAuth App

1. 访问 https://github.com/settings/developers
2. 点击 **"New OAuth App"**
3. 填写信息：
   - **Application name**: AI Image Enhancer
   - **Homepage URL**: https://aiimageenhancer.xyz
   - **Authorization callback URL**: https://aiimageenhancer.xyz
4. 点击 **"Register application"**
5. 记录：
   - **Client ID**
   - **Client Secret** (点击 "Generate a new client secret")

### 2. 配置环境变量

在服务器上添加环境变量：

```bash
# 编辑 ~/.bashrc 或 /etc/environment
export GITHUB_CLIENT_ID="你的Client_ID"
export GITHUB_CLIENT_SECRET="你的Client_Secret"
```

或者在 PM2 ecosystem 文件中添加：

```javascript
env: {
  GITHUB_CLIENT_ID: "你的Client_ID",
  GITHUB_CLIENT_SECRET: "你的Client_Secret"
}
```

### 3. 重启 API 服务器

```bash
sudo pm2 restart enhance-api --update-env
```

---

## LinkedIn OAuth 配置

### 1. 创建应用

1. 访问 https://www.linkedin.com/developers/apps
2. 点击 **"Create app"**
3. 填写信息：
   - **App name**: AI Image Enhancer
   - **LinkedIn Page**: (选择或创建公司页面)
   - **App logo**: (上传logo)
4. 在 **"Auth"** 标签：
   - **Redirect URLs**: 添加 `https://aiimageenhancer.xyz`
5. 在 **"Products"** 标签：
   - 申请 **"Sign In with LinkedIn using OpenID Connect"**
6. 记录：
   - **Client ID**
   - **Client Secret**

### 2. 配置环境变量

```bash
export LINKEDIN_CLIENT_ID="你的Client_ID"
export LINKEDIN_CLIENT_SECRET="你的Client_Secret"
```

### 3. 重启服务器

```bash
sudo pm2 restart enhance-api --update-env
```

---

## Facebook OAuth 配置

### 1. 创建应用

1. 访问 https://developers.facebook.com/apps
2. 点击 **"Create App"**
3. 选择 **"Consumer"** 类型
4. 填写应用名称
5. 在左侧菜单 → **"Facebook Login"** → **"Settings"**：
   - **Valid OAuth Redirect URIs**: 添加 `https://aiimageenhancer.xyz`
6. 在 **"Settings"** → **"Basic"**：
   - 记录 **App ID** 和 **App Secret**
   - 添加 **App Domains**: `aiimageenhancer.xyz`

### 2. 配置环境变量

```bash
export FACEBOOK_APP_ID="你的App_ID"
export FACEBOOK_APP_SECRET="你的App_Secret"
```

### 3. 前端配置

在 `src/app/layout.tsx` 添加 Facebook SDK：

```tsx
<script async defer crossOrigin="anonymous" 
  src="https://connect.facebook.net/en_US/sdk.js"
  onLoad={() => {
    (window as any).FB.init({
      appId: '你的App_ID',
      cookie: true,
      xfbml: true,
      version: 'v18.0'
    });
  }}
></script>
```

### 4. 重启服务器

```bash
sudo pm2 restart enhance-api --update-env
```

---

## 前端集成 (已完成基础代码)

前端代码已在 `src/components/Header.tsx` 中实现基本的 OAuth 流程。

### GitHub & LinkedIn

使用弹出窗口 OAuth 流程：
1. 用户点击按钮
2. 打开授权页面
3. 授权后获取 code
4. 前端发送 code 到后端
5. 后端验证并返回 JWT token

### Facebook

使用 Facebook SDK 的原生登录流程。

---

## 测试步骤

1. 配置所需的环境变量
2. 重启 API 服务器
3. 访问 https://aiimageenhancer.xyz
4. 点击对应的登录按钮
5. 完成授权流程
6. 检查是否成功登录并获取用户信息

---

## 安全建议

1. ✅ **不要**将 Client Secret 提交到 Git
2. ✅ 使用环境变量管理敏感信息
3. ✅ 定期轮换 API 密钥
4. ✅ 限制 OAuth 回调域名
5. ✅ 启用 HTTPS（已完成）

---

## 故障排除

### GitHub 登录失败

- 检查 Client ID 和 Secret 是否正确
- 确认回调 URL 匹配
- 查看浏览器控制台错误

### LinkedIn 登录失败

- 确认已申请并通过 "Sign In with LinkedIn" 产品
- 检查 Redirect URLs 配置
- 确认公司页面已关联

### Facebook 登录失败

- 确认应用状态为 "Live"（而不是 Development）
- 检查 App Domains 配置
- 确认 Valid OAuth Redirect URIs 正确

---

## 当前状态

- ✅ Google: 已配置并测试
- ⏳ GitHub: 后端已实现，等待配置
- ⏳ LinkedIn: 后端已实现，等待配置
- ⏳ Facebook: 后端已实现，等待配置
