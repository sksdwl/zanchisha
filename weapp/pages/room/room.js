const app = getApp();

Page({
  data: {
    verified: false,
    inputCode: '',
    errorMsg: '',
    loading: false,
    roomInfo: null,
    userName: '',
    cuisines: [
      { name: '川菜', selected: true },
      { name: '粤菜', selected: false },
      { name: '湘菜', selected: false },
      { name: '日料', selected: false },
      { name: '火锅', selected: true },
      { name: '烧烤', selected: false },
    ],
    taste: {
      spicy: 50
    }
  },

  onLoad() {
    // 检查是否已验证
    const inviteCode = wx.getStorageSync('inviteCode');
    if (inviteCode && inviteCode !== 'SINGLE') {
      this.setData({
        verified: true,
        roomInfo: {
          code: inviteCode,
          roomName: this.getRoomName(inviteCode)
        }
      });
    }
    
    // 获取用户信息
    const userName = wx.getStorageSync('userName') || '';
    if (userName) {
      this.setData({ userName });
    }
  },

  onShow() {
    // 每次显示页面检查状态
    const inviteCode = wx.getStorageSync('inviteCode');
    this.setData({
      verified: !!(inviteCode && inviteCode !== 'SINGLE')
    });
  },

  // 获取房间名称
  getRoomName(code) {
    const names = {
      '123456': '今晚聚餐群',
      '888888': '好友聚餐群',
      '666666': '周末聚会群'
    };
    return names[code] || 'AI 讨论群';
  },

  // 输入邀请码
  onInput(e) {
    this.setData({
      inputCode: e.detail.value,
      errorMsg: ''
    });
  },

  // 验证邀请码
  async verifyCode() {
    const { inputCode } = this.data;
    
    if (inputCode.length !== 6) {
      this.setData({ errorMsg: '请输入6位邀请码' });
      return;
    }

    this.setData({ loading: true });

    // 调用验证
    const result = await app.validateInviteCode(inputCode);
    
    this.setData({ loading: false });

    if (result.valid) {
      wx.setStorageSync('inviteCode', inputCode);
      this.setData({
        verified: true,
        roomInfo: result
      });
    } else {
      this.setData({ errorMsg: '邀请码无效或已过期' });
    }
  },

  // 使用测试邀请码
  useTestCode(e) {
    const code = e.currentTarget.dataset.code;
    this.setData({ inputCode: code });
    this.verifyCode();
  },

  // 重置邀请码
  resetCode() {
    wx.removeStorageSync('inviteCode');
    this.setData({
      verified: false,
      inputCode: '',
      roomInfo: null
    });
  },

  // 输入昵称
  onNameInput(e) {
    this.setData({ userName: e.detail.value });
    wx.setStorageSync('userName', e.detail.value);
  },

  // 选择菜系
  selectCuisine(e) {
    const { index } = e.currentTarget.dataset;
    const cuisines = this.data.cuisines;
    cuisines[index].selected = !cuisines[index].selected;
    this.setData({ cuisines });
  },

  // 调整辣度
  onSpicyChange(e) {
    this.setData({
      'taste.spicy': e.detail.value
    });
  },

  // 开始聊天
  startChat() {
    const { userName, cuisines, taste } = this.data;
    
    if (!userName.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }

    // 保存用户口味信息
    const selectedCuisines = cuisines.filter(c => c.selected).map(c => c.name);
    const tasteProfile = {
      name: userName,
      cuisine: selectedCuisines[0] || '中餐',
      spicy: taste.spicy / 100
    };
    
    wx.setStorageSync('tasteProfile', tasteProfile);

    // 跳转到聊天页
    wx.navigateTo({
      url: '/pages/chat/chat?mode=group'
    });
  }
});
