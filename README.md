# 🍜 咱吃啥

基于 SecondMe AI 的群体口味匹配系统，帮助一群朋友找到大家都喜欢的餐厅。

## ✨ 核心功能

### 1. AI 菜品语义分析
- 用户上传喜欢的菜品列表（支持批量粘贴）
- AI 自动标准化菜名（纠正错别字、统一别名，如 "宫爆鸡丁"→"宫保鸡丁"）
- 提取口味画像：菜系偏好、辣度/甜度等特征

### 2. 群体口味匹配
- 合并多个用户的口味画像
- 找出共同偏好的菜系
- 计算群体平均口味特征

### 3. 智能推荐
- 根据匹配结果推荐餐厅类型
- 口味差异大时给出替代方案（融合菜、自助、火锅等）

### 4. SecondMe OAuth 登录
- 使用 SecondMe 账号安全登录
- 无需额外注册，一键授权
- Token 自动刷新

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
```bash
cp .env.example .env.local
```

编辑 `.env.local`：
```env
# SecondMe API Key（用于 AI 分析）
SECONDME_API_KEY=your_api_key_here

# OAuth2 配置（用于用户登录）
SECONDME_CLIENT_ID=your_client_id_here
SECONDME_CLIENT_SECRET=your_client_secret_here
SECONDME_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

### 3. 运行开发服务器
```bash
npm run dev
```

访问 http://localhost:3000

## 📁 项目结构

```
secondme-oauth-demo/
├── app/
│   ├── (pages)/
│   │   └── dish-analyzer/
│   │       └── page.tsx       # 主页面 UI
│   ├── api/
│   │   ├── analyze-dishes/    # AI 分析 API
│   │   │   └── route.ts
│   │   └── auth/              # OAuth 认证
│   │       ├── callback/      # OAuth 回调
│   │       ├── login/         # 登录入口
│   │       ├── logout/        # 登出
│   │       └── session/       # 登录状态查询
│   ├── page.tsx               # 首页
│   ├── layout.tsx             # 根布局
│   └── globals.css
├── components/
│   └── auth/
│       ├── auth-provider.tsx  # 登录状态管理
│       └── login-button.tsx   # 登录按钮
├── lib/
│   └── ai-dish-analyzer.ts    # AI 分析类型定义
├── .secondme/
│   └── state.json             # 项目配置
└── ...配置文件
```

## 🔐 OAuth 登录流程

```
┌──────────┐     1. 点击登录      ┌──────────────┐
│          │ ───────────────────→ │              │
│   用户   │                      │   Next.js    │
│          │ ←─────────────────── │   后端       │
└──────────┘   2. 返回授权 URL     └──────────────┘
     │
     │ 3. 跳转授权
     ▼
┌──────────────┐
│  SecondMe    │
│  授权页面    │
└──────────────┘
     │
     │ 4. 授权完成，返回 code
     ▼
┌──────────┐     5. 回调处理      ┌──────────────┐
│          │ ───────────────────→ │              │
│   用户   │                      │   Next.js    │
│          │ ←─────────────────── │   后端       │
└──────────┘   6. 换取 token      └──────────────┘
                      ↓
              7. 保存到 httpOnly cookie
                      ↓
              8. 重定向到应用首页
```

## 🔌 API 说明

### AI 分析接口
```http
POST /api/analyze-dishes
Content-Type: application/json

{
  "userId": "user_123",
  "dishes": ["宫保鸡丁", "麻婆豆腐", "水煮鱼"]
}
```

### OAuth 接口
- `GET /api/auth/login` - 获取授权 URL
- `GET /api/auth/callback` - OAuth 回调处理
- `POST /api/auth/logout` - 登出
- `GET /api/auth/session` - 查询登录状态

## 🛣️ 开发路线图

- [x] AI 语义分析模块
- [x] 群体口味匹配算法
- [x] 前端 UI 界面
- [x] 后端 API 路由
- [x] SecondMe API 接入
- [x] OAuth 用户认证
- [ ] 接入大众点评商家数据
- [ ] 历史记录和数据持久化
- [ ] 部署上线

## 🚀 部署

### Vercel 部署
```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel --prod
```

**环境变量配置（Vercel Dashboard）**
- `SECONDME_API_KEY`
- `SECONDME_CLIENT_ID`
- `SECONDME_CLIENT_SECRET`
- `SECONDME_REDIRECT_URI`（设置为生产环境地址）
- `NEXT_PUBLIC_APP_URL`

### Docker 部署
```bash
# 构建镜像
docker build -t zanchisha .

# 运行
docker run -p 3000:3000 \
  -e SECONDME_API_KEY=xxx \
  -e SECONDME_CLIENT_ID=xxx \
  -e SECONDME_CLIENT_SECRET=xxx \
  zanchisha
```

## 📄 License

MIT
