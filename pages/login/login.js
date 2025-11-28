/**
 * 登录页面
 * 功能：提供用户登录和注册界面，支持微信一键登录
 */

const authService = require('../../authModule');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 当前显示的tab：login(登录) / register(注册)
    activeTab: 'login',
    // 注册表单数据
    registerForm: {
      nickName: '',
      avatarUrl: ''
    },
    // 加载状态
    loading: false,
    // 错误信息
    error: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    // 检查是否已登录，如果已登录则跳转到首页
    if (authService.hasValidToken()) {
      wx.switchTab({
        url: '/pages/statistics-outer/statistics-outer'
      });
    }
  },

  /**
   * 切换tab
   * @param {Object} e - 事件对象
   */
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab, error: '' });
  },

  /**
   * 微信一键登录
   */
  async onWechatLogin() {
    this.setData({ loading: true, error: '' });

    try {
      const result = await authService.wechatLogin();
      
      if (result.success) {
        // 获取用户信息
        const userResult = await authService.fetchUserInfo();
        
        if (userResult.success) {
          wx.showToast({
            title: '登录成功',
            icon: 'success',
            duration: 1500
          });

          setTimeout(() => {
            wx.switchTab({
              url: '/pages/statistics-outer/statistics-outer'
            });
          }, 1500);
        } else {
          this.setData({ error: userResult.error });
          wx.showToast({
            title: '获取用户信息失败',
            icon: 'error'
          });
        }
      } else {
        this.setData({ error: result.error });
        wx.showToast({
          title: result.error,
          icon: 'error'
        });
      }
    } catch (error) {
      this.setData({ error: error.message });
      wx.showToast({
        title: '登录失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 获取用户资料
   */
  async onGetUserProfile() {
    try {
      const result = await authService.getUserProfile();
      
      if (result.success) {
        this.setData({
          'registerForm.nickName': result.data.nickName,
          'registerForm.avatarUrl': result.data.avatarUrl
        });

        wx.showToast({
          title: '资料获取成功',
          icon: 'success'
        });
      } else {
        this.setData({ error: result.error });
      }
    } catch (error) {
      this.setData({ error: error.message });
    }
  },

  /**
   * 处理下拉头像
   * @param {Object} e - 事件对象
   */
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({ 'registerForm.avatarUrl': avatarUrl });
  },

  /**
   * 处理昵称输入
   * @param {Object} e - 事件对象
   */
  onNickNameInput(e) {
    this.setData({ 'registerForm.nickName': e.detail.value });
  },

  /**
   * 处理昵称失焦（安全检测）
   */
  onNickNameBlur(e) {
    // 安全检测由微信作理，不正常文本會下扣
    console.log('昵称内容:', e.detail.value);
  },

  /**
   * 表单提交(注册)
   * @param {Object} e - 表单事件
   */
  async onRegisterSubmit(e) {
    const { nickName, avatarUrl } = this.data.registerForm;

    if (!nickName) {
      this.setData({ error: '请输入昵称' });
      wx.showToast({
        title: '请输入昵称',
        icon: 'error'
      });
      return;
    }

    if (!avatarUrl) {
      this.setData({ error: '请选择头像' });
      wx.showToast({
        title: '请选择头像',
        icon: 'error'
      });
      return;
    }

    // 执行注册
    await this.performRegister();
  },

  /**
   * 执行注册操作
   */
  async performRegister() {
    this.setData({ loading: true, error: '' });

    try {
      const { nickName, avatarUrl } = this.data.registerForm;
      
      console.log('[登录页] 开始注册', { nickName, avatarUrl });

      // 先执行微信登录
      const loginResult = await authService.wechatLogin();
      
      console.log('[登录页] 微信登录结果:', loginResult);
      
      if (!loginResult.success) {
        this.setData({ error: loginResult.error });
        wx.showToast({
          title: loginResult.error,
          icon: 'error'
        });
        return;
      }

      // 检查是否需要水个文件(本地保存 + 上传)
      let finalAvatarUrl = avatarUrl;
      let localAvatarPath = null;
      
      if (avatarUrl.startsWith('file://')) {
        console.log('[登录页] 检测到本地文件，开始保存到本地缓存');
        const saveResult = await authService.saveAvatarLocally(avatarUrl);
        
        console.log('[登录页] 本地保存结果:', saveResult);
        
        if (saveResult.success) {
          localAvatarPath = saveResult.avatarPath;
          console.log('[登录页] 本地保存成功:', localAvatarPath);
          
          // 开始上传到后台
          console.log('[登录页] 开始上传头像到后台');
          const uploadResult = await authService.uploadAvatar(localAvatarPath);
          
          console.log('[登录页] 上传结果:', uploadResult);
          
          if (uploadResult.success) {
            finalAvatarUrl = uploadResult.avatarUrl;
            console.log('[登录页] 上传成功，获得服wu务器URL:', finalAvatarUrl);
          } else {
            // 上传失败，但仍然使用本地路径
            console.warn('[登录页] 上传失败，使用本地路径:', localAvatarPath);
            finalAvatarUrl = localAvatarPath;
          }
        } else {
          // 本地保存失败，使用原始路径
          console.warn('[登录页] 本地保存失败，使用原始路径:', avatarUrl);
        }
      }

      // 执行注册(更新用户信息)
      console.log('[登录页] 开始更新用户信息', { nickName, avatarUrl: finalAvatarUrl });
      const registerResult = await authService.updateUser(nickName, finalAvatarUrl);
      
      console.log('[登录页] 更新结果:', registerResult);
      
      if (registerResult.success) {
        wx.showToast({
          title: '注册成功',
          icon: 'success',
          duration: 1500
        });

        setTimeout(() => {
          wx.switchTab({
            url: '/pages/statistics-outer/statistics-outer'
          });
        }, 1500);
      } else {
        this.setData({ error: registerResult.error });
        wx.showToast({
          title: registerResult.error || '注册失败',
          icon: 'error'
        });
      }
    } catch (error) {
      console.error('注册错误:', error);
      this.setData({ error: error.message });
      wx.showToast({
        title: '注册失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 获取用户资料(已废弃，会自动获取示例)
   */
  async onGetUserProfile() {
    try {
      const result = await authService.getUserProfile();
      
      if (result.success) {
        this.setData({
          'registerForm.nickName': result.data.nickName,
          'registerForm.avatarUrl': result.data.avatarUrl
        });

        wx.showToast({
          title: '资料获取成功',
          icon: 'success'
        });
      } else {
        this.setData({ error: result.error });
      }
    } catch (error) {
      this.setData({ error: error.message });
    }
  }
});
