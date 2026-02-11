# 多 Agent 讨论系统测试指南

## ✅ 已完成的实现

### 后端系统
- ✅ DeepSeek API 客户端 ([lib/deepseek-client.ts](lib/deepseek-client.ts))
- ✅ AI Agent 类 ([lib/ai-agent.ts](lib/ai-agent.ts))
- ✅ Agent 协调器 ([lib/agent-orchestrator.ts](lib/agent-orchestrator.ts))
- ✅ 房间管理器 ([lib/room-manager.ts](lib/room-manager.ts))
- ✅ 房间管理 API (ready, start, status)
- ✅ SSE 流式响应 API ([app/api/avatar-chat/stream/route.ts](app/api/avatar-chat/stream/route.ts))

### 前端系统
- ✅ 准备和开始按钮 ([components/room/group-chat-room.tsx](components/room/group-chat-room.tsx))
- ✅ SecondMe 用户信息加载
- ✅ SSE 实时消息接收 ([components/avatar/avatar-chat-visual.tsx](components/avatar/avatar-chat-visual.tsx))

### 配置
- ✅ DeepSeek API Key 已配置到 .env.local
- ✅ 支持 DEEPSEEK_ 和 OPENAI_ 两种环境变量格式

## 🚀 测试步骤

### 1. 启动开发服务器

```bash
npm run dev
```

服务器应该在 http://localhost:3000 启动

### 2. 测试流程

#### 步骤 1: 进入房间
1. 打开浏览器访问 http://localhost:3000
2. 输入邀请码（例如：123456）
3. 点击"加入房间"

#### 步骤 2: 完成口味画像
1. 系统会自动加载 SecondMe 用户信息（如果已登录）
2. 看到 "✅ 已加载你的 SecondMe 个人画像" 提示
3. 点击"准备完成"按钮
4. 状态变为 "✅ 已准备"

#### 步骤 3: 开始讨论（创建者）
1. 如果你是第一个进入的人（创建者），会看到 "🚀 开始讨论" 按钮
2. 点击"开始讨论"
3. 系统开始调用 DeepSeek API

#### 步骤 4: 观察实时讨论
1. 消息会通过 SSE 实时推送
2. 每个 Agent 依次发言（共 5 轮）
3. 可以看到打字机效果和头像动画
4. 最终生成餐厅推荐

### 3. 验证点

#### ✅ 后端验证
- [ ] DeepSeek API 调用成功（检查控制台日志）
- [ ] Agent 生成真实对话（不是固定脚本）
- [ ] SSE 流式推送正常工作
- [ ] 房间状态管理正确（waiting → ready → discussing）

#### ✅ 前端验证
- [ ] SecondMe 用户信息正确加载
- [ ] 准备按钮功能正常
- [ ] 开始按钮仅创建者可见
- [ ] 消息实时显示（不是一次性加载）
- [ ] 打字机效果流畅
- [ ] 最终推荐正确显示

#### ✅ 降级策略验证
如果 DeepSeek API 失败：
- [ ] 自动降级到模拟对话
- [ ] 显示错误提示："正在使用备用方案..."
- [ ] 模拟对话正常显示

## 🐛 常见问题排查

### 问题 1: DeepSeek API 调用失败

**症状**: 控制台显示 "DeepSeek API 调用失败"

**解决方案**:
1. 检查 .env.local 中的 API Key 是否正确
2. 检查 API Base URL 是否正确（https://api.deepseek.com/v1）
3. 检查网络连接
4. 查看 DeepSeek 平台是否有余额

### 问题 2: SSE 连接失败

**症状**: 消息不实时显示

**解决方案**:
1. 检查浏览器控制台是否有 CORS 错误
2. 检查 /api/avatar-chat/stream 端点是否正常
3. 使用浏览器开发者工具查看 Network 标签中的 EventStream

### 问题 3: 房间状态不更新

**症状**: 点击"准备完成"后状态不变

**解决方案**:
1. 检查 /api/room/ready 端点是否返回正确
2. 查看浏览器控制台是否有错误
3. 检查 roomManager 是否正确初始化

### 问题 4: SecondMe 信息未加载

**症状**: 没有显示 "✅ 已加载你的 SecondMe 个人画像"

**解决方案**:
1. 检查是否已登录 SecondMe
2. 检查 /api/auth/session 是否返回正确
3. 检查 /api/secondme/user/shades 和 /api/secondme/user/softmemory 端点

## 📊 测试数据

### 模拟用户口味画像

```javascript
{
  user_id: 'user_1',
  preferred_cuisines: [
    { name: '川菜', weight: 0.8 },
    { name: '湘菜', weight: 0.6 }
  ],
  taste_profile: {
    spicy: 0.7,
    sweet: 0.3,
    salty: 0.5,
    sour: 0.4,
    numbing: 0.6
  },
  preferred_ingredients: ['牛肉', '辣椒', '豆腐'],
  cooking_methods: ['炒', '煮'],
  price_level: 2
}
```

### 预期 Agent 对话示例

```
Agent 1: 我比较喜欢吃辣的，建议我们去吃川菜，比如水煮鱼或者麻辣香锅。
Agent 2: 我也喜欢辣的，但是我更偏向湘菜，剁椒鱼头怎么样？
Agent 1: 剁椒鱼头不错，我们可以找一家湘菜馆。
Agent 2: 好的，那就定湘菜了。
```

## 🔍 调试技巧

### 1. 查看 DeepSeek API 请求

在 [lib/deepseek-client.ts](lib/deepseek-client.ts) 中添加日志：

```typescript
console.log('DeepSeek Request:', {
  model: this.config.model,
  messages: messages,
  temperature: this.config.temperature
});
```

### 2. 查看 Agent 生成的消息

在 [lib/ai-agent.ts](lib/ai-agent.ts) 中添加日志：

```typescript
console.log('Agent Response:', {
  userId: this.id,
  userName: this.userName,
  content: response
});
```

### 3. 查看 SSE 流

在浏览器控制台中：

```javascript
// 监听 SSE 事件
const eventSource = new EventSource('/api/avatar-chat/stream');
eventSource.onmessage = (event) => {
  console.log('SSE Message:', JSON.parse(event.data));
};
```

## 📝 测试检查清单

### 基础功能测试
- [ ] 进入房间成功
- [ ] 口味画像提交成功
- [ ] 准备状态更新成功
- [ ] 开始讨论成功
- [ ] 消息实时显示
- [ ] 最终推荐生成

### 多用户测试
- [ ] 两个用户同时进入房间
- [ ] 两个用户都准备完成
- [ ] 创建者开始讨论
- [ ] 两个 Agent 交替发言

### 边界情况测试
- [ ] DeepSeek API 失败时降级
- [ ] 网络中断时的处理
- [ ] 房间不存在时的提示
- [ ] 非创建者点击开始的限制

### 性能测试
- [ ] 5 轮讨论完成时间（预计 30-60 秒）
- [ ] SSE 消息延迟（应该 < 1 秒）
- [ ] 内存占用正常

## 🎯 成功标准

测试通过的标准：
1. ✅ DeepSeek API 调用成功，生成真实对话
2. ✅ SSE 实时推送消息，无延迟
3. ✅ 房间状态管理正确
4. ✅ SecondMe 用户信息正确集成
5. ✅ 降级策略正常工作
6. ✅ 用户体验流畅，无明显卡顿

## 📞 问题反馈

如果遇到问题，请提供：
1. 浏览器控制台错误日志
2. 服务器控制台日志
3. 复现步骤
4. 预期行为 vs 实际行为

---

**测试完成后，请在 GitHub 上创建 Pull Request 并标记为 "Ready for Review"**
