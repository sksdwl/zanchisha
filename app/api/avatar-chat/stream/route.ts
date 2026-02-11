/**
 * SSE 流式响应 API
 * POST /api/avatar-chat/stream
 * 实时推送 Agent 讨论消息
 */

import { NextRequest } from 'next/server';
import { DeepSeekClient } from '@/lib/deepseek-client';
import { FoodDiscussionAgent } from '@/lib/ai-agent';
import { AgentOrchestrator } from '@/lib/agent-orchestrator';
import { roomManager } from '@/lib/room-manager';
import { generateAvatarPersonality } from '@/lib/ai-avatar-chat';

export async function POST(request: NextRequest) {
  const { inviteCode } = await request.json();

  console.log(`[SSE] 收到流式请求，房间: ${inviteCode}`);

  // 1. 验证房间状态
  const room = roomManager.getRoom(inviteCode);

  if (!room) {
    console.error(`[SSE] 房间不存在: ${inviteCode}`);
    return new Response(JSON.stringify({ code: 400, message: '房间不存在' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`[SSE] 房间状态: ${room.status}, 参与者: ${room.participants.length}`);

  if (room.status !== 'discussing') {
    console.error(`[SSE] 房间状态错误: ${room.status}, 期望: discussing`);
    return new Response(JSON.stringify({ code: 400, message: `房间未开始讨论，当前状态: ${room.status}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. 创建 SSE 流
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 3. 创建 LLM 客户端
        const llmClient = new DeepSeekClient();

        // 4. 创建 Agent 实例
        const agents = room.participants
          .filter(p => p.tasteProfile) // 只包含有口味画像的参与者
          .map(p =>
            new FoodDiscussionAgent({
              userId: p.userId,
              userName: p.userName,
              avatarName: `${p.userName}的美食向导`,
              avatarPersonality: generateAvatarPersonality(p.tasteProfile!),
              tasteProfile: p.tasteProfile!,
              isOnline: true,
            }, llmClient)
          );

        if (agents.length === 0) {
          throw new Error('没有可用的参与者');
        }

        // 5. 创建协调器
        const maxRounds = parseInt(process.env.AGENT_MAX_ROUNDS || '5');
        const orchestrator = new AgentOrchestrator(agents, { maxRounds });

        // 6. 监听消息事件，实时推送
        orchestrator.on('message', (message) => {
          const data = `data: ${JSON.stringify({ type: 'message', data: message })}\n\n`;
          controller.enqueue(encoder.encode(data));
        });

        // 7. 运行讨论
        console.log(`[SSE] 开始 Agent 讨论，房间: ${inviteCode}, 参与者: ${agents.length}`);
        const session = await orchestrator.runDiscussion();

        // 8. 推送最终推荐
        const finalData = `data: ${JSON.stringify({ type: 'recommendation', data: session.recommendation })}\n\n`;
        controller.enqueue(encoder.encode(finalData));

        // 9. 推送完成信号
        const doneData = `data: ${JSON.stringify({ type: 'done' })}\n\n`;
        controller.enqueue(encoder.encode(doneData));

        // 10. 更新房间状态
        roomManager.completeDiscussion(inviteCode, session);

        console.log(`[SSE] Agent 讨论完成，房间: ${inviteCode}`);
        controller.close();
      } catch (error: any) {
        // 错误处理：降级到模拟对话
        console.error('[SSE] Agent 讨论失败，降级到模拟对话:', error);

        const errorData = `data: ${JSON.stringify({ type: 'error', message: '正在使用备用方案...' })}\n\n`;
        controller.enqueue(encoder.encode(errorData));

        try {
          // 调用现有的模拟对话生成
          const { generateFullConversation } = await import('@/app/api/avatar-chat/complete/route');
          const { mergeProfiles } = await import('@/lib/ai-dish-analyzer');

          const participants = room.participants
            .filter(p => p.tasteProfile)
            .map(p => ({
              userId: p.userId,
              userName: p.userName,
              avatarName: `${p.userName}的美食向导`,
              avatarPersonality: generateAvatarPersonality(p.tasteProfile!),
              tasteProfile: p.tasteProfile!,
              isOnline: true,
            }));

          const merged = mergeProfiles(participants.map(p => p.tasteProfile));
          const messages = generateFullConversation(participants, merged);

          // 推送模拟消息
          for (const message of messages) {
            const data = `data: ${JSON.stringify({ type: 'message', data: message })}\n\n`;
            controller.enqueue(encoder.encode(data));
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // 推送完成信号
          const doneData = `data: ${JSON.stringify({ type: 'done' })}\n\n`;
          controller.enqueue(encoder.encode(doneData));

          console.log(`[SSE] 模拟对话完成，房间: ${inviteCode}`);
        } catch (fallbackError: any) {
          console.error('[SSE] 模拟对话也失败:', fallbackError);
          const errorData = `data: ${JSON.stringify({ type: 'error', message: '对话生成失败' })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
        }

        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
