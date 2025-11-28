/**
 * HTTP 请求拦截器
 * 功能：
 *   1. 自动为请求添加authorization header
 *   2. 处理token过期的情况
 *   3. 统一错误处理
 */

const authService = require('./auth');

const API_BASE_URL = 'http://10.0.0.108';

/**
 * 发送HTTP请求（带token自动添加）
 * @param {string} url - API路径（不包含基础URL）
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>} 响应数据
 */
async function request(url, options = {}) {
  const token = authService.getToken();
  const defaultHeaders = {
    'Content-Type': 'application/json'
  };

  // 如果存在token，添加到请求头
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        ...defaultHeaders,
        ...(options.header || {})
      },
      success: async (res) => {
        // 检查token是否过期（401响应）
        if (res.statusCode === 401) {
          // 尝试刷新token
          const refreshResult = await authService.refreshToken();
          if (refreshResult.success) {
            // token刷新成功，重试原请求
            return request(url, options)
              .then(resolve)
              .catch(reject);
          } else {
            // token刷新失败，跳转到登录页
            wx.navigateTo({
              url: '/pages/login/login'
            });
            reject(new Error('登录已过期，请重新登录'));
            return;
          }
        }

        // 检查响应数据中的业务错误
        if (res.data && res.data.code !== 0) {
          reject(new Error(res.data.msg || '请求失败'));
          return;
        }

        resolve(res.data);
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'));
      }
    });
  });
}

/**
 * 发送GET请求
 * @param {string} url - API路径
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>}
 */
function get(url, options = {}) {
  return request(url, { ...options, method: 'GET' });
}

/**
 * 发送POST请求
 * @param {string} url - API路径
 * @param {Object} data - 请求数据
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>}
 */
function post(url, data, options = {}) {
  return request(url, { ...options, method: 'POST', data });
}

/**
 * 发送PUT请求
 * @param {string} url - API路径
 * @param {Object} data - 请求数据
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>}
 */
function put(url, data, options = {}) {
  return request(url, { ...options, method: 'PUT', data });
}

/**
 * 发送DELETE请求
 * @param {string} url - API路径
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>}
 */
function del(url, options = {}) {
  return request(url, { ...options, method: 'DELETE' });
}

/**
 * 上传文件
 * @param {string} url - API路径
 * @param {string} filePath - 文件路径
 * @param {string} name - 文件字段名
 * @param {Object} formData - 其他表单数据
 * @returns {Promise<Object>}
 */
async function upload(url, filePath, name = 'file', formData = {}) {
  const token = authService.getToken();
  const header = {
    'Content-Type': 'multipart/form-data'
  };

  if (token) {
    header['Authorization'] = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${API_BASE_URL}${url}`,
      filePath: filePath,
      name: name,
      formData: formData,
      header: header,
      success: (res) => {
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(res.data);
            if (data.code === 0) {
              resolve(data);
            } else {
              reject(new Error(data.msg || '上传失败'));
            }
          } catch (e) {
            reject(new Error('上传失败'));
          }
        } else {
          reject(new Error(`上传失败: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '上传失败'));
      }
    });
  });
}

module.exports = {
  request,
  get,
  post,
  put,
  del,
  upload
};
