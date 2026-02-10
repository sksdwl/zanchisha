#!/bin/bash

# 🚀 咱吃啥 部署脚本

echo "🍜 咱吃啥 - 部署脚本"
echo "====================="
echo ""

# 检查环境变量
if [ -z "$SECONDME_CLIENT_ID" ] || [ -z "$SECONDME_CLIENT_SECRET" ]; then
    echo "⚠️  警告: SECONDME_CLIENT_ID 或 SECONDME_CLIENT_SECRET 未设置"
    echo "    OAuth 登录功能将不可用"
    echo ""
fi

if [ -z "$SECONDME_API_KEY" ]; then
    echo "⚠️  警告: SECONDME_API_KEY 未设置"
    echo "    AI 分析将使用模拟数据"
    echo ""
fi

# 安装依赖
echo "📦 安装依赖..."
npm ci

# 构建
echo "🔨 构建项目..."
npm run build

# 检查构建是否成功
if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi

echo ""
echo "✅ 构建成功！"
echo ""
echo "启动命令:"
echo "  npm start"
echo ""
echo "或者使用 Docker:"
echo "  docker build -t zanchisha ."
echo "  docker run -p 3000:3000 zanchisha"
