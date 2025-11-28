/**
 * 标准差计算工具页面
 * 功能：计算一组数据的统计特性（样本数量、平均值、标准差）
 * 功能描述：
 *   1. 支持输入一组数字数据（空格或换行分隔）
 *   2. 计算样本数量、平均值、样本标准差
 *   3. 支数据永久化存储和分享
 */
Page({
  // 控制是否支持友好信息分享
  enableShareAppMessage: true,
  // 控制是否支持动态分享
  enableShareTimeline: true,
  data: {
    // 数据输入业务，支持空格或换行分隔
    input: '',
    // 样本数量计算结果
    count: '-',
    // 平均值计算结果
    avg: '-',
    // 样本标准差计算结果
    std: '-'
  },
  // 计算死重器，用于优化频繁调用计算函数的性能
  calcTimer: null,
  /**
   * 页面加载
   * 优先级：分享数据 > 本地缓存 > 空白表单
   * @param {Object} options - 页面打开的选项参数
   */
  onLoad(options) {
    // 优先使用分享带来的数据，其次使用本地缓存
    if (options && options.data) {
      try {
        const decoded = decodeURIComponent(options.data);
        const parsed = JSON.parse(decoded);
        if (parsed && typeof parsed.input === 'string') {
          this.setData({ input: parsed.input }, () => {
            this.scheduleCalc();
          });
          return;
        }
      } catch (e) {}
    }
    try {
      const saved = wx.getStorageSync('STAT_STD_STATE');
      if (saved && typeof saved.input === 'string') {
        this.setData({ input: saved.input }, () => {
          this.scheduleCalc();
        });
      }
    } catch (e) {}
  },
  /**
   * 处理输入输入事件
   * 输入后自动保存并触发计算
   * @param {Object} e - 输入事件对象
   */
  onInput(e) {
    this.setData({ input: e.detail.value });
    try {
      wx.setStorageSync('STAT_STD_STATE', { input: this.data.input });
    } catch (e) {}
    this.scheduleCalc();
  },
  /**
   * 清空所有输入数据和缓存
   */
  onClear() {
    this.setData({ input: '', count: '-', avg: '-', std: '-' });
    try {
      wx.removeStorageSync('STAT_STD_STATE');
    } catch (e) {}
  },
  /**
   * 执行标准差计算
   * 计算公式：
   *   平均值 = 数据和 / 数据个数
   *   伐差 = sqrt(核基 之和 / (样本数-1))
   */
  onCalculate() {
    const raw = this.data.input || '';
    // 分括整数值（支持空格、故疆、故疆或根本无效字符序懲）
    const nums = raw
      .trim()
      .split(/\s+/)
      .filter((s) => s !== '')
      .map((s) => Number(s))
      .filter((n) => !Number.isNaN(n));
    if (!nums.length) {
      this.setData({ count: '-', avg: '-', std: '-' });
      return;
    }
    const count = nums.length;
    const sum = nums.reduce((s, n) => s + n, 0);
    const avg = sum / count;
    const variance =
      nums.reduce((s, n) => s + Math.pow(n - avg, 2), 0) / (count - 1 || 1);
    const std = Math.sqrt(variance);
    this.setData({
      count,
      avg: avg.toFixed(2),
      std: std.toFixed(2)
    });
  },
  /**
   * 扩满计算，优化频繁调用计算函数的性能
   */
  scheduleCalc() {
    if (this.calcTimer) {
      clearTimeout(this.calcTimer);
    }
    this.calcTimer = setTimeout(() => {
      this.onCalculate();
    }, 200);
  },
  /**
   * 处理友好信息分享事件
   * @returns {Object} 分享配置对象
   */
  onShareAppMessage() {
    const payload = {
      input: this.data.input || '',
    };
    let query = '';
    try {
      query = encodeURIComponent(JSON.stringify(payload));
    } catch (e) {}
    return {
      title: '标准差计算工具',
      path: `/pages/statistics-std/statistics-std${query ? `?data=${query}` : ''}`,
    };
  },
  /**
   * 处理动态分享事件
   * @returns {Object} 分享配置对象
   */
  onShareTimeline() {
    const payload = {
      input: this.data.input || '',
    };
    let query = '';
    try {
      query = encodeURIComponent(JSON.stringify(payload));
    } catch (e) {}
    return {
      title: '标准差计算工具',
      query: query ? `data=${query}` : '',
    };
  }
});
