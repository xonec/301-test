/**
 * 内包统计工具页面
 * 功能：计算混合物料产率、称重平衡率、包装数量范围
 * 功能描述：
 *   1. 支持输入非整罐取样量、规格、混合后物料重量、入库数量、取样数量、废粉重量等参数
 *   2. 计算产率和称重平衡率（百分比）
 *   3. 根据规格和混合重量计算包装数量的合理范围
 *   4. 支持数据永久化存储和分享
 */
Page({
  // 控制是否支持友好信息分享
  enableShareAppMessage: true,
  // 控制是否支持动态分享
  enableShareTimeline: true,
  data: {
    // 输入表单字段配置，包括标签、占位符等
    fields: [
      { key: 'sampleWeight', label: '非整罐取样量(kg)', placeholder: '输入或选择取样量' },
      { key: 'specWeight', label: '规格(kg)', placeholder: '输入或选择规格' },
      { key: 'mixedWeight', label: '混合后物料重量(kg)', placeholder: '请输入混合后物料重量' },
      { key: 'inStockCount', label: '入库数量(瓶)', placeholder: '请输入入库数量' },
      { key: 'sampleCount', label: '取样数量(瓶)', placeholder: '请输入取样数量' },
      { key: 'wasteWeight', label: '废粉重量(kg)', placeholder: '请输入废粉重量' }
    ],
    // 表单数据对象，存储用户输入的各项数据
    form: {},
    // 产率计算结果
    yieldRate: '-',
    // 称重平衡率计算结果
    balanceRate: '-',
    // 包装数量范围显示文本
    rangeText: '-'
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
        if (parsed && parsed.form) {
          this.setData({ form: parsed.form }, () => {
            this.scheduleCalc();
          });
          return;
        }
      } catch (e) {}
    }
    try {
      const saved = wx.getStorageSync('STAT_INNER_STATE');
      if (saved && saved.form) {
        this.setData({ form: saved.form }, () => {
          this.scheduleCalc();
        });
      }
    } catch (e) {}
  },
  /**
   * 处理表单输入事件
   * 输入后自动保存并触发计算
   * @param {Object} e - 输入事件对象
   */
  onInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: Number(e.detail.value) || 0 });
    try {
      wx.setStorageSync('STAT_INNER_STATE', {
        form: this.data.form,
      });
    } catch (e) {}
    this.scheduleCalc();
  },
  /**
   * 扩满计算，优化频繁调用计算函数的性能
   */
  scheduleCalc() {
    if (this.calcTimer) {
      clearTimeout(this.calcTimer);
    }
    this.calcTimer = setTimeout(() => {
      this.onCalcYield();
      this.onCalcRange();
    }, 200);
  },
  /**
   * 计算产率
   * 产率 = （入库数 × 规格）/ 混合后物料重量 × 100%
   * 平衡率 = （入库数 × 规格 + 废粉重量）/ 混合后物料重量 × 100%
   */
  onCalcYield() {
    const { mixedWeight = 0, inStockCount = 0, specWeight = 0, wasteWeight = 0 } = this.data.form;
    if (!mixedWeight || !specWeight) {
      this.setData({ yieldRate: '-', balanceRate: '-' });
      return;
    }
    const productWeight = inStockCount * specWeight;
    const yieldRate = mixedWeight ? (productWeight / mixedWeight) * 100 : 0;
    const balanceRate = mixedWeight ? ((productWeight + wasteWeight) / mixedWeight) * 100 : 0;
    this.setData({
      yieldRate: `${yieldRate.toFixed(2)}%`,
      balanceRate: `${balanceRate.toFixed(2)}%`
    });
  },
  /**
   * 计算包装数量范围
   * 考虑 ±2% 的波动，计算合理的包装数量区间
   */
  onCalcRange() {
    const { mixedWeight = 0, specWeight = 0 } = this.data.form;
    if (!mixedWeight || !specWeight) {
      this.setData({ rangeText: '-' });
      return;
    }
    const mid = mixedWeight / specWeight;
    const min = Math.floor(mid * 0.98);
    const max = Math.ceil(mid * 1.02);
    this.setData({ rangeText: `${min} ~ ${max} 瓶` });
  },
  /**
   * 处理友好信息分享事件
   * @returns {Object} 分享配置对象
   */
  onShareAppMessage() {
    const payload = {
      form: this.data.form || {},
    };
    let query = '';
    try {
      query = encodeURIComponent(JSON.stringify(payload));
    } catch (e) {}
    return {
      title: '内包统计工具',
      path: `/pages/statistics-inner/statistics-inner${query ? `?data=${query}` : ''}`,
    };
  },
  /**
   * 处理动态分享事件
   * @returns {Object} 分享配置对象
   */
  onShareTimeline() {
    const payload = {
      form: this.data.form || {},
    };
    let query = '';
    try {
      query = encodeURIComponent(JSON.stringify(payload));
    } catch (e) {}
    return {
      title: '内包统计工具',
      query: query ? `data=${query}` : '',
    };
  }
});
