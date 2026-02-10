const app = getApp();

// 头像颜色配置
const AVATAR_COLORS = [
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
];

// 消息类型标签
const TYPE_TAGS = {
  'question': { text: '提问', color: '#dbeafe' },
  'suggestion': { text: '建议', color: '#dcfce7' },
  'agreement': { text: '赞同', color: '#fef3c7' },
  'concern': { text: '顾虑', color: '#fee2e2' },
  'final': { text: '结论', color: '#ffedd5' }
};

Page({
  data: {
    roomName: 'AI 讨论群',
    participants: [],
    messages: [],
    typing: false,
    showResult: false,
    restaurant: null,
    scrollToId: '',
    mode: 'single' // single 或 group
  },

  async onLoad(options) {
    const mode = options.mode || 'single';
    this.setData({ mode });
    
    // 获取房间信息
    const inviteCode = wx.getStorageSync('inviteCode');
    if (inviteCode && inviteCode !== 'SINGLE') {
      const roomNames = {
        '123456': '今晚聚餐群',
        '888888': '好友聚餐群',
        '666666': '周末聚会群'
      };
      this.setData({ roomName: roomNames[inviteCode] || 'AI 讨论群' });
    } else {
      this.setData({ roomName: '单人推荐模式' });
    }

    // 准备参与者
    await this.prepareParticipants();
    
    // 开始对话
    this.startConversation();
  },

  // 准备参与者
  async prepareParticipants() {
    const tasteProfile = wx.getStorageSync('tasteProfile') || {
      name: '我',
      cuisine: '川菜',
      spicy: 0.5
    };

    // 单人模式：只有一个用户
    const participants = [{
      id: 'user_1',
      name: tasteProfile.name || '我',
      avatarName: (tasteProfile.name || '我') + '的AI分身',
      taste: tasteProfile,
      color: AVATAR_COLORS[0],
      isSelf: true
    }];

    // 如果是群聊模式，添加模拟的其他用户
    if (this.data.mode === 'group') {
      participants.push({
        id: 'user_2',
        name: '小明',
        avatarName: '小明的AI分身',
        taste: { cuisine: '粤菜', spicy: 0.2 },
        color: AVATAR_COLORS[1],
        isSelf: false
      });
    }

    this.setData({ participants });
  },

  // 开始对话
  async startConversation() {
    this.setData({ typing: true });

    // 生成 AI 对话
    const chatMessages = await app.generateAvatarChat(
      this.data.participants.map(p => ({
        id: p.id,
        name: p.name,
        taste: p.taste
      }))
    );

    // 逐条显示消息
    for (let i = 0; i < chatMessages.length; i++) {
      await this.delay(1500);
      
      const msg = chatMessages[i];
      const participant = this.data.participants.find(p => p.id === msg.userId);
      const tagInfo = TYPE_TAGS[msg.type] || TYPE_TAGS['suggestion'];
      
      const newMessage = {
        ...msg,
        color: participant?.color || AVATAR_COLORS[0],
        isSelf: participant?.isSelf || false,
        typeText: tagInfo.text,
        tagColor: tagInfo.color
      };

      const messages = this.data.messages;
      messages.push(newMessage);
      
      this.setData({
        messages: messages,
        scrollToId: 'msg-' + msg.id
      });
    }

    this.setData({ typing: false });

    // 获取餐厅推荐
    await this.getRecommendation();
  },

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // 获取餐厅推荐
  async getRecommendation() {
    const taste = wx.getStorageSync('tasteProfile');
    const cuisine = taste?.cuisine || '川菜';
    
    const restaurant = await app.getRestaurantRecommendation(cuisine);
    
    this.setData({
      restaurant: restaurant,
      showResult: true
    });

    // 滚动到底部
    setTimeout(() => {
      this.setData({ scrollToId: 'bottom' });
    }, 300);
  },

  // 打开地图导航
  openMap() {
    const { restaurant } = this.data;
    if (!restaurant) return;

    const [longitude, latitude] = restaurant.location.split(',').map(Number);

    wx.openLocation({
      latitude,
      longitude,
      name: restaurant.name,
      address: restaurant.address,
      scale: 15
    });
  }
});
