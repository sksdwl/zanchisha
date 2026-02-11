# Vercel KV 配置指南

## 为什么需要 Vercel KV？

当前项目使用**内存存储**管理房间状态，存在以下问题：

❌ **Serverless 函数重启后数据丢失**
❌ **多个实例之间数据不共享**
❌ **用户可能突然发现房间消失**

使用 **Vercel KV** 可以解决这些问题：

✅ **持久化存储** - 数据不会因服务重启而丢失
✅ **多实例共享** - 所有 serverless 实例访问同一数据
✅ **自动过期** - 房间数据 24 小时后自动清理
✅ **零配置扩展** - Vercel 自动管理，无需维护

## 配置步骤

### 1. 在 Vercel Dashboard 创建 KV 数据库

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 点击 **Storage** 标签
4. 点击 **Create Database**
5. 选择 **KV (Key-Value Store)**
6. 输入数据库名称（如 `zanchisha-rooms`）
7. 选择区域（建议选择离用户最近的区域）
8. 点击 **Create**

### 2. 连接 KV 到项目

创建完成后，Vercel 会自动将以下环境变量添加到你的项目：

```bash
KV_REST_API_URL=https://xxx.kv.vercel-storage.com
KV_REST_API_TOKEN=xxx
KV_REST_API_READ_ONLY_TOKEN=xxx
```

这些变量会自动注入到所有部署环境（Production、Preview、Development）。

### 3. 本地开发配置

如果需要在本地开发时使用 KV：

1. 在 Vercel Dashboard 的 **Storage** → **KV** → 你的数据库
2. 点击 **.env.local** 标签
3. 复制环境变量到本地 `.env.local` 文件

```bash
# .env.local
KV_REST_API_URL=https://xxx.kv.vercel-storage.com
KV_REST_API_TOKEN=xxx
KV_REST_API_READ_ONLY_TOKEN=xxx
```

### 4. 验证配置

部署后，访问你的应用：

1. 创建一个房间（输入邀请码）
2. 在浏览器控制台查看日志：
   ```
   [UnifiedRoomManager] 使用存储: Vercel KV
   [RoomManagerKV] 创建房间: 123456, 创建者: 张三
   ```
3. 如果看到 `使用存储: Vercel KV`，说明配置成功！

## 降级机制

项目已实现**自动降级**机制：

- ✅ **有 KV 配置** → 使用 Vercel KV 存储
- ⚠️ **无 KV 配置** → 自动降级到内存存储
- 🔄 **KV 调用失败** → 自动降级到内存存储

即使不配置 KV，应用也能正常运行（使用内存存储）。

## 数据结构

### Key 格式
```
room:{inviteCode}
```

### Value 结构
```json
{
  "id": "room_1234567890",
  "inviteCode": "123456",
  "participants": [
    {
      "userId": "user_001",
      "userName": "张三",
      "isReady": true,
      "tasteProfile": { ... },
      "joinedAt": 1234567890
    }
  ],
  "status": "ready",
  "createdBy": "user_001",
  "startedAt": 1234567890
}
```

### TTL（过期时间）
- 所有房间数据：**24 小时**自动过期
- 过期后自动删除，无需手动清理

## 费用说明

### Vercel KV 免费额度

- **存储空间**: 256 MB
- **请求次数**: 30,000 次/月
- **带宽**: 100 MB/月

### 预估使用量

假设每个房间：
- 数据大小：~5 KB（包含 2-3 个参与者）
- 请求次数：~20 次（创建、加入、准备、轮询、开始、完成）

**免费额度可支持：**
- 存储：~50,000 个房间
- 请求：~1,500 个房间/月

对于 MVP 和小规模应用，**完全免费**！

## 监控和调试

### 查看 KV 数据

1. 在 Vercel Dashboard → **Storage** → 你的 KV 数据库
2. 点击 **Data** 标签
3. 可以查看所有 key-value 数据
4. 可以手动删除或编辑数据

### 查看日志

在 Vercel Dashboard → **Deployments** → 选择部署 → **Functions** 标签：

```
[UnifiedRoomManager] 使用存储: Vercel KV
[RoomManagerKV] 创建房间: 123456, 创建者: 张三
[RoomManagerKV] 用户 李四 加入房间: 123456
[RoomManagerKV] 房间 123456 所有人已准备 (2人)
```

### 错误处理

如果 KV 调用失败，会自动降级到内存存储：

```
[UnifiedRoomManager] KV 失败，降级到内存: Error: ...
[RoomManager] 创建房间: 123456, 创建者: 张三
```

## 常见问题

### Q: 不配置 KV 可以吗？
A: 可以！应用会自动使用内存存储，但数据会在服务重启后丢失。

### Q: 本地开发必须配置 KV 吗？
A: 不必须。本地开发可以使用内存存储，只在生产环境配置 KV。

### Q: KV 数据会永久保存吗？
A: 不会。所有房间数据 24 小时后自动过期删除。

### Q: 如何清理所有房间数据？
A: 在 Vercel Dashboard 的 KV 数据库中，可以手动删除所有 `room:*` 的 key。

### Q: 超过免费额度怎么办？
A: Vercel 会自动升级到付费计划，或者你可以切换到其他 KV 服务（如 Upstash Redis）。

## 迁移到其他 KV 服务

如果需要迁移到 Upstash Redis 或其他服务：

1. 修改 `lib/room-manager-kv.ts`，替换 `@vercel/kv` 为其他客户端
2. 更新环境变量配置
3. 保持 API 接口不变

代码已经做了抽象，迁移成本很低。

## 总结

✅ **推荐配置 Vercel KV** - 提供更好的用户体验
⚠️ **不配置也能用** - 自动降级到内存存储
🚀 **零成本开始** - 免费额度足够 MVP 使用
