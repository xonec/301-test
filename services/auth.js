/**
 * 认证服务模块
 * 功能：处理用户登录、注册、token管理和自动登录逻辑
 * 特性：
 *   1. 支持微信授权登录
 *   2. 支持用户注册
 *   3. 自动登录和token刷新机制
 *   4. 本地存储管理
 */

const { API_BASE_URL, ENDPOINTS } = require('../utils/apiConfig');
const TOKEN_KEY = 'USER_TOKEN';
const USER_INFO_KEY = 'USER_INFO';
const TOKEN_EXPIRE_KEY = 'TOKEN_EXPIRE_TIME';
const REFRESH_TOKEN_KEY = 'REFRESH_TOKEN';

/**
 * 检查本地token是否有效
 * @returns {boolean} 是否存在有效token
 */
function hasValidToken() {
  try {
    const token = wx.getStorageSync(TOKEN_KEY);
    const expireTime = wx.getStorageSync(TOKEN_EXPIRE_KEY);
    
    if (!token) return false;
    
    // 检查token是否过期（提前5分钟刷新）
    if (expireTime && Date.now() > expireTime - 5 * 60 * 1000) {
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('检查token失败:', e);
    return false;
  }
}

/**
 * 获取存储的用户信息
 * @returns {Object|null} 用户信息对象或null
 */
function getUserInfo() {
  try {
    const userInfo = wx.getStorageSync(USER_INFO_KEY);
    return userInfo || null;
  } catch (e) {
    console.error('获取用户信息失败:', e);
    return null;
  }
}

/**
 * 获取存储的token
 * @returns {string|null} token或null
 */
function getToken() {
  try {
    return wx.getStorageSync(TOKEN_KEY) || null;
  } catch (e) {
    console.error('获取token失败:', e);
    return null;
  }
}

/**
 * 微信授权登录
 * @returns {Promise<Object>} 登录结果 {token, userInfo, success}
 */
async function wechatLogin() {
  return new Promise((resolve) => {
    // 第一步：调用微信登录接口获取code
    wx.login({
      success: async (loginRes) => {
        if (!loginRes.code) {
          resolve({
            success: false,
            error: '获取登录凭证失败'
          });
          return;
        }

        try {
          // 第二步：向后台发送code进行服务端验证
          const loginResponse = await request(ENDPOINTS.LOGIN, {
            method: 'POST',
            data: {
              code: loginRes.code
            }
          });

          if (loginResponse.code === 0 && loginResponse.data.token) {
            // 保存token和过期时间
            const token = loginResponse.data.token;
            const expireTime = Date.now() + (loginResponse.data.expires_in || 7200) * 1000;
            
            wx.setStorageSync(TOKEN_KEY, token);
            wx.setStorageSync(TOKEN_EXPIRE_KEY, expireTime);
            
            // 如果返回了刷新token，也保存
            if (loginResponse.data.refresh_token) {
              wx.setStorageSync(REFRESH_TOKEN_KEY, loginResponse.data.refresh_token);
            }

            resolve({
              success: true,
              token: token
            });
          } else {
            resolve({
              success: false,
              error: loginResponse.msg || '登录失败'
            });
          }
        } catch (error) {
          resolve({
            success: false,
            error: error.message
          });
        }
      },
      fail: () => {
        resolve({
          success: false,
          error: '获取登录凭证失败'
        });
      }
    });
  });
}

/**
 * 获取用户资料（需要用户授权）
 * @returns {Promise<Object>} 用户资料 {nickName, avatarUrl, gender}
 */
/**
 * 用户注册
 * @param {string} nickName - 昵称
 * @param {string} avatarUrl - 头像URL
 * @returns {Promise<Object>} 注册结果
 */
async function register(nickName, avatarUrl) {
  try {
    // 第一步：微信登录获取code
    const loginResult = await wechatLogin();
    if (!loginResult.success) {
      return {
        success: false,
        error: loginResult.error
      };
    }

    // 第二步：向后台提交用户信息
    const registerResponse = await request(ENDPOINTS.REGISTER, {
      method: 'POST',
      data: {
        nick_name: nickName,
        avatar: avatarUrl
      }
    });

    if (registerResponse.code === 0) {
      // 保存用户信息
      wx.setStorageSync(USER_INFO_KEY, {
        nickName,
        avatarUrl,
        userId: registerResponse.data.user_id
      });

      return {
        success: true,
        data: registerResponse.data
      };
    } else {
      return {
        success: false,
        error: registerResponse.msg || '注册失败'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 获取用户个人信息（从后台）
 * @returns {Promise<Object>} 用户信息
 */
async function fetchUserInfo() {
  try {
    const token = getToken();
    if (!token) {
      return {
        success: false,
        error: '未登录'
      };
    }

    const response = await request(ENDPOINTS.USER_INFO, {
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.code === 0) {
      const normalizedData = {
        ...response.data,
        avatarUrl: response.data.avatar || response.data.avatar_url || response.data.avatarUrl || response.data.url || '',
        nickName: response.data.nick_name || response.data.nickname || response.data.nickName || response.data.nick || ''
      };

      // 更新本地存储的用户信息
      wx.setStorageSync(USER_INFO_KEY, normalizedData);
      return {
        success: true,
        data: normalizedData
      };
    } else {
      return {
        success: false,
        error: response.msg
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 刷新token
 * @returns {Promise<Object>} 刷新结果
 */
async function refreshToken() {
  try {
    const refreshToken = wx.getStorageSync(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      return {
        success: false,
        error: '无刷新token'
      };
    }

    const response = await request(ENDPOINTS.REFRESH_TOKEN, {
      method: 'POST',
      data: {
        refresh_token: refreshToken
      }
    });

    if (response.code === 0 && response.data.token) {
      const newToken = response.data.token;
      const expireTime = Date.now() + (response.data.expires_in || 7200) * 1000;
      
      wx.setStorageSync(TOKEN_KEY, newToken);
      wx.setStorageSync(TOKEN_EXPIRE_KEY, expireTime);

      return {
        success: true,
        token: newToken
      };
    } else {
      // 刷新失败，清除登录态
      clearLoginState();
      return {
        success: false,
        error: 'token刷新失败，请重新登录'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 用户退出登录
 */
function logout() {
  try {
    wx.removeStorageSync(TOKEN_KEY);
    wx.removeStorageSync(USER_INFO_KEY);
    wx.removeStorageSync(TOKEN_EXPIRE_KEY);
    wx.removeStorageSync(REFRESH_TOKEN_KEY);
  } catch (e) {
    console.error('退出登录失败:', e);
  }
}

/**
 * 清除登录状态（通常在token过期或刷新失败时调用）
 */
function clearLoginState() {
  logout();
}

/**
 * 通用HTTP请求方法
 * @param {string} url - API路径
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>} 响应数据
 */
function request(url, options = {}) {
  const fullUrl = API_BASE_URL + url;
  const defaultHeaders = {
    'Content-Type': 'application/json'
  };

  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method: options.method || 'GET',
      data: options.data,
      header: {
        ...defaultHeaders,
        ...(options.header || {})
      },
      success: (res) => {
        resolve(res.data);
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '请求失败'));
      }
    });
  });
}

/**
 * 自动登录机制
 * 在应用启动时检查是否需要自动登录
 * @returns {Promise<Object>} 自动登录结果
 */
async function autoLogin() {
  // 检查本地是否有有效token
  if (hasValidToken()) {
    // 刷新用户信息
    const userResult = await fetchUserInfo();
    return {
      success: true,
      loggedIn: true,
      skipLogin: true,
      userInfo: userResult.data
    };
  }

  // 没有有效token，尝试使用微信登录
  const loginResult = await wechatLogin();
  if (loginResult.success) {
    const userResult = await fetchUserInfo();
    return {
      success: true,
      loggedIn: true,
      skipLogin: true,
      userInfo: userResult.data
    };
  }

  // 自动登录失败，需要用户手动登录
  return {
    success: false,
    loggedIn: false,
    skipLogin: false,
    error: loginResult.error
  };
}

module.exports = {
  hasValidToken,
  getUserInfo,
  getToken,
  wechatLogin,
  register,
  fetchUserInfo,
  refreshToken,
  logout,
  autoLogin
};
