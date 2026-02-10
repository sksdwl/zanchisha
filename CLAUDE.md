# SecondMe 集成项目

## 应用信息

- **App Name**: 咱吃啥
- **Client ID**: f4e8b6b0-***

## API 文档

开发时请参考官方文档（从 `.secondme/state.json` 的 `docs` 字段读取）：

| 文档 | 配置键 |
|------|--------|
| 快速入门 | `docs.quickstart` |
| OAuth2 认证 | `docs.oauth2` |
| API 参考 | `docs.api_reference` |
| 错误码 | `docs.errors` |

## 关键信息

- API 基础 URL: https://app.mindos.com/gate/lab
- OAuth 授权 URL: https://go.second.me/oauth/
- Access Token 有效期: 2 小时
- Refresh Token 有效期: 30 天

> 所有 API 端点配置请参考 `.secondme/state.json` 中的 `api` 和 `docs` 字段

## 已选模块

- ✅ auth - OAuth 认证（登录/登出）
- ✅ profile - 用户信息展示（基础信息、兴趣标签、软记忆）
- ✅ chat - 与 SecondMe AI 聊天
- ✅ act - 结构化动作判断（返回 JSON）
- ✅ note - 添加笔记到 SecondMe

## 权限列表 (Scopes)

根据 App Info 中的 Allowed Scopes：

| 权限 | 说明 | 状态 |
|------|------|------|
| `user.info` | 用户基础信息 | ✅ 已授权 |
| `user.info.shades` | 用户兴趣标签 | ✅ 已授权 |
| `user.info.softmemory` | 用户软记忆 | ✅ 已授权 |
| `chat` | 聊天功能 | ✅ 已授权 |
| `note.add` | 添加笔记 | ✅ 已授权 |
| `voice` | 语音功能 | ✅ 已授权 |

## API 响应格式

**所有 SecondMe API 响应都遵循统一格式：**

```json
{
  "code": 0,
  "data": { ... }
}
```

**前端代码必须正确提取数据：**

```typescript
// ❌ 错误写法
const response = await fetch('/api/secondme/user/shades');
const shades = await response.json();
shades.map(item => ...)  // 错误！

// ✅ 正确写法
const response = await fetch('/api/secondme/user/shades');
const result = await response.json();
if (result.code === 0) {
  const shades = result.data.shades;  // 正确！
  shades.map(item => ...)
}
```

## 数据路径参考

| 上游 API 路径 | 数据路径 | 类型 |
|--------------|---------|------|
| `/api/secondme/user/info` | `result.data` | object |
| `/api/secondme/user/shades` | `result.data.shades` | array |
| `/api/secondme/user/softmemory` | `result.data.list` | array |
| `/api/secondme/chat/session/list` | `result.data.sessions` | array |
| `/api/secondme/chat/session/messages` | `result.data.messages` | array |
| `/api/secondme/note/add` | `result.data.noteId` | number |

## 官方文档链接

- 快速入门: https://develop-docs.second.me/zh/docs
- 认证概述: https://develop-docs.second.me/zh/docs/authentication
- OAuth2 指南: https://develop-docs.second.me/zh/docs/authentication/oauth2
- SecondMe API 参考: https://develop-docs.second.me/zh/docs/api-reference/secondme
- OAuth2 API 参考: https://develop-docs.second.me/zh/docs/api-reference/oauth
- 错误码参考: https://develop-docs.second.me/zh/docs/errors
