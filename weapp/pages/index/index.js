const app = getApp();

Page({
  data: {
    userInfo: null
  },

  onLoad() {
    // 检查是否已有邀请码
    const inviteCode = wx.getStorageSync('inviteCode');
    if (inviteCode) {
      // 自动跳转到房间页
      wx.switchTab({
        url: '/pages/room/room'
      });
    }
  },

  // 进入群聊房间
  goToRoom() {
    wx.switchTab({
      url: '/pages/room/room'
    });
  },

  // 快速开始（单人模式）
  quickStart() {
    // 保存单人模式标记
    wx.setStorageSync('singleMode', true);
    wx.setStorageSync('inviteCode', 'SINGLE');
    
    wx.navigateTo({
      url: '/pages/chat/chat?mode=single'
    });
  },

  // 填充测试邀请码
  fillCode(e) {
    const code = e.currentTarget.dataset.code;
    wx.setStorageSync('inviteCode', code);
    
    wx.showToast({
      title: '已填充',
      icon: 'success'
    });
    
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/room/room'
      });
    }, 500);
  }
});
