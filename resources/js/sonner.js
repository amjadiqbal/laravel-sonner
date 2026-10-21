/*! laravel-sonner runtime: Sonner 2.0.8 toasts without React.
 * A line-by-line port of the Toaster/Toast logic in Sonner's dist/index.mjs to plain DOM code. It renders the
 * same markup and data attributes, so Sonner's own styles.css (bundled unchanged) drives every animation.
 * Sonner: https://github.com/emilkowalski/sonner, MIT License, Copyright (c) 2023 Emil Kowalski. */
(function () {
  if (window.LaravelSonner) {
    window.LaravelSonner.boot();
    return;
  }

  // Constants from Sonner 2.0.8.
  var VISIBLE_TOASTS_AMOUNT = 3;
  var VIEWPORT_OFFSET = '24px';
  var MOBILE_VIEWPORT_OFFSET = '16px';
  var TOAST_LIFETIME = 4000;
  var TOAST_WIDTH = 356;
  var GAP = 14;
  var SWIPE_THRESHOLD = 45;
  var TIME_BEFORE_UNMOUNT = 200;
  var POSITIONS = ['top-left', 'top-right', 'top-center', 'bottom-left', 'bottom-right', 'bottom-center'];

  function svg(viewBox, path) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + viewBox + '" fill="currentColor" height="20" width="20" aria-hidden="true">' +
      '<path fill-rule="evenodd" d="' + path + '" clip-rule="evenodd"></path></svg>';
  }

  var ICONS = {
    success: svg('0 0 20 20', 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z'),
    warning: svg('0 0 24 24', 'M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z'),
    info: svg('0 0 20 20', 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z'),
    error: svg('0 0 20 20', 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z'),
    close: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
  };

  var options = {};
  var records = []; // newest first, like Sonner's toasts state
  var lists = {}; // position => <ol data-sonner-toaster>
  var section = null;
  var expanded = false;
  var interacting = false;
  var actualTheme = 'light';
  var counter = 1;

  function el(tag, attrs) {
    var node = document.createElement(tag);
    for (var k in attrs || {}) node.setAttribute(k, attrs[k]);
    return node;
  }

  function setData(node, name, value) {
    if (value === undefined || value === null) node.removeAttribute('data-' + name);
    else node.setAttribute('data-' + name, String(value));
  }

  function documentDirection() {
    var dir = document.documentElement.getAttribute('dir');
    if (dir === 'auto' || !dir) return window.getComputedStyle(document.documentElement).direction;
    return dir;
  }

  function assignOffset(defaultOffset, mobileOffset) {
    var styles = {};
    [defaultOffset, mobileOffset].forEach(function (offset, index) {
      var prefix = index === 1 ? '--mobile-offset' : '--offset';
      var defaultValue = index === 1 ? MOBILE_VIEWPORT_OFFSET : VIEWPORT_OFFSET;
      ['top', 'right', 'bottom', 'left'].forEach(function (key) {
        var value = offset;
        if (offset === null || offset === undefined || offset === '') value = defaultValue;
        else if (typeof offset === 'object') value = offset[key] === undefined ? defaultValue : offset[key];
        styles[prefix + '-' + key] = typeof value === 'number' ? value + 'px' : value;
      });
    });
    return styles;
  }

  function resolveTheme() {
    if (options.theme !== 'system') return options.theme || 'light';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // ---- Toaster ---------------------------------------------------------------------------------------------

  function mountSection() {
    if (!document.body) return;
    if (!section) {
      section = el('section', {
        'aria-label': options.containerAriaLabel + ' ' + hotkeyLabel(),
        tabindex: '-1',
        'aria-live': 'polite',
        'aria-relevant': 'additions text',
        'aria-atomic': 'false',
        'data-react-aria-top-layer': 'true'
      });
    }
    // wire:navigate swaps <body>; re-attach the same section so open toasts survive the page change.
    if (!section.isConnected) document.body.appendChild(section);
  }

  function hotkeyLabel() {
    return (options.hotkey || []).join('+').replace(/Key/g, '').replace(/Digit/g, '');
  }

  function list(position) {
    if (lists[position]) return lists[position];
    var parts = position.split('-');
    var ol = el('ol', { tabindex: '-1', 'data-sonner-toaster': 'true', 'data-y-position': parts[0], 'data-x-position': parts[1] });
    ol.setAttribute('dir', options.dir === 'auto' || !options.dir ? documentDirection() : options.dir);
    ol.setAttribute('data-sonner-theme', actualTheme);
    if (options.className) ol.className = options.className;
    ol.style.setProperty('--width', TOAST_WIDTH + 'px');
    ol.style.setProperty('--gap', options.gap + 'px');
    var offsets = assignOffset(options.offset, options.mobileOffset);
    for (var k in offsets) ol.style.setProperty(k, offsets[k]);

    ol.addEventListener('mouseenter', function () { setExpanded(true); });
    ol.addEventListener('mousemove', function () { if (!expanded) setExpanded(true); });
    ol.addEventListener('mouseleave', function () { if (!interacting) setExpanded(false); });
    ol.addEventListener('dragend', function () { setExpanded(false); });
    ol.addEventListener('pointerdown', function (event) {
      if (event.target instanceof HTMLElement && event.target.dataset.dismissible === 'false') return;
      setInteracting(true);
    });
    ol.addEventListener('pointerup', function () { setInteracting(false); });

    mountSection();
    section.appendChild(ol);
    lists[position] = ol;
    return ol;
  }

  function setExpanded(value) {
    if (value && records.length <= 1) value = false;
    if (expanded === value) return;
    expanded = value;
    layoutAll();
    records.forEach(syncTimer);
  }

  function setInteracting(value) {
    if (interacting === value) return;
    interacting = value;
    records.forEach(syncTimer);
  }

  function layoutAll() {
    for (var position in lists) layout(position);
  }

  // Recomputes what Sonner's render derives from its toasts/heights state: index, front, offsets, z-index.
  function layout(position) {
    var ol = lists[position];
    if (!ol) return;
    var group = records.filter(function (r) { return r.position === position; });
    var heights = group.filter(function (r) { return r.inHeights; });

    if (group.length === 0) {
      ol.remove();
      delete lists[position];
      return;
    }

    ol.style.setProperty('--front-toast-height', (heights[0] ? heights[0].height : 0) + 'px');

    group.forEach(function (r, index) {
      var heightIndex = heights.indexOf(r);
      var before = 0;
      for (var i = 0; i < heightIndex; i++) before += heights[i].height;
      r.offset = heightIndex * options.gap + before;

      var node = r.node;
      setData(node, 'index', index);
      setData(node, 'front', index === 0);
      setData(node, 'visible', index + 1 <= options.visibleToasts);
      setData(node, 'expanded', Boolean(expanded || (options.expand && r.mounted)));
      node.style.setProperty('--index', index);
      node.style.setProperty('--toasts-before', index);
      node.style.setProperty('--z-index', group.length - index);
      node.style.setProperty('--offset', (r.removed ? r.offsetBeforeRemove : r.offset) + 'px');
      node.style.setProperty('--initial-height', options.expand ? 'auto' : r.initialHeight + 'px');
    });
  }

  // ---- Toast -----------------------------------------------------------------------------------------------

  function actionButton(r, action, kind) {
    var button = el('button', { 'data-button': 'true' });
    button.setAttribute(kind === 'cancel' ? 'data-cancel' : 'data-action', 'true');
    button.textContent = action.label;
    button.addEventListener('click', function (event) {
      if (kind === 'cancel' && !isDismissible(r)) return;
      if (typeof action.onClick === 'function') action.onClick(event);
      if (kind === 'action' && event.defaultPrevented) return;
      deleteToast(r);
      if (action.url) window.location.href = action.url;
    });
    return button;
  }

  function loader(visible) {
    var wrapper = el('div', { class: 'sonner-loading-wrapper', 'data-visible': String(visible) });
    var spinner = el('div', { class: 'sonner-spinner' });
    for (var i = 0; i < 12; i++) spinner.appendChild(el('div', { class: 'sonner-loading-bar' }));
    wrapper.appendChild(spinner);
    return wrapper;
  }

  function isDismissible(r) {
    return r.toast.dismissible !== false;
  }

  function renderContent(r) {
    var t = r.toast;
    var node = r.node;
    var type = t.type;
    var closeButton = t.closeButton !== undefined && t.closeButton !== null ? t.closeButton : options.closeButton;
    var parts = r.position.split('-');

    node.className = [options.toastClassName, t.className].filter(Boolean).join(' ');
    setData(node, 'rich-colors', t.richColors !== undefined && t.richColors !== null ? t.richColors : options.richColors);
    setData(node, 'styled', true);
    setData(node, 'promise', Boolean(t.promise));
    setData(node, 'y-position', parts[0]);
    setData(node, 'x-position', parts[1]);
    setData(node, 'dismissible', isDismissible(r));
    setData(node, 'type', type);
    setData(node, 'invert', Boolean(t.invert || options.invert));
    node.innerHTML = '';

    if (closeButton && type !== 'loading') {
      var close = el('button', { 'aria-label': options.closeButtonAriaLabel, 'data-disabled': 'false', 'data-close-button': 'true' });
      close.innerHTML = ICONS.close;
      close.addEventListener('click', function () {
        if (type === 'loading' || !isDismissible(r)) return;
        deleteToast(r);
        if (typeof t.onDismiss === 'function') t.onDismiss(t);
      });
      node.appendChild(close);
    }

    if ((type || t.promise) && t.icon !== null) {
      var icon = el('div', { 'data-icon': '' });
      if (type === 'loading' || t.promise) icon.appendChild(loader(type === 'loading'));
      if (type !== 'loading' && ICONS[type]) icon.insertAdjacentHTML('beforeend', ICONS[type]);
      if (icon.childNodes.length) node.appendChild(icon);
    }

    var content = el('div', { 'data-content': '' });
    var title = el('div', { 'data-title': '' });
    title.textContent = t.title === undefined || t.title === null ? '' : String(t.title);
    content.appendChild(title);
    if (t.description) {
      var description = el('div', { 'data-description': '' });
      description.textContent = String(t.description);
      content.appendChild(description);
    }
    node.appendChild(content);

    if (t.cancel && t.cancel.label !== undefined) node.appendChild(actionButton(r, t.cancel, 'cancel'));
    if (t.action && t.action.label !== undefined) node.appendChild(actionButton(r, t.action, 'action'));
  }

  function measure(r) {
    var original = r.node.style.height;
    r.node.style.height = 'auto';
    var height = r.node.getBoundingClientRect().height;
    r.node.style.height = original;
    r.initialHeight = height;
    r.height = height;
  }

  function mount(t) {
    var r = {
      toast: t,
      position: POSITIONS.indexOf(t.position) !== -1 ? t.position : options.position,
      node: el('li', { tabindex: '0', 'data-sonner-toast': '' }),
      mounted: false,
      removed: false,
      inHeights: false,
      height: 0,
      initialHeight: 0,
      offset: 0,
      offsetBeforeRemove: 0,
      remaining: t.duration || options.duration || TOAST_LIFETIME,
      timer: null,
      startedAt: 0
    };
    ['mounted', 'swiped', 'removed', 'swiping', 'swipe-out'].forEach(function (name) { setData(r.node, name, false); });

    renderContent(r);
    bindSwipe(r);
    records.unshift(r);
    var ol = list(r.position);
    ol.insertBefore(r.node, ol.firstChild);

    measure(r);
    r.inHeights = true;
    layout(r.position);

    // Sonner flips data-mounted after the first paint so the CSS transition runs from translateY(100%).
    void r.node.offsetHeight;
    r.mounted = true;
    setData(r.node, 'mounted', true);
    layout(r.position);
    syncTimer(r);
  }

  function update(r, t) {
    var wasType = r.toast.type;
    r.toast = Object.assign({}, r.toast, t);
    renderContent(r);
    measure(r);
    layout(r.position);
    if (wasType !== r.toast.type || t.duration !== undefined) {
      clearTimer(r);
      r.remaining = r.toast.duration || options.duration || TOAST_LIFETIME;
    }
    syncTimer(r);
  }

  function clearTimer(r) {
    if (r.timer) clearTimeout(r.timer);
    r.timer = null;
  }

  // Sonner's close-timer effect: runs while the toaster is idle, pauses (keeping the remaining time) while it is
  // expanded, being pressed, or the tab is hidden.
  function syncTimer(r) {
    var t = r.toast;
    if (r.removed || t.type === 'loading' || t.duration === Infinity || r.remaining === Infinity) {
      clearTimer(r);
      return;
    }
    if (expanded || interacting || document.hidden) {
      if (r.timer) {
        clearTimer(r);
        r.remaining -= Date.now() - r.startedAt;
      }
      return;
    }
    if (r.timer) return;
    r.startedAt = Date.now();
    r.timer = setTimeout(function () {
      r.timer = null;
      if (typeof t.onAutoClose === 'function') t.onAutoClose(r.toast);
      deleteToast(r);
    }, r.remaining);
  }

  function deleteToast(r) {
    if (r.removed) return;
    r.removed = true;
    r.offsetBeforeRemove = r.offset;
    r.inHeights = false;
    clearTimer(r);
    setData(r.node, 'removed', true);
    layout(r.position);
    setTimeout(function () {
      r.node.remove();
      records.splice(records.indexOf(r), 1);
      if (records.length <= 1) expanded = false;
      layoutAll();
    }, TIME_BEFORE_UNMOUNT);
  }

  function bindSwipe(r) {
    var node = r.node;
    var swipeDirection = null;
    var pointerStart = null;
    var dragStartTime = null;
    var swipeOut = false;
    var parts = r.position.split('-');
    var directions = options.swipeDirections || parts.filter(Boolean);

    function reset() {
      setData(node, 'swiping', false);
      swipeDirection = null;
      pointerStart = null;
    }

    node.addEventListener('dragend', reset);

    node.addEventListener('pointerdown', function (event) {
      if (event.button === 2) return;
      if (r.toast.type === 'loading' || !isDismissible(r)) return;
      dragStartTime = Date.now();
      r.offsetBeforeRemove = r.offset;
      event.target.setPointerCapture && event.target.setPointerCapture(event.pointerId);
      if (event.target.tagName === 'BUTTON') return;
      setData(node, 'swiping', true);
      pointerStart = { x: event.clientX, y: event.clientY };
    });

    node.addEventListener('pointerup', function () {
      if (swipeOut || !isDismissible(r)) return;
      pointerStart = null;
      var amountX = Number(node.style.getPropertyValue('--swipe-amount-x').replace('px', '') || 0);
      var amountY = Number(node.style.getPropertyValue('--swipe-amount-y').replace('px', '') || 0);
      var timeTaken = Date.now() - (dragStartTime || Date.now());
      var amount = swipeDirection === 'x' ? amountX : amountY;
      var velocity = Math.abs(amount) / timeTaken;
      var allowed = swipeDirection === 'x'
        ? directions.indexOf(amountX > 0 ? 'right' : 'left') !== -1
        : directions.indexOf(amountY > 0 ? 'bottom' : 'top') !== -1;

      if (swipeDirection && allowed && (Math.abs(amount) >= SWIPE_THRESHOLD || velocity > 0.11)) {
        r.offsetBeforeRemove = r.offset;
        if (typeof r.toast.onDismiss === 'function') r.toast.onDismiss(r.toast);
        setData(node, 'swipe-direction', swipeDirection === 'x' ? (amountX > 0 ? 'right' : 'left') : (amountY > 0 ? 'down' : 'up'));
        deleteToast(r);
        swipeOut = true;
        setData(node, 'swipe-out', true);
        return;
      }
      node.style.setProperty('--swipe-amount-x', '0px');
      node.style.setProperty('--swipe-amount-y', '0px');
      setData(node, 'swiped', false);
      reset();
    });

    node.addEventListener('pointermove', function (event) {
      if (!pointerStart || !isDismissible(r)) return;
      var selection = window.getSelection();
      if (selection && selection.toString().length > 0) return;
      var yDelta = event.clientY - pointerStart.y;
      var xDelta = event.clientX - pointerStart.x;
      if (!swipeDirection && (Math.abs(xDelta) > 1 || Math.abs(yDelta) > 1)) {
        swipeDirection = Math.abs(xDelta) > Math.abs(yDelta) ? 'x' : 'y';
      }
      var amount = { x: 0, y: 0 };
      function dampen(delta) {
        var damped = delta * (1 / (1.5 + Math.abs(delta) / 20));
        return Math.abs(damped) < Math.abs(delta) ? damped : delta;
      }
      if (swipeDirection === 'y' && (directions.indexOf('top') !== -1 || directions.indexOf('bottom') !== -1)) {
        amount.y = (directions.indexOf('top') !== -1 && yDelta < 0) || (directions.indexOf('bottom') !== -1 && yDelta > 0) ? yDelta : dampen(yDelta);
      } else if (swipeDirection === 'x' && (directions.indexOf('left') !== -1 || directions.indexOf('right') !== -1)) {
        amount.x = (directions.indexOf('left') !== -1 && xDelta < 0) || (directions.indexOf('right') !== -1 && xDelta > 0) ? xDelta : dampen(xDelta);
      }
      if (Math.abs(amount.x) > 0 || Math.abs(amount.y) > 0) setData(node, 'swiped', true);
      node.style.setProperty('--swipe-amount-x', amount.x + 'px');
      node.style.setProperty('--swipe-amount-y', amount.y + 'px');
    });
  }

  // ---- toast() API, same shape as Sonner's -----------------------------------------------------------------

  function normalize(data) {
    var t = Object.assign({}, data || {});
    if (t.message !== undefined && t.title === undefined) t.title = t.message;
    delete t.message;
    if (t.type === 'default' || t.type === 'normal' || t.type === null) delete t.type;
    if (t.persistent) t.duration = Infinity;
    if (t.duration === null) delete t.duration;
    return t;
  }

  function create(data) {
    var t = normalize(data);
    var id = t.id !== undefined && t.id !== null && t.id !== '' ? t.id : counter++;
    t.id = id;
    var existing = find(id);
    if (existing && !existing.removed) update(existing, t);
    else if (ready()) mount(t);
    else pending.push(t);
    return id;
  }

  function find(id) {
    for (var i = 0; i < records.length; i++) if (records[i].toast.id === id) return records[i];
    return null;
  }

  function dismiss(id) {
    records.slice().forEach(function (r) {
      if (id === undefined || r.toast.id === id) {
        deleteToast(r);
        if (typeof r.toast.onDismiss === 'function') r.toast.onDismiss(r.toast);
      }
    });
    return id;
  }

  function typed(type) {
    return function (message, data) {
      return create(Object.assign({}, data, { type: type, title: message }));
    };
  }

  function isHttpResponse(data) {
    return data && typeof data === 'object' && typeof data.ok === 'boolean' && typeof data.status === 'number';
  }

  function promise(p, data) {
    if (!data) return undefined;
    var id;
    if (data.loading !== undefined) {
      id = create(Object.assign({}, data, {
        promise: true,
        type: 'loading',
        title: data.loading,
        description: typeof data.description !== 'function' ? data.description : undefined
      }));
    }
    var shouldDismiss = id !== undefined;

    function settle(type, handler, value) {
      shouldDismiss = false;
      return Promise.resolve(typeof handler === 'function' ? handler(value) : handler).then(function (result) {
        var description = typeof data.description === 'function' ? data.description(value) : data.description;
        var settings = result && typeof result === 'object' && 'message' in result ? result : { message: result };
        create(Object.assign({ id: id, type: type, description: description, promise: true }, settings));
      });
    }

    var original = typeof p === 'function' ? p() : p;
    var result;
    original.then(function (response) {
      result = ['resolve', response];
      if (isHttpResponse(response) && !response.ok) {
        return data.error !== undefined ? settle('error', data.error, 'HTTP error! status: ' + response.status) : undefined;
      }
      return data.success !== undefined ? settle('success', data.success, response) : undefined;
    }).catch(function (error) {
      result = ['reject', error];
      return data.error !== undefined ? settle('error', data.error, error) : undefined;
    }).finally(function () {
      if (shouldDismiss) dismiss(id);
      if (typeof data.finally === 'function') data.finally();
    });

    var unwrap = function () {
      return new Promise(function (resolve, reject) {
        original.then(function () { return result[0] === 'reject' ? reject(result[1]) : resolve(result[1]); }).catch(reject);
      });
    };
    return { id: id, unwrap: unwrap };
  }

  var toast = function (message, data) {
    return create(Object.assign({}, data, { title: message }));
  };
  toast.message = toast;
  toast.success = typed('success');
  toast.info = typed('info');
  toast.warning = typed('warning');
  toast.error = typed('error');
  toast.loading = typed('loading');
  toast.promise = promise;
  toast.dismiss = dismiss;
  toast.getToasts = function () {
    return records.filter(function (r) { return !r.removed; }).map(function (r) { return r.toast; });
  };

  // ---- Boot: server config, flashed toasts, Livewire / Alpine events ----------------------------------------

  var pending = [];

  function ready() {
    return Boolean(section && section.isConnected);
  }

  function readConfig() {
    var nodes = document.querySelectorAll('script[data-sonner-config]');
    var config = {};
    if (nodes.length) {
      try { config = JSON.parse(nodes[nodes.length - 1].textContent || '{}'); } catch (e) { config = {}; }
    }
    options = Object.assign({
      position: 'bottom-right',
      theme: 'light',
      richColors: false,
      expand: false,
      closeButton: false,
      duration: TOAST_LIFETIME,
      visibleToasts: VISIBLE_TOASTS_AMOUNT,
      gap: GAP,
      offset: null,
      mobileOffset: null,
      dir: 'auto',
      invert: false,
      hotkey: ['altKey', 'KeyT'],
      containerAriaLabel: 'Notifications',
      closeButtonAriaLabel: 'Close toast',
      className: '',
      toastClassName: '',
      swipeDirections: null
    }, config);
    actualTheme = resolveTheme();
    for (var position in lists) lists[position].setAttribute('data-sonner-theme', actualTheme);
  }

  function flushQueue() {
    var nodes = document.querySelectorAll('script[data-sonner-toasts]:not([data-sonner-read])');
    Array.prototype.forEach.call(nodes, function (node) {
      node.setAttribute('data-sonner-read', '');
      var queue = [];
      try { queue = JSON.parse(node.textContent || '[]'); } catch (e) { queue = []; }
      queue.forEach(create);
    });
  }

  function boot() {
    if (!document.body) return;
    readConfig();
    if (options.global !== false && window.toast === undefined) window.toast = toast;
    mountSection();
    var queued = pending;
    pending = [];
    queued.forEach(create);
    flushQueue();
  }

  function fromEvent(event) {
    var detail = event.detail;
    if (Array.isArray(detail)) detail = detail[0]; // Livewire 2 style positional params
    if (!detail) return;
    if (Array.isArray(detail.toasts)) detail.toasts.forEach(create);
    else create(detail);
  }

  document.addEventListener('keydown', function (event) {
    var hotkey = options.hotkey || [];
    var pressed = hotkey.length > 0 && hotkey.every(function (key) { return event[key] || event.code === key; });
    var first = section && section.querySelector('ol');
    if (pressed && first) {
      setExpanded(true);
      first.focus();
    }
    if (event.code === 'Escape' && section && (section.contains(document.activeElement))) setExpanded(false);
  });

  document.addEventListener('visibilitychange', function () { records.forEach(syncTimer); });

  if (window.matchMedia) {
    var media = window.matchMedia('(prefers-color-scheme: dark)');
    var onScheme = function () {
      if (options.theme !== 'system') return;
      actualTheme = resolveTheme();
      for (var position in lists) lists[position].setAttribute('data-sonner-theme', actualTheme);
    };
    media.addEventListener ? media.addEventListener('change', onScheme) : media.addListener(onScheme);
  }

  window.addEventListener('sonner:toast', fromEvent);
  document.addEventListener('livewire:navigated', boot);

  window.LaravelSonner = { boot: boot, toast: toast, version: '2.0.8' };
  window.Sonner = toast;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
