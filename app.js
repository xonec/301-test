const gulpError = require('./utils/gulpError');
const authService = require('./authModule');

/**
 * 小程序应用入口
 * 功能：初始化应用，处理编译错误，实现自动登录机制
 * 路由：
 *   - login - 登录注册页面
 *   - 外包统计工具：pages/statistics-outer
 *   - 内包统计工具：pages/statistics-inner  
 *   - 标准差计算工具：pages/statistics-std
 */
App({
    /**
     * 应用启动时触发
     * 功能：
     *   1. 检查构建时是否有错误
     *   2. 检查登录状态，实现自动登录
     *   3. 初始化全局变量
     */
    async onShow() {
        // 检查编译错误
        if (gulpError !== 'gulpErrorPlaceHolder') {
            wx.redirectTo({
                url: `/pages/gulp-error/index?gulpError=${gulpError}`,
            });
            return;
        }

        // 实现自动登录机制
        await this.checkLoginState();
    },

    /**
     * 检查登录状态
     * 逻辑：
     *   1. 检查本地是否有有效token
     *   2. 如果有效，直接进入主界面
     *   3. 如果无效或不存在，尝试自动登录
     *   4. 如果自动登录失败，跳转到登录页
     */
    async checkLoginState() {
        try {
            // 检查是否已经有有效的token
            if (authService.hasValidToken()) {
                // Token有效，获取最新用户信息
                const userResult = await authService.fetchUserInfo();
                if (userResult.success) {
                    // 保存到全局变量，供其他页面使用
                    this.globalData.userInfo = userResult.data;
                    this.globalData.isLoggedIn = true;
                    return;
                }
            }

            // 尝试自动登录
            const autoLoginResult = await authService.autoLogin();
            
            if (autoLoginResult.success && autoLoginResult.loggedIn) {
                // 自动登录成功
                this.globalData.userInfo = autoLoginResult.userInfo;
                this.globalData.isLoggedIn = true;
            } else {
                // 自动登录失败，需要手动登录
                this.globalData.isLoggedIn = false;
                this.redirectToLogin();
            }
        } catch (error) {
            console.error('检查登录状态失败:', error);
            this.globalData.isLoggedIn = false;
            this.redirectToLogin();
        }
    },

    /**
     * 跳转到登录页面
     */
    redirectToLogin() {
        // 延迟跳转，确保应用完全加载
        setTimeout(() => {
            wx.redirectTo({
                url: '/pages/login/login',
                fail: () => {
                    // 如果重定向失败，使用switchTab
                    wx.navigateTo({
                        url: '/pages/login/login'
                    });
                }
            });
        }, 500);
    },

    /**
     * 全局数据
     */
    globalData: {
        // 用户信息
        userInfo: null,
        // 是否已登录
        isLoggedIn: false,
        // API基础URL
        apiBaseUrl: 'http://10.0.0.108'
    }
});
