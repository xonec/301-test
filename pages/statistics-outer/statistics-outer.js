/**
 * 外包统计工具页面
 * 功能：计算外包不流动骨箱的数量、丛数、生产量、费标势位等
 * 功能描述：
 *   1. 支持 A-J 一共上上十个骨箱的数量输入（支持一位小数）
 *   2. 支持韦常祷算：箘数、件数、颗数、含取样颗数、标签实用数、布码
 *   3. 支持数据永久化存储和分享
 *   4. 支持上流的每托详情显示新时窗（住掫线）
 */
Page({
  // 控制是否支持友好信息分享
  enableShareAppMessage: true,
  // 控制是否支持动态分享
  enableShareTimeline: true,
  data: {
    // 公有骨箱数需求，整个表单常数输入
    globalCount: '',
    // 杀滑模板名称
    currentTemplateName: '未选择',
    // 桐名 A-E 的骨箱，输出为浮点数（一位小数）
    bucketsAB: ['A', 'B', 'C', 'D', 'E'].map((name) => ({
      name,
      key: `bucket_${name}`,
      value: '',
    })),
    // 桐名 F-J 的骨箱，输出为浮点数（一位小数）
    bucketsCD: ['F', 'G', 'H', 'I', 'J'].map((name) => ({
      name,
      key: `bucket_${name}`,
      value: '',
    })),
    // 不使用（留于扩展）
    bucketsEF: [],
    bucketsGJ: [],
    // 附属值数组：零箱、取样、标签
    extras: [
      { key: 'zeroCase', label: '零箱', value: '' },
      { key: 'sample', label: '取样', value: '' },
      { key: 'label', label: '标签', value: '' },
    ],
    // 每件扅数
    bottlePerCase: '',
    // 每托件数
    casePerPallet: '',
    // 计算结果汇总
    summary: {
      bucketCount: 0,      // 驼数
      caseText: '-',       // 件数显示文本
      bottleCount: 0,      // 总颗数
      bottleWithSample: 0, // 含取样颗数
      labelCount: 0,       // 标签实用数
      palletText: '-',     // 布码是否有效
    },
    // 布码窗口信息
    pager: {
      current: 1,
      total: 0,
      rangeText: '',
    },
    // 布码跳转输入框
    pagerInput: '',
    // 每托详情信息数组
    palletDetails: [],
  },
  // 计算死重器，用于优化频繁调用计算函数的性能
  calcTimer: null,
  /**
   * 页面加载
   * 增强一：优先使用分享带来的数据、其次使用本地缓存数据
   * @param {Object} options - 页面打开的选项参数
   */
  onLoad(options) {
    // 与状态应用，控制是否追需会例值
    const applyState = (saved) => {
      if (!saved) return;
      const buckets = saved.buckets || {};
      // 构建驼来数组
      const buildBuckets = (names, originListKey) => {
        const origin = this.data[originListKey] || [];
        return names.map((name, idx) => {
          const originItem = origin[idx] || { name, key: `bucket_${name}` };
          const raw = buckets[name];
          const value = raw === '' || raw === undefined || raw === null ? '' : Number(raw) || 0;
          return {
            name: originItem.name,
            key: originItem.key,
            value,
          };
        });
      };

      const extrasObj = saved.extras || {};
      // 构建附加值数组
      const buildExtras = () => {
        const origin = this.data.extras || [];
        return origin.map((item) => {
          const raw = extrasObj[item.key];
          const value = raw === '' || raw === undefined || raw === null ? '' : Number(raw) || 0;
          return {
            key: item.key,
            label: item.label,
            value,
          };
        });
      };

      this.setData(
        {
          globalCount:
            saved.globalCount !== undefined && saved.globalCount !== null && saved.globalCount !== ''
              ? saved.globalCount
              : this.data.globalCount,
          bottlePerCase:
            saved.bottlePerCase !== undefined && saved.bottlePerCase !== null && saved.bottlePerCase !== ''
              ? saved.bottlePerCase
              : this.data.bottlePerCase,
          casePerPallet:
            saved.casePerPallet !== undefined && saved.casePerPallet !== null && saved.casePerPallet !== ''
              ? saved.casePerPallet
              : this.data.casePerPallet,
          currentTemplateName: saved.currentTemplateName || this.data.currentTemplateName,
          bucketsAB: buildBuckets(['A', 'B', 'C', 'D', 'E'], 'bucketsAB'),
          bucketsCD: buildBuckets(['F', 'G', 'H', 'I', 'J'], 'bucketsCD'),
          bucketsEF: this.data.bucketsEF,
          bucketsGJ: this.data.bucketsGJ,
          extras: buildExtras(),
        },
        () => {
          this.scheduleCalc();
        },
      );
    };

    // 优先使用分享带来的数据，其次使用本地缓存
    if (options && options.data) {
      try {
        const decoded = decodeURIComponent(options.data);
        const parsed = JSON.parse(decoded);
        if (parsed) {
          applyState(parsed);
          return;
        }
      } catch (e) {}
    }

    try {
      const saved = wx.getStorageSync('STAT_OUTER_STATE');
      applyState(saved);
    } catch (e) {}
  },
  /**
   * 保存当前状态的所有数据到本地缓存
   */
  saveState() {
    const buckets = {};
    const allBuckets = [
      ...(this.data.bucketsAB || []),
      ...(this.data.bucketsCD || []),
      ...(this.data.bucketsEF || []),
      ...(this.data.bucketsGJ || []),
    ];
    allBuckets.forEach((b) => {
      buckets[b.name] = b.value === '' || b.value === undefined || b.value === null ? '' : Number(b.value) || 0;
    });

    const extrasObj = {};
    (this.data.extras || []).forEach((item) => {
      extrasObj[item.key] =
        item.value === '' || item.value === undefined || item.value === null ? '' : Number(item.value) || 0;
    });

    try {
      wx.setStorageSync('STAT_OUTER_STATE', {
        globalCount: this.data.globalCount,
        buckets,
        extras: extrasObj,
        bottlePerCase: this.data.bottlePerCase,
        casePerPallet: this.data.casePerPallet,
        currentTemplateName: this.data.currentTemplateName,
      });
    } catch (e) {}
  },
  /**
   * 处理友好信息分享事件
   * @returns {Object} 分享配置对象
   */
  onShareAppMessage() {
    const buckets = {};
    const allBuckets = [
      ...(this.data.bucketsAB || []),
      ...(this.data.bucketsCD || []),
      ...(this.data.bucketsEF || []),
      ...(this.data.bucketsGJ || []),
    ];
    allBuckets.forEach((b) => {
      buckets[b.name] = b.value === '' || b.value === undefined || b.value === null ? '' : Number(b.value) || 0;
    });

    const extrasObj = {};
    (this.data.extras || []).forEach((item) => {
      extrasObj[item.key] =
        item.value === '' || item.value === undefined || item.value === null ? '' : Number(item.value) || 0;
    });

    const payload = {
      globalCount: this.data.globalCount,
      buckets,
      extras: extrasObj,
      bottlePerCase: this.data.bottlePerCase,
      casePerPallet: this.data.casePerPallet,
      currentTemplateName: this.data.currentTemplateName,
    };

    let query = '';
    try {
      query = encodeURIComponent(JSON.stringify(payload));
    } catch (e) {}
    return {
      title: '外包统计工具',
      path: `/pages/statistics-outer/statistics-outer${query ? `?data=${query}` : ''}`,
    };
  },
  /**
   * 处理动态分享事件
   * @returns {Object} 分享配置对象
   */
  onShareTimeline() {
    const buckets = {};
    const allBuckets = [
      ...(this.data.bucketsAB || []),
      ...(this.data.bucketsCD || []),
      ...(this.data.bucketsEF || []),
      ...(this.data.bucketsGJ || []),
    ];
    allBuckets.forEach((b) => {
      buckets[b.name] = b.value === '' || b.value === undefined || b.value === null ? '' : Number(b.value) || 0;
    });

    const extrasObj = {};
    (this.data.extras || []).forEach((item) => {
      extrasObj[item.key] =
        item.value === '' || item.value === undefined || item.value === null ? '' : Number(item.value) || 0;
    });

    const payload = {
      globalCount: this.data.globalCount,
      buckets,
      extras: extrasObj,
      bottlePerCase: this.data.bottlePerCase,
      casePerPallet: this.data.casePerPallet,
      currentTemplateName: this.data.currentTemplateName,
    };

    let query = '';
    try {
      query = encodeURIComponent(JSON.stringify(payload));
    } catch (e) {}

    return {
      title: '外包统计工具',
      query: query ? `data=${query}` : '',
    };
  },
  /**
   * 处理全局数量输入事件
   * @param {Object} e - 输入事件对象
   */
  onGlobalInput(e) {
    const v = Number(e.detail.value) || 0;
    this.setData({ globalCount: v });
    this.saveState();
  },
  /**
   * 处理填充操作：所有驼来数设为公有骨箱数
   */
  onFill() {
    const v = this.data.globalCount;
    const fill = (listKey) => {
      const list = this.data[listKey] || [];
      return list.map((b) => ({
        name: b.name,
        key: b.key,
        value: v,
      }));
    };
    this.setData({
      bucketsAB: fill('bucketsAB'),
      bucketsCD: fill('bucketsCD'),
      bucketsEF: fill('bucketsEF'),
      bucketsGJ: fill('bucketsGJ'),
    });
    this.saveState();
    this.scheduleCalc();
  },
  /**
   * 处理驼来数输入事件
   * 驼来数：仅允许 >=0 的一位小数
   * @param {Object} e - 输入事件对象
   */
  onBucketInput(e) {
    const key = e.currentTarget.dataset.key;
    // A-J 桶：只允许 >=0 的一位小数
    let raw = e.detail.value || '';
    // 只保留数字和一个小数点
    raw = raw.replace(/[^0-9.]/g, '');
    const parts = raw.split('.');
    if (parts.length > 2) {
      raw = parts[0] + '.' + parts[1];
    }
    // 限制一位小数
    raw = raw.replace(/^(\d+\.\d?).*$/, '$1');
    let v = raw === '' ? '' : Number(raw);
    if (typeof v === 'number' && !isNaN(v) && v < 0) {
      v = 0;
    }
    const updateList = (listKey) => {
      const list = this.data[listKey] || [];
      return list.map((b) =>
        b.key === key
          ? {
              name: b.name,
              key: b.key,
              value: v,
            }
          : b,
      );
    };
    this.setData({
      bucketsAB: updateList('bucketsAB'),
      bucketsCD: updateList('bucketsCD'),
      bucketsEF: updateList('bucketsEF'),
      bucketsGJ: updateList('bucketsGJ'),
    });
    this.saveState();
    this.scheduleCalc();
  },
  /**
   * 处理附加值输入事件
   * 附加值（零箱、取样、标签）：必须为正整数
   * @param {Object} e - 输入事件对象
   */
  onExtraInput(e) {
    const key = e.currentTarget.dataset.key;
    // 零箱、取样、标签：必须为正整数
    let raw = e.detail.value || '';
    raw = raw.replace(/[^0-9]/g, '');
    let v = raw === '' ? '' : Number(raw);
    if (typeof v === 'number' && !isNaN(v) && v < 0) {
      v = 0;
    }
    this.setData({
      extras: (this.data.extras || []).map((item) =>
        item.key === key
          ? {
              key: item.key,
              label: item.label,
              value: v,
            }
          : item,
      ),
    });
    this.saveState();
    this.scheduleCalc();
  },
  /**
   * 处理“每件扅数”输入事件
   * @param {Object} e - 输入事件对象
   */
  onBottlePerCaseInput(e) {
    // 瓶/件：正整数
    let raw = e.detail.value || '';
    raw = raw.replace(/[^0-9]/g, '');
    const v = raw === '' ? '' : Number(raw);
    this.setData({ bottlePerCase: v });
    this.saveState();
    this.scheduleCalc();
  },
  /**
   * 处理“每托件数”输入事件
   * @param {Object} e - 输入事件对象
   */
  onCasePerPalletInput(e) {
    // 件/托：正整数
    let raw = e.detail.value || '';
    raw = raw.replace(/[^0-9]/g, '');
    const v = raw === '' ? '' : Number(raw);
    this.setData({ casePerPallet: v });
    this.saveState();
    this.scheduleCalc();
  },
  /**
   * 扩满计算，优化频繁调用计算函数的性能
   * 压低按键频率需要的计算调用频率
   */
  scheduleCalc() {
    if (this.calcTimer) {
      clearTimeout(this.calcTimer);
    }
    this.calcTimer = setTimeout(() => {
      this.onCalc();
    }, 200);
  },
  /**
   * 根据当前数据执行数学计算
   * 计算项目：驼数、件数、颗数、标签实用数、布码分较
   */
  onCalc() {
    const bottlePerCase = Number(this.data.bottlePerCase) || 0;
    const casePerPallet = Number(this.data.casePerPallet) || 0;

    const allBuckets = [
      ...(this.data.bucketsAB || []),
      ...(this.data.bucketsCD || []),
      ...(this.data.bucketsEF || []),
      ...(this.data.bucketsGJ || []),
    ];

    // 布码和敥辆算法：留于且前休止，需要的时候添加上
    // 桶数：有多少个桶有有效输入（>=0）
    const validBuckets = allBuckets.filter((b) => b.value !== '' && !isNaN(Number(b.value)) && Number(b.value) >= 0);
    const bucketCount = validBuckets.length;

    // 件数：A-J 桶件数合计（每桶输入直接视为件数）
    const totalCase = validBuckets.reduce((sum, b) => {
      const v = Number(b.value) || 0;
      return sum + v;
    }, 0);

    const zeroCase = Number((this.data.extras || []).find((e) => e.key === 'zeroCase')?.value) || 0;
    const sampleVal = Number((this.data.extras || []).find((e) => e.key === 'sample')?.value);
    const labelVal = Number((this.data.extras || []).find((e) => e.key === 'label')?.value);

    // 件数展示：A-J 桶件数合计，文本上再加零箱瓶
    const zeroText = zeroCase > 0 ? `+${zeroCase}瓶` : '';
    const caseDisplay = `${totalCase}件${zeroText}`;

    // 瓶数：件数 × 瓶/件 + 零箱
    const totalBottle = totalCase * bottlePerCase + zeroCase;

    // 含取样瓶数：瓶数 + 取样（取样不是正整数则视为未知）
    let bottleWithSample = '-';
    if (Number.isInteger(sampleVal) && sampleVal > 0) {
      bottleWithSample = totalBottle + sampleVal;
    }

    // 标签实用数：含取样瓶数 + 标签（标签不是正整数则视为未知）
    let labelCount = '-';
    if (bottleWithSample !== '-' && Number.isInteger(labelVal) && labelVal > 0) {
      labelCount = bottleWithSample + labelVal;
    }

    // 托码：用“件数”按 件/托 拆分，零箱瓶数单独加在末尾
    let palletText = '-';
    if (casePerPallet > 0) {
      const fullPallet = Math.floor(totalCase / casePerPallet);
      const restCase = totalCase % casePerPallet;
      const zeroPart = zeroCase > 0 ? `+${zeroCase}瓶` : '';
      palletText = `${fullPallet}整托${restCase ? '+' + restCase + '件' : ''}${zeroPart}`;
    }

    // 计算每托详情，包括每托的驼段段位罡列
    const palletDetails = [];
    if (casePerPallet > 0 && totalCase > 0) {
      // 先按 A-J 生成全局件号区间
      const orderedNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      const bucketsByName = {};
      allBuckets.forEach((b) => {
        bucketsByName[b.name] = b;
      });

      const bucketGlobalRanges = [];
      let caseIndex = 1;
      orderedNames.forEach((name) => {
        const bucket = bucketsByName[name];
        const v = bucket && bucket.value !== '' ? Number(bucket.value) || 0 : 0;
        if (v > 0) {
          const start = caseIndex;
          const end = caseIndex + v - 1;
          bucketGlobalRanges.push({ name, start, end });
          caseIndex = end + 1;
        }
      });

      const totalPallet = Math.ceil(totalCase / casePerPallet);
      for (let i = 0; i < totalPallet; i += 1) {
        const palletIndex = i + 1;
        const palletStart = i * casePerPallet + 1;
        const palletEnd = Math.min((i + 1) * casePerPallet, totalCase);
        const palletSize = palletEnd - palletStart + 1;

        const segments = [];
        // 记录当前托最后一个件号对应的桶和局部件号
        let lastBucket = null;
        let lastLocalEnd = null;
        bucketGlobalRanges.forEach((br) => {
          const overlapStart = Math.max(palletStart, br.start);
          const overlapEnd = Math.min(palletEnd, br.end);
          if (overlapStart <= overlapEnd) {
            const localStart = overlapStart - br.start + 1;
            const localEnd = overlapEnd - br.start + 1;
            let seg = `${br.name}${localStart}`;
            if (localEnd > localStart) {
              seg += `-${br.name}${localEnd}`;
            }
            segments.push(seg);

            // 记录最后一个覆盖到的桶段
            if (lastBucket === null || overlapEnd >= palletEnd) {
              lastBucket = br.name;
              lastLocalEnd = localEnd;
            }
          }
        });

        const baseText = segments.join('、');
        // 尾托如有零箱，则在末尾追加“ 零箱X(YP)”
        let tailText = baseText;
        const isLast = palletEnd === totalCase;
        if (isLast && zeroCase > 0 && bottlePerCase > 0) {
          const zeroCaseBottle = zeroCase; // 零箱已按瓶数输入
          // 计算零箱起始编号：尾托最后一件的下一号，例如 B103 -> B104
          let zeroLabel = '';
          if (lastBucket && lastLocalEnd != null) {
            const nextIndex = lastLocalEnd + 1;
            zeroLabel = `${lastBucket}${nextIndex}`;
          }
          tailText = `${baseText} 零箱${zeroLabel}(${zeroCaseBottle}瓶)`;
        }

        palletDetails.push({
          index: palletIndex,
          size: palletSize,
          text: tailText,
          // 尾托瓶数需要加零箱
          bottleCount: isLast
            ? palletSize * bottlePerCase + zeroCase
            : palletSize * bottlePerCase,
        });
      }
    }

    const pagerTotal = palletDetails.length;
    const safeCurrent = pagerTotal ? Math.min(this.data.pager.current || 1, pagerTotal) : 0;
    const currentPallet = pagerTotal && safeCurrent ? palletDetails[safeCurrent - 1] : null;
    const rangeText = currentPallet ? currentPallet.text : '';

    this.setData({
      summary: {
        bucketCount,
        caseText: caseDisplay,
        bottleCount: totalBottle,
        bottleWithSample,
        labelCount,
        palletText,
      },
      palletDetails,
      pager: {
        current: safeCurrent,
        total: pagerTotal,
        rangeText,
        bottleCount: currentPallet ? currentPallet.bottleCount : 0,
      },
    });
  },
  /**
   * 清空所有计算数据和缓存
   */
  onClear() {
    const clearBuckets = (listKey) => {
      const list = this.data[listKey] || [];
      return list.map((b) => ({
        name: b.name,
        key: b.key,
        value: '',
      }));
    };
    this.setData({
      globalCount: '',
      bucketsAB: clearBuckets('bucketsAB'),
      bucketsCD: clearBuckets('bucketsCD'),
      bucketsEF: clearBuckets('bucketsEF'),
      bucketsGJ: clearBuckets('bucketsGJ'),
      extras: (this.data.extras || []).map((item) => ({
        key: item.key,
        label: item.label,
        value: '',
      })),
      bottlePerCase: '',
      casePerPallet: '',
      currentTemplateName: '',
      pagerInput: '',
      pager: {
        current: 1,
        total: this.data.pager.total || 18,
        rangeText: '',
      },
      summary: {
        bucketCount: 0,
        caseText: '-',
        bottleCount: 0,
        bottleWithSample: 0,
        labelCount: 0,
        palletText: '-',
      },
    });
    try {
      wx.removeStorageSync('STAT_OUTER_STATE');
    } catch (e) {}
  },
  /**
   * 复制计算结果到剪贴板
   */
  onCopy() {
    const s = this.data.summary;
    const text = `桶数: ${s.bucketCount}
件数: ${s.caseText}
瓶数: ${s.bottleCount}
含取样瓶数: ${s.bottleWithSample}
标签实用数: ${s.labelCount}
托码: ${s.palletText}`;
    wx.setClipboardData({ data: text });
  },
  /**
   * 打开模板名称编辑对话框
   */
  onOpenTemplate() {
    wx.showModal({
      title: '模板名称',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content) {
          this.setData({ currentTemplateName: res.content });
          this.saveState();
        }
      },
    });
  },
  /**
   * 批量输入源事件：批量跳转批次
   * @param {Object} e - 输入事件对象
   */
  onPagerInput(e) {
    this.setData({ pagerInput: e.detail.value });
  },
  /**
   * 跳转到第一托
   */
  onFirst() {
    const list = this.data.palletDetails || [];
    if (!list.length) return;
    this.setData({
      pager: {
        current: 1,
        total: list.length,
        rangeText: list[0].text,
        bottleCount: list[0].bottleCount,
      },
    });
  },
  /**
   * 跳转到最后一托
   */
  onLast() {
    const list = this.data.palletDetails || [];
    const total = list.length;
    if (!total) return;
    this.setData({
      pager: {
        current: total,
        total,
        rangeText: list[total - 1].text,
        bottleCount: list[total - 1].bottleCount,
      },
    });
  },
  /**
   * 跳转到上一托
   */
  onPrev() {
    const list = this.data.palletDetails || [];
    const total = list.length;
    if (!total) return;
    const current = this.data.pager.current || 1;
    const next = current > 1 ? current - 1 : 1;
    this.setData({
      pager: {
        current: next,
        total,
        rangeText: list[next - 1].text,
        bottleCount: list[next - 1].bottleCount,
      },
    });
  },
  /**
   * 跳转到下一托
   */
  onNext() {
    const list = this.data.palletDetails || [];
    const total = list.length;
    if (!total) return;
    const current = this.data.pager.current || 1;
    const next = current < total ? current + 1 : total;
    this.setData({
      pager: {
        current: next,
        total,
        rangeText: list[next - 1].text,
        bottleCount: list[next - 1].bottleCount,
      },
    });
  },
  /**
   * 跳转到指定批次
   */
  onJump() {
    const list = this.data.palletDetails || [];
    const total = list.length;
    if (!total) return;
    const n = Number(this.data.pagerInput) || 1;
    const current = Math.min(Math.max(n, 1), total);
    this.setData({
      pager: {
        current,
        total,
        rangeText: list[current - 1].text,
        bottleCount: list[current - 1].bottleCount,
      },
    });
  },
});
