App({
  globalData: {
    userInfo: null,
    inviteCode: null,
    roomInfo: null,
    tasteProfile: null,
    apiBase: 'https://your-server-domain.com/api' // 替换为你的服务器地址
  },

  onLaunch() {
    // 检查本地存储的邀请码
    const inviteCode = wx.getStorageSync('inviteCode');
    if (inviteCode) {
      this.globalData.inviteCode = inviteCode;
    }
    
    console.log('小程序启动');
  },

  // 验证邀请码
  async validateInviteCode(code) {
    // 模拟验证
    const validCodes = ['123456', '888888', '666666'];
    const roomNames = {
      '123456': '今晚聚餐群',
      '888888': '好友聚餐群',
      '666666': '周末聚会群'
    };
    
    if (validCodes.includes(code)) {
      return {
        valid: true,
        code: code,
        roomName: roomNames[code],
        maxUsers: 6
      };
    }
    return { valid: false };
  },

  // 模拟AI分身对话
  async generateAvatarChat(participants) {
    const messages = [];
    const now = Date.now();
    
    // 单人模式
    if (participants.length === 1) {
      const p = participants[0];
      messages.push({
        id: 'msg_' + now + '_1',
        userId: p.id,
        userName: p.name,
        avatarName: p.name + '的AI分身',
        content: '大家好！我是' + p.name + '的AI分身。今天一个人也要好好吃饭！让我来推荐适合你的餐厅~',
        type: 'question',
        timestamp: now
      });
      
      messages.push({
        id: 'msg_' + now + '_2',
        userId: p.id,
        userName: p.name,
        avatarName: p.name + '的AI分身',
        content: '分析你的口味偏好：喜欢' + (p.taste?.cuisine || '中餐') + '，口味' + (p.taste?.spicy > 0.5 ? '偏辣' : '清淡') + '。',
        type: 'suggestion',
        timestamp: now + 1000
      });
      
      messages.push({
        id: 'msg_' + now + '_3',
        userId: p.id,
        userName: p.name,
        avatarName: p.name + '的AI分身',
        content: '综合考虑，我为你推荐一家超棒的餐厅！点击下方查看详情~',
        type: 'final',
        timestamp: now + 2000
      });
    } else {
      // 多人模式
      participants.forEach((p, index) => {
        messages.push({
          id: 'msg_' + now + '_' + index,
          userId: p.id,
          userName: p.name,
          avatarName: p.name + '的AI分身',
          content: '我是' + p.name + '的AI分身，' + p.name + '喜欢吃' + (p.taste?.cuisine || '中餐') + '。',
          type: index === participants.length - 1 ? 'final' : 'suggestion',
          timestamp: now + index * 1000
        });
      });
    }
    
    return messages;
  },

  // 获取餐厅推荐
  async getRestaurantRecommendation(cuisine) {
    // 模拟高德地图数据
    const mockRestaurants = {
      '川菜': {
        name: '蜀香园川菜馆',
        cuisine: '川菜',
        address: '朝阳区建国路88号',
        rating: '4.5',
        cost: '80',
        tel: '010-12345678',
        location: '116.481488,39.990464',
        dishes: ['宫保鸡丁', '麻婆豆腐', '水煮鱼']
      },
      '火锅': {
        name: '海底捞火锅',
        cuisine: '火锅',
        address: '西城区西单北大街110号',
        rating: '4.8',
        cost: '120',
        tel: '010-11112222',
        location: '116.375282,39.914305',
        dishes: ['鸳鸯锅底', '肥牛', '虾滑']
      },
      '粤菜': {
        name: '广州酒家',
        cuisine: '粤菜',
        address: '朝阳区三里屯路19号',
        rating: '4.6',
        cost: '150',
        tel: '010-55556666',
        location: '116.455393,39.936454',
        dishes: ['白切鸡', '烧鹅', '虾饺']
      },
      '日料': {
        name: '樱之味日本料理',
        cuisine: '日料',
        address: '朝阳区亮马桥路48号',
        rating: '4.5',
        cost: '200',
        tel: '010-77778888',
        location: '116.462312,39.949876',
        dishes: ['刺身拼盘', '寿司', '天妇罗']
      }
    };
    
    return mockRestaurants[cuisine] || mockRestaurants['川菜'];
  }
});
