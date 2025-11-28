// 全局 API 配置，便于在不同模块中复用后端地址和接口路径
// 后端地址来源：用户提供的隧道域名 https://50ea4c0.r32.cpolar.top
// 接口文档： https://s98gde0zcd.apifox.cn/

const API_BASE_URL = 'https://50ea4c0.r32.cpolar.top';

const ENDPOINTS = {
  // 认证相关
  LOGIN: '/api/login/mnpLogin',
  REGISTER: '/api/login/mnpLogin',
  REFRESH_TOKEN: '/api/login/refresh',

  // 用户信息
  USER_INFO: '/api/user/getUserInfo',
  UPDATE_USER: '/api/user/setInfo',

  // 上传
  UPLOAD_IMAGE: '/api/upload/image'
};

module.exports = {
  API_BASE_URL,
  ENDPOINTS
};
