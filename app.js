/* 随时记 — app.js
 * 零依赖、零构建。
 * 已知限制（spec-001 Nit 1）：旧版 Safari 对 <input type="datetime-local">
 * 支持不一致（可能退化为文本输入），一期不做类型检测降级，评审已同意不阻塞。
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'suishiji.records';
  var SUMMARY_LEN = 50;

  // ---------- 数据层 ----------

  var storageAvailable = (function () {
    try {
      var k = '__suishiji_test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  })();

  function loadRecords() {
    if (!storageAvailable) return [];
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === null) return [];
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) throw new Error('not array');
      return arr;
    } catch (e) {
      // 防御性解析：损坏时重置并提示
      showToast('本地数据损坏，已重置', 'warn');
      saveRecords([]);
      return [];
    }
  }

  // 返回 boolean：false 表示写入失败（超限等）
  function saveRecords(records) {
    if (!storageAvailable) return false;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return true;
    } catch (e) {
      return false;
    }
  }

  // ---------- 工具 ----------

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function formatTime(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  // datetime-local 输入值 -> 毫秒时间戳；无效时返回 null
  function parseTimeInput(value) {
    if (!value) return null;
    var ts = new Date(value).getTime();
    return isNaN(ts) ? null : ts;
  }

  function genId() {
    return 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  // ---------- toast（统一提示容器，顶部居中） ----------

  // 默认 3 秒自动消失；persist 为 true 时常驻（如「存储不可用」）
  function showToast(msg, type, persist) {
    var box = document.getElementById('toast');
    if (!box) return;
    var el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'info');
    el.textContent = msg;
    box.appendChild(el);
    if (!persist) {
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 3000);
    }
  }

  // ---------- 路由 ----------

  var currentDetailId = null;

  function showSection(id) {
    ['view-new', 'view-list', 'view-detail'].forEach(function (sid) {
      document.getElementById(sid).hidden = (sid !== id);
    });
  }

  function router() {
    var hash = window.location.hash || '#/list';
    var records;

    if (hash === '#/new') {
      initNewForm();
      showSection('view-new');
      return;
    }

    if (hash === '#/detail/' || hash.indexOf('#/detail/') === 0) {
      var id = hash.slice('#/detail/'.length);
      records = loadRecords();
      var rec = null;
      for (var i = 0; i < records.length; i++) {
        if (records[i].id === id) { rec = records[i]; break; }
      }
      if (!rec) {
        // id 不存在（如已删除后点后退）→ 回退列表
        window.location.hash = '#/list';
        return;
      }
      currentDetailId = id;
      renderDetail(rec);
      showSection('view-detail');
      return;
    }

    // #/list 及一切非法 hash → 列表
    if (hash !== '#/list') {
      // 非法 hash 归一化，保证前进/后退行为一致
      try {
        window.location.replace('#/list');
      } catch (e) {
        window.location.hash = '#/list';
      }
      return;
    }
    // 渲染列表时从搜索框取当前关键词（不重置：删除后返回列表仍保留过滤）
    var kwEl = document.getElementById('search-input');
    renderList(kwEl ? kwEl.value : '');
    showSection('view-list');
  }

  // ---------- 登记视图（F1） ----------

  function toLocalInputValue(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function initNewForm() {
    var titleEl = document.getElementById('f-title');
    var contentEl = document.getElementById('f-content');
    var timeEl = document.getElementById('f-time');
    var errEl = document.getElementById('form-error');
    // 防御：进入 #/new 时若表单仍残留 title/content（如 bfcache/后退），重置为空，
    // 保证「进入登记页 = 全新一笔」的语义
    titleEl.value = '';
    contentEl.value = '';
    if (!timeEl.value) timeEl.value = toLocalInputValue(Date.now());
    if (errEl) {
      errEl.hidden = true;
      errEl.textContent = '';
    }
  }

  function onFormSubmit(e) {
    e.preventDefault();
    var titleEl = document.getElementById('f-title');
    var contentEl = document.getElementById('f-content');
    var timeEl = document.getElementById('f-time');
    var errEl = document.getElementById('form-error');

    var title = titleEl.value.trim();
    var content = contentEl.value.trim();
    if (!title || !content) {
      errEl.textContent = '标题和内容不能为空';
      errEl.hidden = false;
      return;
    }
    errEl.hidden = true;

    // datetime-local 被清空/非法：静默回退为提交时刻，并回显，所见即所存
    var createdAt = parseTimeInput(timeEl.value);
    if (createdAt === null) {
      createdAt = Date.now();
      timeEl.value = toLocalInputValue(createdAt);
    }

    var record = { id: genId(), title: title, content: content, createdAt: createdAt };
    var records = loadRecords();
    records.push(record);

    if (saveRecords(records)) {
      showToast('保存成功', 'info');
      // 保存成功后清空表单（时间一并清空，下次进入 #/new 由 initNewForm 重新初始化），
      // 防止再次进入登记页时残留旧值导致重复入库
      titleEl.value = '';
      contentEl.value = '';
      timeEl.value = '';
      window.location.hash = '#/list';
    } else {
      // 保存失败：停留表单，字段原样保留供重试
      showToast('保存失败：存储空间已满', 'error');
    }
  }

  // ---------- 列表视图（F2） ----------

  function sortDesc(records) {
    // createdAt 降序，同毫秒按 id 降序兜底
    return records.slice().sort(function (a, b) {
      if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
      return a.id < b.id ? 1 : (a.id > b.id ? -1 : 0);
    });
  }

  function renderList(keyword) {
    var ul = document.getElementById('record-list');
    var records = sortDesc(loadRecords());
    var kw = String(keyword || '').trim().toLowerCase();
    var visible = records;

    if (kw) {
      // 匹配完整 title/content 字段，而非 50 字摘要
      visible = records.filter(function (r) {
        return String(r.title).toLowerCase().indexOf(kw) !== -1 ||
          String(r.content).toLowerCase().indexOf(kw) !== -1;
      });
    }

    ul.innerHTML = '';

    if (records.length === 0) {
      var empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.innerHTML =
        '<p>暂无记录，去记一条吧</p>' +
        '<a href="#/new" class="btn btn-primary">去记一条</a>';
      ul.appendChild(empty);
      return;
    }

    if (visible.length === 0) {
      var none = document.createElement('li');
      none.className = 'empty-state';
      none.innerHTML = '<p>没有匹配「' + escapeHtml(keyword.trim()) + '」的记录</p>';
      ul.appendChild(none);
      return;
    }

    visible.forEach(function (r) {
      var summary = String(r.content).slice(0, SUMMARY_LEN) +
        (String(r.content).length > SUMMARY_LEN ? '…' : '');
      var li = document.createElement('li');
      li.dataset.id = r.id;
      li.innerHTML =
        '<div class="record-title">' + escapeHtml(r.title) + '</div>' +
        '<div class="record-summary">' + escapeHtml(summary) + '</div>' +
        '<div class="record-time">' + escapeHtml(formatTime(r.createdAt)) + '</div>';
      ul.appendChild(li);
    });
  }

  // ---------- 详情视图（F3） ----------

  function renderDetail(rec) {
    document.getElementById('d-title').textContent = rec.title;
    document.getElementById('d-time').textContent = '创建于 ' + formatTime(rec.createdAt);
    // textContent + pre-wrap 保留换行，天然免疫 XSS
    document.getElementById('d-content').textContent = rec.content;
  }

  function onDeleteClick() {
    if (currentDetailId === null) return;
    if (!window.confirm('确定删除这条记录吗？')) return; // 取消 → 停留详情

    var records = loadRecords();
    var next = records.filter(function (r) { return r.id !== currentDetailId; });
    saveRecords(next);
    currentDetailId = null;
    showToast('已删除', 'info');
    // 跳列表；router 渲染列表时保留搜索框关键词
    window.location.hash = '#/list';
  }

  // ---------- 事件绑定与启动 ----------

  function init() {
    document.getElementById('new-form').addEventListener('submit', onFormSubmit);
    document.getElementById('search-input').addEventListener('input', function (e) {
      renderList(e.target.value);
    });
    document.getElementById('record-list').addEventListener('click', function (e) {
      var li = e.target.closest('li');
      if (!li || !li.dataset.id) return;
      // 点击空状态/无结果条目不跳转
      if (e.target.closest('a')) return;
      window.location.hash = '#/detail/' + li.dataset.id;
    });
    document.getElementById('d-delete').addEventListener('click', onDeleteClick);
    window.addEventListener('hashchange', router);

    if (!storageAvailable) {
      // 常驻黄条：不自动消失
      showToast('浏览器存储不可用，本次记录不会被保存', 'warn', true);
    }

    if (!window.location.hash) {
      try { window.location.replace('#/list'); } catch (e) { window.location.hash = '#/list'; }
      return;
    }
    router();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
