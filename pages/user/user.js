const authService = require('../../authModule');

Page({
  data: {
    // 用户信息
    userInfo: null,
    // 加载状态
    loading: false,
    // 是否正在编辑
    isEditing: false,
    // 临时上传的编辑信息
    tempUserInfo: {
      nickName: '',
      avatarUrl: ''
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    this.loadUserInfo();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadUserInfo();
  },

  /**
   * 加载用户信息
   */
  async loadUserInfo() {
    this.setData({ loading: true });

    try {
      const userInfo = authService.getUserInfo();
      if (userInfo) {
        this.setData({ userInfo });
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 编辑用户信息
   */
  onEditInfo() {
    const userInfo = authService.getUserInfo();
    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'error'
      });
      return;
    }

    // 进入编辑模式，使用微信官方 chooseAvatar 和 nickname input
    this.setData({
      isEditing: true,
      tempUserInfo: {
        nickName: userInfo.nickName || userInfo.nick_name || '',
        avatarUrl: userInfo.avatarUrl || userInfo.avatar || ''
      }
    });
  },

  /**
   * 取消编辑
   */
  onCancelEdit() {
    this.setData({ isEditing: false });
  },

  /**
   * 下拉头像(使用微信官方 chooseAvatar)
   * @param {Object} e - 事件对象
   */
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({ 'tempUserInfo.avatarUrl': avatarUrl });
  },

  /**
   * 处理昵称输入
   * @param {Object} e - 事件对象
   */
  onNickNameInput(e) {
    this.setData({ 'tempUserInfo.nickName': e.detail.value });
  },

  /**
   * 提交编辑表单
   * @param {Object} e - 表单事件
   */
  async onEditSubmit(e) {
    const { nickName, avatarUrl } = this.data.tempUserInfo;

    if (!nickName) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'error'
      });
      return;
    }

    if (!avatarUrl) {
      wx.showToast({
        title: '请选择头像',
        icon: 'error'
      });
      return;
    }

    await this.performUpdate();
  },

  /**
   * 执行更新操作
   */
  async performUpdate() {
    this.setData({ loading: true });

    try {
      const { nickName, avatarUrl } = this.data.tempUserInfo;

      console.log('[用户页] 开始更新', { nickName, avatarUrl });

      // 检查是否需要本地保存 + 上传
      let finalAvatarUrl = avatarUrl;
      let localAvatarPath = null;
      
      if (avatarUrl.startsWith('file://')) {
        console.log('[用户页] 检测到本地文件，开始保存');
        const saveResult = await authService.saveAvatarLocally(avatarUrl);
        
        console.log('[用户页] 本地保存结果:', saveResult);
        
        if (saveResult.success) {
          localAvatarPath = saveResult.avatarPath;
          console.log('[用户页] 本地保存成功:', localAvatarPath);
          
          // 开始上传到后台
          console.log('[用户页] 开始上传头像');
          const uploadResult = await authService.uploadAvatar(localAvatarPath);
          
          console.log('[用户页] 上传结果:', uploadResult);
          
          if (uploadResult.success) {
            finalAvatarUrl = uploadResult.avatarUrl;
            console.log('[用户页] 上传成功:', finalAvatarUrl);
          } else {
            // 上传失败，使用本地路径
            console.warn('[用户页] 上传失败，使用本地路径:', localAvatarPath);
            finalAvatarUrl = localAvatarPath;
          }
        } else {
          console.warn('[用户页] 本地保存失败，使用原始路径:', avatarUrl);
        }
      }

      // 调用更新 API
      console.log('[用户页] 调用 updateUser', { nickName, avatarUrl: finalAvatarUrl });
      const updateResult = await authService.updateUser(nickName, finalAvatarUrl);

      if (updateResult.success) {
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
        
        // 稍估后退出编辑模式并刚新加载用户信息
        setTimeout(() => {
          this.setData({ isEditing: false });
          this.loadUserInfo();
        }, 500);
      } else {
        wx.showToast({
          title: updateResult.error || '更新失败',
          icon: 'error'
        });
      }
    } catch (error) {
      console.error('更新用户信息错误:', error);
      wx.showToast({
        title: error.message || '更新失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 退出登录
   */
  async onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除登录状态
          authService.logout();
          
          // 跳转到登录页
          wx.redirectTo({
            url: '/pages/login/login'
          });
        }
      }
    });
  }
});
