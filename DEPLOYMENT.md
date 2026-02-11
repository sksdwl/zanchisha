# Vercel 部署指南

## 前置准备

1. 注册 [Vercel 账号](https://vercel.com)
2. 安装 Vercel CLI（可选）：`npm i -g vercel`
3. 准备好所有 API 密钥

## 方式一：通过 Vercel Dashboard 部署（推荐）

### 1. 导入项目

1. 访问 [Vercel Dashboard](https://vercel.com/new)
2. 选择 "Import Git Repository"
3. 连接你的 GitHub 账号
4. 选择 `zanchisha` 仓库
5. 点击 "Import"

### 2. 配置环境变量

在项目设置页面，进入 **Settings** → **Environment Variables**，添加以下变量：

#### DeepSeek API 配置
```
DEEPSEEK_API_KEY=sk-415cd12d3be64a4a8ae3e6331c012f44
DEEPSEEK_API_BASE=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_TEMPERATURE=0.7
DEEPSEEK_MAX_TOKENS=2000
```

#### SecondMe OAuth 配置
```
SECONDME_CLIENT_ID=f4e8b6b0-3dc5-453f-a85c-16616323a973
SECONDME_CLIENT_SECRET=8535d0dcfddf7226c7ea4cf88e351e872285c89f693cc5147c408d3e1a8ec7ad
SECONDME_REDIRECT_URI=https://your-domain.vercel.app/api/auth/callback
SECONDME_API_BASE=https://app.mindos.com/gate/lab
```

⚠️ **重要**：将 `SECONDME_REDIRECT_URI` 中的 `your-domain` 替换为你的实际 Vercel 域名

#### 高德地图配置
```
NEXT_PUBLIC_AMAP_KEY=your_amap_web_key
AMAP_WEB_KEY=your_amap_web_service_key
```

#### 应用配置
```
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
AGENT_MAX_ROUNDS=5
AGENT_TIMEOUT_MS=30000
```

### 3. 选择环境

为每个环境变量选择适用的环境：
- ✅ **Production** - 生产环境（必选）
- ✅ **Preview** - 预览环境（推荐）
- ✅ **Development** - 开发环境（可选）

### 4. 部署

1. 点击 **Deploy** 按钮
2. 等待构建完成（约 2-3 分钟）
3. 部署成功后会显示域名

### 5. 配置 SecondMe 回调地址

1. 访问 [SecondMe 开发者后台](https://app.mindos.com)
2. 找到你的应用设置
3. 在 "回调地址" 中添加：`https://your-domain.vercel.app/api/auth/callback`
4. 保存设置

## 方式二：通过 Vercel CLI 部署

### 1. 登录 Vercel

```bash
vercel login
```

### 2. 部署到生产环境

```bash
vercel --prod
```

### 3. 添加环境变量

```bash
# DeepSeek
vercel env add DEEPSEEK_API_KEY production
vercel env add DEEPSEEK_API_BASE production
vercel env add DEEPSEEK_MODEL production

# SecondMe
vercel env add SECONDME_CLIENT_ID production
vercel env add SECONDME_CLIENT_SECRET production
vercel env add SECONDME_REDIRECT_URI production

# 高德地图
vercel env add NEXT_PUBLIC_AMAP_KEY production
vercel env add AMAP_WEB_KEY production

# 应用配置
vercel env add NEXT_PUBLIC_APP_URL production
```

### 4. 重新部署

```bash
vercel --prod
```

## 验证部署

### 1. 检查环境变量

访问：`https://your-domain.vercel.app/api/auth/login`

应该返回包含 `oauth_url` 的 JSON，而不是错误信息。

### 2. 测试登录流程

1. 访问首页
2. 点击 "SecondMe 登录"
3. 跳转到 SecondMe 授权页面
4. 授权后应该跳转回应用

### 3. 测试 AI 讨论

1. 进入 "AI群聊房间"
2. 输入邀请码
3. 完成口味画像
4. 开始讨论
5. 查看推荐结果

## 常见问题

### 1. 环境变量未生效

**解决方案**：
- 确保环境变量已保存
- 重新部署项目（Vercel Dashboard → Deployments → Redeploy）

### 2. SecondMe 登录失败

**可能原因**：
- `SECONDME_REDIRECT_URI` 配置错误
- SecondMe 后台未添加回调地址

**解决方案**：
- 检查 `SECONDME_REDIRECT_URI` 是否与 Vercel 域名一致
- 在 SecondMe 后台添加回调地址

### 3. DeepSeek API 调用失败

**可能原因**：
- API Key 错误或过期
- API 配额用完

**解决方案**：
- 检查 `DEEPSEEK_API_KEY` 是否正确
- 查看 DeepSeek 控制台的使用情况

### 4. 高德地图不显示

**可能原因**：
- 高德地图 API Key 未配置或错误

**解决方案**：
- 检查 `NEXT_PUBLIC_AMAP_KEY` 和 `AMAP_WEB_KEY`
- 确保 Key 有权限访问地点搜索 API

## 自定义域名

### 1. 添加域名

1. 进入项目设置
2. 选择 **Domains**
3. 点击 **Add**
4. 输入你的域名
5. 按照提示配置 DNS

### 2. 更新环境变量

添加域名后，需要更新以下环境变量：
- `SECONDME_REDIRECT_URI`
- `NEXT_PUBLIC_APP_URL`

然后重新部署。

### 3. 更新 SecondMe 回调地址

在 SecondMe 后台添加新的回调地址。

## 监控和日志

### 查看部署日志

1. 进入项目 Dashboard
2. 选择 **Deployments**
3. 点击具体的部署
4. 查看 **Build Logs** 和 **Function Logs**

### 查看运行时日志

1. 进入项目 Dashboard
2. 选择 **Logs**
3. 实时查看 API 调用日志

## 性能优化

### 1. 启用边缘函数（可选）

在 `vercel.json` 中配置：
```json
{
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "edge"
    }
  }
}
```

### 2. 配置缓存

对于静态资源，Vercel 会自动配置 CDN 缓存。

### 3. 选择最近的区域

在 `vercel.json` 中设置：
```json
{
  "regions": ["hkg1"]
}
```

可选区域：
- `hkg1` - 香港（推荐，延迟最低）
- `sin1` - 新加坡
- `sfo1` - 旧金山

## 回滚部署

如果新部署有问题，可以快速回滚：

1. 进入 **Deployments**
2. 找到之前的稳定版本
3. 点击 **Promote to Production**

## 成本估算

Vercel 免费计划包含：
- ✅ 100 GB 带宽/月
- ✅ 无限部署
- ✅ 自动 HTTPS
- ✅ 边缘网络

如果超出免费额度，建议升级到 Pro 计划（$20/月）。

## 技术支持

- Vercel 文档：https://vercel.com/docs
- SecondMe 文档：https://develop-docs.second.me
- DeepSeek 文档：https://platform.deepseek.com/docs
- 高德地图文档：https://lbs.amap.com/api/webservice/summary

---

**部署完成后，记得测试所有功能！** 🎉
