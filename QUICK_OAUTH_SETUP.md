# 快速配置 OAuth 登录

## 🎯 当前状态

✅ **Google** - 已完成，可以使用  
⏳ **GitHub** - 代码已完成，需要你配置  
⏳ **LinkedIn** - 代码已完成，需要你配置  
⏳ **Facebook** - 代码已完成，需要你配置  

---

## 1️⃣ GitHub 登录（最简单，5分钟）

### 创建 OAuth App

1. 访问 https://github.com/settings/developers
2. 点击 **"New OAuth App"**
3. 填写：
   - Application name: `AI Image Enhancer`
   - Homepage URL: `https://aiimageenhancer.xyz`
   - Authorization callback URL: `https://aiimageenhancer.xyz`
4. 点击 **"Register application"**
5. 记录 **Client ID** 和 **Client Secret**

### 配置服务器

在服务器上运行：

```bash
# 编辑环境变量
sudo nano /etc/environment

# 添加这两行（替换成你的值）
GITHUB_CLIENT_ID=你的Client_ID
GITHUB_CLIENT_SECRET=你的Client_Secret

# 保存后重启 API
sudo pm2 restart enhance-api --update-env
```

### 更新前端配置

编辑 `src/components/Header.tsx` 第 91 行：

```typescript
const clientId = '你的GitHub_Client_ID'; // 替换这里
```

然后 git push，等待自动部署。

---

## 2️⃣ LinkedIn 登录（需要公司页面）

### 创建应用

1. 访问 https://www.linkedin.com/developers/apps
2. 点击 **"Create app"**
3. 填写应用信息（需要关联 LinkedIn 公司页面）
4. 在 **"Auth"** 标签：
   - Redirect URLs: 添加 `https://aiimageenhancer.xyz`
5. 在 **"Products"** 标签：
   - 申请 **"Sign In with LinkedIn using OpenID Connect"**
6. 记录 **Client ID** 和 **Client Secret**

### 配置服务器

```bash
sudo nano /etc/environment

# 添加
LINKEDIN_CLIENT_ID=你的Client_ID
LINKEDIN_CLIENT_SECRET=你的Client_Secret

sudo pm2 restart enhance-api --update-env
```

### 更新前端配置

编辑 `src/components/Header.tsx` 第 128 行：

```typescript
const clientId = '你的LinkedIn_Client_ID'; // 替换这里
```

---

## 3️⃣ Facebook 登录

### 创建应用

1. 访问 https://developers.facebook.com/apps
2. 点击 **"Create App"** → 选择 **"Consumer"**
3. 填写应用名称
4. 在 **"Facebook Login"** → **"Settings"**：
   - Valid OAuth Redirect URIs: `https://aiimageenhancer.xyz`
5. 在 **"Settings"** → **"Basic"**：
   - App Domains: `aiimageenhancer.xyz`
   - 记录 **App ID** 和 **App Secret**

### 配置服务器

```bash
sudo nano /etc/environment

# 添加
FACEBOOK_APP_ID=你的App_ID
FACEBOOK_APP_SECRET=你的App_Secret

sudo pm2 restart enhance-api --update-env
```

### 更新前端配置

编辑 `src/app/layout.tsx` 第 80 行：

```typescript
appId: '你的Facebook_App_ID', // 替换这里
```

---

## 🚀 完成后测试

1. 等待 GitHub Actions 部署完成（2-3分钟）
2. 访问 https://aiimageenhancer.xyz
3. 点击登录按钮
4. 点击对应的图标（GitHub/LinkedIn/Facebook）
5. 完成授权
6. 检查是否成功登录

---

## 📝 注意事项

- **GitHub 最简单**，建议先配置这个
- **LinkedIn 需要公司页面**，个人账号可能无法创建
- **Facebook 需要审核**，应用需要设置为 "Live" 模式
- **环境变量**修改后一定要重启 API 服务器
- **前端配置**修改后需要 git push 触发自动部署

---

## ❓ 遇到问题？

1. **登录按钮点击无反应**
   - 检查浏览器控制台错误
   - 确认环境变量已配置

2. **Authorization failed**
   - 检查 Client ID/Secret 是否正确
   - 确认回调 URL 完全匹配

3. **API 返回错误**
   - 运行 `sudo pm2 logs enhance-api` 查看日志
   - 确认环境变量已生效

---

现在可以开始配置了！建议从 GitHub 开始，最简单。
