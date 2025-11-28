/**
 * 认证服务模块 - 全局认证模块
 * 功能：处理用户登录、注册、token管理和自动登录逻辑
 * 
 * 配置说明：
 * - 默认后台地址: http://10.0.0.108
 * - 可通过修改 API_BASE_URL 来切换后台服务
 * - 支持 Mock 模式用于开发测试
 */

const { API_BASE_URL, ENDPOINTS } = require('./utils/apiConfig');

// 配置项
const CONFIG = {
  // 后端 API 地址来自用户提供的隧道域名
  API_BASE_URL,

  // 是否启用 Mock 模式（用于开发测试，无需后台）
  USE_MOCK: false,

  // 接口端点配置（根据 LikeAdmin MCP 服务器定义）
  ENDPOINTS: {
    ...ENDPOINTS
  }
};

const TOKEN_KEY = 'USER_TOKEN';
const USER_INFO_KEY = 'USER_INFO';
const TOKEN_EXPIRE_KEY = 'TOKEN_EXPIRE_TIME';
const REFRESH_TOKEN_KEY = 'REFRESH_TOKEN';

// Mock 数据生成
function generateMockToken() {
  return 'mock_token_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

function generateMockUserId() {
  return 'user_' + Math.random().toString(36).substr(2, 6);
}

// Mock 登录响应
function getMockLoginResponse(code) {
  return Promise.resolve({
    code: 0,
    msg: '登录成功',
    data: {
      token: generateMockToken(),
      refresh_token: 'mock_refresh_' + Date.now(),
      expires_in: 7200,
      user_id: generateMockUserId()
    }
  });
}

// Mock 用户信息响应
function getMockUserInfoResponse() {
  return Promise.resolve({
    code: 0,
    msg: '获取成功',
    data: {
      user_id: generateMockUserId(),
      nick_name: 'Mock User',
      avatar: 'https://via.placeholder.com/64',
      phone: '',
      email: '',
      created_at: new Date().toISOString()
    }
  });
}

// 检查本地token是否有效
function hasValidToken() {
  try {
    const token = wx.getStorageSync(TOKEN_KEY);
    const expireTime = wx.getStorageSync(TOKEN_EXPIRE_KEY);
    
    if (!token) return false;
    
    if (expireTime && Date.now() > expireTime - 5 * 60 * 1000) {
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('检查token失败:', e);
    return false;
  }
}

// 获取存储的用户信息
function getUserInfo() {
  try {
    const userInfo = wx.getStorageSync(USER_INFO_KEY);
    return userInfo || null;
  } catch (e) {
    console.error('获取用户信息失败:', e);
    return null;
  }
}

// 获取存储的token
function getToken() {
  try {
    return wx.getStorageSync(TOKEN_KEY) || null;
  } catch (e) {
    console.error('获取token失败:', e);
    return null;
  }
}

// 微信授权登录
async function wechatLogin() {
  return new Promise((resolve) => {
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
          // 如果启用 Mock 模式，直接返回 Mock 数据
          if (CONFIG.USE_MOCK) {
            const mockResponse = await getMockLoginResponse(loginRes.code);
            if (mockResponse.code === 0 && mockResponse.data.token) {
              const token = mockResponse.data.token;
              const expireTime = Date.now() + (mockResponse.data.expires_in || 7200) * 1000;
              
              wx.setStorageSync(TOKEN_KEY, token);
              wx.setStorageSync(TOKEN_EXPIRE_KEY, expireTime);
              
              if (mockResponse.data.refresh_token) {
                wx.setStorageSync(REFRESH_TOKEN_KEY, mockResponse.data.refresh_token);
              }

              resolve({
                success: true,
                token: token
              });
            }
            return;
          }

          const loginResponse = await request(CONFIG.ENDPOINTS.LOGIN, {
            method: 'POST',
            data: {
              code: loginRes.code
            },
            contentType: 'application/x-www-form-urlencoded'  // LikeAdmin 小程序登录接口使用 form 格式
          });

          if ((loginResponse.code === 0 || (loginResponse.code === 1 && loginResponse.data && loginResponse.data.token)) && loginResponse.data && loginResponse.data.token) {
            const token = loginResponse.data.token;
            const expireTime = Date.now() + (loginResponse.data.expires_in || 7200) * 1000;
            
            console.log('登录成功', {
              token: token,
              expireTime: new Date(expireTime).toISOString(),
              response: loginResponse
            });
            
            wx.setStorageSync(TOKEN_KEY, token);
            wx.setStorageSync(TOKEN_EXPIRE_KEY, expireTime);
            
            if (loginResponse.data.refresh_token) {
              wx.setStorageSync(REFRESH_TOKEN_KEY, loginResponse.data.refresh_token);
            }

            resolve({
              success: true,
              token: token
            });
          } else {
            console.log('\n========== 微信登录响应错误 =========');
            console.log('完整响应内容:', JSON.stringify(loginResponse, null, 2));
            console.log('code:', loginResponse.code);
            console.log('msg:', loginResponse.msg);
            console.log('data:', loginResponse.data);
            console.log('有 token 吗:', loginResponse.data && !!loginResponse.data.token);
            console.log('========== 结束 =========\n');
            resolve({
              success: false,
              error: loginResponse.msg || '登录失败'
            });
          }
        } catch (error) {
          console.error('\n========== 微信登录异常 =========');
          console.error('完整错误:', error);
          console.error('错误信息:', error.message);
          console.error('========== 结束 =========\n');
          
          let errorMsg = error.message;
          if (error.message && error.message.includes('404')) {
            errorMsg = '后台服务地址错误或接口不存在 (' + CONFIG.API_BASE_URL + ')';
          } else if (error.message && error.message.includes('ERR_BLOCKED_BY_CLIENT')) {
            errorMsg = '网络请求被阻止，请检查域名配置';
          }
          
          resolve({
            success: false,
            error: errorMsg,
            details: error.message
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

// 用户注册
async function register(nickName, avatarUrl) {
  try {
    const loginResult = await wechatLogin();
    if (!loginResult.success) {
      return {
        success: false,
        error: loginResult.error
      };
    }

    // 如果启用 Mock 模式
    if (CONFIG.USE_MOCK) {
      wx.setStorageSync(USER_INFO_KEY, {
        nickName,
        avatarUrl,
        userId: generateMockUserId()
      });

      return {
        success: true,
        data: {
          nick_name: nickName,
          avatar: avatarUrl,
          user_id: generateMockUserId()
        }
      };
    }

    const registerResponse = await request(CONFIG.ENDPOINTS.REGISTER, {
      method: 'POST',
      data: {
        nick_name: nickName,
        avatar: avatarUrl
      }
    });

    if (registerResponse.code === 0) {
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

// 获取用户个人信息（从后台）
async function fetchUserInfo() {
  try {
    const token = getToken();
    if (!token) {
      return {
        success: false,
        error: '未登录'
      };
    }

    // 如果启用 Mock 模式
    if (CONFIG.USE_MOCK) {
      const mockResponse = await getMockUserInfoResponse();
      if (mockResponse.code === 0) {
        wx.setStorageSync(USER_INFO_KEY, mockResponse.data);
        return {
          success: true,
          data: mockResponse.data
        };
      } else {
        return {
          success: false,
          error: mockResponse.msg
        };
      }
    }

    // 后台可能需要在 URL 参数中包含 token
    const endpointUrl = CONFIG.ENDPOINTS.USER_INFO + '?token=' + token;
    
    const response = await request(endpointUrl, {
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`,
        // 兼容部分接口使用 token 字段的写法
        'token': token
      }
    });

    if (response.code === 0) {
      const normalizedData = {
        ...response.data,
        avatarUrl: response.data.avatar || response.data.avatar_url || response.data.avatarUrl || response.data.url || '',
        nickName: response.data.nick_name || response.data.nickname || response.data.nickName || response.data.nick || ''
      };

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

// 刷新token
async function refreshToken() {
  try {
    const refreshToken = wx.getStorageSync(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      return {
        success: false,
        error: '无刷新token'
      };
    }

    // 如果启用 Mock 模式
    if (CONFIG.USE_MOCK) {
      const newToken = generateMockToken();
      const expireTime = Date.now() + 7200 * 1000;
      
      wx.setStorageSync(TOKEN_KEY, newToken);
      wx.setStorageSync(TOKEN_EXPIRE_KEY, expireTime);

      return {
        success: true,
        token: newToken
      };
    }

    const response = await request(CONFIG.ENDPOINTS.REFRESH_TOKEN, {
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

// 用户退出登录
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

// 清除登录状态
function clearLoginState() {
  logout();
}

// 通用HTTP请求方法
function request(url, options = {}) {
  const fullUrl = CONFIG.API_BASE_URL + url;
  
  // 根据 contentType 选择 Content-Type header
  const contentType = options.contentType || 'application/json';
  const defaultHeaders = {
    'Content-Type': contentType
  };

  // 如果是 form-urlencoded 格式，需要手动编码数据
  let requestData = options.data;
  if (contentType === 'application/x-www-form-urlencoded' && typeof requestData === 'object') {
    // 将对象转换为 URL 编码的字符串
    const pairs = [];
    for (const key in requestData) {
      if (requestData.hasOwnProperty(key)) {
        pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(requestData[key]));
      }
    }
    requestData = pairs.join('&');
  } else if (contentType === 'multipart/form-data') {
    // 微信小程序的 multipart/form-data 不需要手动设置 Content-Type
    // 它会自动处理，我们需要删除默认的 Content-Type header
    delete defaultHeaders['Content-Type'];
  }

  const headerConfig = {
    ...defaultHeaders,
    ...(options.header || {})
  };
  
  console.log('[request] 准备发送请求', {
    url: fullUrl,
    method: options.method || 'GET',
    contentType: contentType,
    headers: headerConfig,
    data: requestData || options.data
  });

  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method: options.method || 'GET',
      data: requestData,
      header: headerConfig,
      success: (res) => {
        console.log('[request] 响应成功', {
          url: fullUrl,
          statusCode: res.statusCode,
          data: res.data
        });
        
        // 检查特殊情况：HTTP 200 但响应不是 JSON
        if (typeof res.data === 'string') {
          console.warn('[request] 响应是字符串', res.data.substring(0, 200));
        }
        
        resolve(res.data);
      },
      fail: (err) => {
        const errorMessage = err.errMsg || '请求失败';
        console.error('[request] 请求失败:', {
          url: fullUrl,
          error: errorMessage,
          statusCode: err.statusCode,
          fullError: err
        });
        reject(new Error(errorMessage));
      }
    });
  });
}

// 本地头像存储 key
const LOCAL_AVATAR_KEY = 'LOCAL_AVATAR_PATH';

// 复制头像到本地缓存
async function saveAvatarLocally(avatarFilePath) {
  try {
    // 生成目标路径
    const timestamp = Date.now();
    const targetPath = `${wx.env.USER_DATA_PATH}/avatar_${timestamp}.png`;

    console.log('[saveAvatarLocally] 开始保存头像', {
      source: avatarFilePath,
      target: targetPath
    });

    return new Promise((resolve) => {
      const fs = wx.getFileSystemManager();

      // 直接使用 saveFile 复制文件，避免二进制读写造成的图片损坏
      fs.saveFile({
        tempFilePath: avatarFilePath,
        filePath: targetPath,
        success: ({ savedFilePath }) => {
          const finalPath = savedFilePath || targetPath;
          console.log('[saveAvatarLocally] 保存成功', { targetPath: finalPath });
          wx.setStorageSync(LOCAL_AVATAR_KEY, finalPath);
          resolve({
            success: true,
            avatarPath: finalPath
          });
        },
        fail: (err) => {
          console.error('[saveAvatarLocally] 保存失败', err);
          resolve({
            success: false,
            error: err.errMsg || '保存失败'
          });
        }
      });
    });
  } catch (error) {
    console.error('[saveAvatarLocally] 异常:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 获取本地保存的头像路径
function getLocalAvatarPath() {
  try {
    return wx.getStorageSync(LOCAL_AVATAR_KEY) || null;
  } catch (e) {
    console.error('获取本地头像路径失败:', e);
    return null;
  }
}

// 删除本地头像
function removeLocalAvatar() {
  try {
    const avatarPath = getLocalAvatarPath();
    if (avatarPath) {
      const fs = wx.getFileSystemManager();
      fs.unlink({
        filePath: avatarPath,
        success: () => {
          console.log('[removeLocalAvatar] 删除成功');
          wx.removeStorageSync(LOCAL_AVATAR_KEY);
        },
        fail: (err) => {
          console.warn('[removeLocalAvatar] 删除失败', err);
        }
      });
    }
  } catch (e) {
    console.error('删除本地头像失败:', e);
  }
}

// 上传头像文件
async function uploadAvatar(avatarFilePath) {
  try {
    const token = getToken();
    if (!token) {
      return {
        success: false,
        error: '未登录'
      };
    }

    console.log('[uploadAvatar] 开始上传头像', { filePath: avatarFilePath });

    return new Promise((resolve) => {
      wx.uploadFile({
        url: CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.UPLOAD_IMAGE,
        filePath: avatarFilePath,
        name: 'file',  // 改为 file（API 要求的参数名）
        header: {
          'token': token  // 改为使用 token 字段而不是 Authorization
        },
        success: (res) => {
          console.log('[uploadAvatar] 上传成功', {
            statusCode: res.statusCode,
            response: res.data
          });

          try {
            const responseData = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
            console.log('[uploadAvatar] 响应数据:', responseData);
            // 兼容 code: 0 和 code: 1 的情况
            if ((responseData.code === 0 || responseData.code === 1) && responseData.data) {
              resolve({
                success: true,
                avatarUrl: responseData.data.url || responseData.data.avatar
              });
            } else {
              resolve({
                success: false,
                error: responseData.msg || '上传失败'
              });
            }
          } catch (e) {
            console.error('[uploadAvatar] 响应解析失败:', e);
            resolve({
              success: false,
              error: '响应格式错误'
            });
          }
        },
        fail: (err) => {
          console.error('[uploadAvatar] 上传失败:', err);
          resolve({
            success: false,
            error: err.errMsg || '上传失败'
          });
        }
      });
    });
  } catch (error) {
    console.error('[uploadAvatar] 异常:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 更新用户信息（昵称、头像）
async function updateUser(nickname, avatarUrl) {
  try {
    const token = getToken();
    if (!token) {
      return {
        success: false,
        error: '未登录'
      };
    }

    // 如果启用 Mock 模式
    if (CONFIG.USE_MOCK) {
      const updatedInfo = {
        nickname: nickname,
        avatar: avatarUrl,
        user_id: getUserInfo()?.user_id || generateMockUserId()
      };
      wx.setStorageSync(USER_INFO_KEY, updatedInfo);
      return {
        success: true,
        data: updatedInfo
      };
    }

    // 使用 multipart/form-data 格式发送请求
    console.log('准备更新用户信息:', {
      url: CONFIG.ENDPOINTS.UPDATE_USER,
      nickname: nickname,
      avatar: avatarUrl,
      token: token ? '已设置' : '未设置'
    });
    console.log('\n========== updateUser 调试信息 =========');
    console.log('Token:', token ? token.substring(0, 20) + '...' : '不存在');
    console.log('使用新接口 /api/user/setInfo');
    
    // 使用新接口 /api/user/setInfo
    // 需要分别为 nickname 和 avatar 发送两个请求
    
    // 第一个请求：设置昵称
    const nicknameResponse = await new Promise((resolve) => {
      wx.request({
        url: CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.UPDATE_USER,
        method: 'POST',
        data: {
          field: 'nickname',
          value: nickname
        },
        header: {
          'token': token,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        success: (res) => {
          console.log('[updateUser] 设置昵称响应:', {
            statusCode: res.statusCode,
            data: res.data
          });
          resolve(res.data);
        },
        fail: (err) => {
          console.error('[updateUser] 设置昵称失败:', err);
          resolve({
            code: -1,
            msg: err.errMsg || '请求失败',
            data: null
          });
        }
      });
    });
    
    if (!nicknameResponse || (nicknameResponse.code !== 0 && nicknameResponse.code !== 1)) {
      console.log('设置昵称失败:', nicknameResponse);
      return {
        success: false,
        error: nicknameResponse?.msg || '设置昵称失败'
      };
    }
    
    // 第二个请求：设置头像
    const avatarResponse = await new Promise((resolve) => {
      wx.request({
        url: CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.UPDATE_USER,
        method: 'POST',
        data: {
          field: 'avatar',
          value: avatarUrl
        },
        header: {
          'token': token,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        success: (res) => {
          console.log('[updateUser] 设置头像响应:', {
            statusCode: res.statusCode,
            data: res.data
          });
          resolve(res.data);
        },
        fail: (err) => {
          console.error('[updateUser] 设置头像失败:', err);
          resolve({
            code: -1,
            msg: err.errMsg || '请求失败',
            data: null
          });
        }
      });
    });
    
    if (!avatarResponse || (avatarResponse.code !== 0 && avatarResponse.code !== 1)) {
      console.log('设置头像失败:', avatarResponse);
      return {
        success: false,
        error: avatarResponse?.msg || '设置头像失败'
      };
    }
    
    // 两个请求都成功，更新本地存储
    const currentInfo = getUserInfo() || {};
    const updatedInfo = {
      ...currentInfo,
      nickname: nickname,
      avatar: avatarUrl
    };
    wx.setStorageSync(USER_INFO_KEY, updatedInfo);

    console.log('更新成功', {
      updated: updatedInfo
    });

    return {
      success: true,
      data: updatedInfo
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 自动登录机制
async function autoLogin() {
  if (hasValidToken()) {
    const userResult = await fetchUserInfo();
    return {
      success: true,
      loggedIn: true,
      skipLogin: true,
      userInfo: userResult.data
    };
  }

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
  saveAvatarLocally,
  getLocalAvatarPath,
  removeLocalAvatar,
  uploadAvatar,
  fetchUserInfo,
  updateUser,
  refreshToken,
  logout,
  autoLogin
};
