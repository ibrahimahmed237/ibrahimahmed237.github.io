/*
 * Tiny renderer for the portfolio template.
 * The page is written as a template with {{holes}}, <sc-for> and <sc-if>,
 * plus one Component class. This file renders it and keeps the DOM in sync
 * with morphdom, so running animations are not restarted on each update.
 */
(function () {
  'use strict';

  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
  var HTML_NS = 'http://www.w3.org/1999/xhtml';

  function lookup(path, scopes) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    if (/^'.*'$|^".*"$/.test(path)) return path.slice(1, -1);
    var parts = path.split('.');
    for (var i = scopes.length - 1; i >= 0; i--) {
      var sc = scopes[i];
      if (sc && Object.prototype.hasOwnProperty.call(sc, parts[0])) {
        var v = sc[parts[0]];
        for (var j = 1; j < parts.length; j++) {
          if (v == null) return undefined;
          v = v[parts[j]];
        }
        return v;
      }
    }
    return undefined;
  }

  function interp(str, scopes) {
    return str.replace(HOLE, function (_, p) {
      var v = lookup(p, scopes);
      return v == null ? '' : String(v);
    });
  }

  function unwrap(attr) {
    var m = (attr || '').match(WHOLE);
    return m ? m[1] : (attr || '');
  }

  var handlers = {};
  var hid = 0;

  function renderNode(node, scopes, out) {
    if (node.nodeType === 3) {
      var t = node.nodeValue;
      out.appendChild(document.createTextNode(t.indexOf('{{') >= 0 ? interp(t, scopes) : t));
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.localName;

    if (tag === 'sc-for') {
      var list = lookup(unwrap(node.getAttribute('list')), scopes) || [];
      var as = node.getAttribute('as') || 'item';
      list.forEach(function (item, i) {
        var sc = {};
        sc[as] = item;
        sc.$index = i;
        var next = scopes.concat([sc]);
        node.childNodes.forEach(function (c) { renderNode(c, next, out); });
      });
      return;
    }
    if (tag === 'sc-if') {
      if (lookup(unwrap(node.getAttribute('value')), scopes)) {
        node.childNodes.forEach(function (c) { renderNode(c, scopes, out); });
      }
      return;
    }

    var el = node.namespaceURI && node.namespaceURI !== HTML_NS
      ? document.createElementNS(node.namespaceURI, node.tagName)
      : document.createElement(tag);

    Array.prototype.forEach.call(node.attributes, function (a) {
      var name = a.name;
      var val = a.value;
      if (name.indexOf('hint-') === 0) return;
      if (/^on[a-z]+$/.test(name)) {
        var m = val.match(WHOLE);
        if (m) {
          var fn = lookup(m[1], scopes);
          if (typeof fn === 'function') {
            var id = String(++hid);
            handlers[id] = fn;
            el.setAttribute('data-h-' + name.slice(2), id);
          }
        }
        return;
      }
      var v = val.indexOf('{{') >= 0 ? interp(val, scopes) : val;
      if (a.namespaceURI) el.setAttributeNS(a.namespaceURI, name, v);
      else el.setAttribute(name, v);
    });

    node.childNodes.forEach(function (c) { renderNode(c, scopes, el); });
    out.appendChild(el);
  }

  var dc = {
    pending: false,
    cbs: [],
    handlers: {},
    lastTheme: null,

    schedule: function (cb) {
      var self = this;
      if (cb) this.cbs.push(cb);
      if (this.pending) return;
      this.pending = true;
      Promise.resolve().then(function () {
        self.pending = false;
        self.render();
        var c = self.cbs;
        self.cbs = [];
        c.forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
      });
    },

    render: function () {
      handlers = {};
      hid = 0;
      var vals = this.comp.renderVals();
      var root = document.createElement('div');
      root.id = 'app';
      this.tpl.content.childNodes.forEach(function (c) { renderNode(c, [vals], root); });
      this.handlers = handlers;
      window.morphdom(this.app, root, {
        onBeforeElUpdated: function (from, to) { return !from.isEqualNode(to); }
      });
      this.afterRender();
    },

    afterRender: function () {
      var theme = this.comp.state.theme;
      if (theme && theme !== this.lastTheme) {
        this.lastTheme = theme;
        try { localStorage.setItem('theme', theme); } catch (e) {}
      }
      var pf = this.app.querySelector('.pf');
      if (pf) {
        var bg = getComputedStyle(pf).getPropertyValue('--bg').trim();
        if (bg) {
          document.body.style.background = bg;
          var meta = document.querySelector('meta[name="theme-color"]');
          if (meta) meta.setAttribute('content', bg);
        }
        document.documentElement.style.colorScheme = pf.classList.contains('theme-light') ? 'light' : 'dark';
      }
    },

    boot: function (Component, props) {
      var self = this;
      this.tpl = document.getElementById('tpl');
      this.app = document.getElementById('app');
      var c = new Component(props);
      this.comp = c;
      try {
        var saved = localStorage.getItem('theme');
        if (saved === 'dark' || saved === 'light') c.state.theme = saved;
      } catch (e) {}
      document.addEventListener('click', function (e) {
        var n = e.target;
        while (n && n !== document) {
          if (n.getAttribute && n.hasAttribute('data-h-click')) {
            var fn = self.handlers[n.getAttribute('data-h-click')];
            if (fn) fn(e);
            return;
          }
          n = n.parentNode;
        }
      });
      this.render();
      if (typeof c.componentDidMount === 'function') c.componentDidMount();
    }
  };

  function DCLogic(props) {
    this.props = props || {};
    this.state = {};
  }
  DCLogic.prototype.setState = function (partial, cb) {
    var next = typeof partial === 'function' ? partial(this.state, this.props) : partial;
    Object.assign(this.state, next);
    dc.schedule(cb);
  };
  DCLogic.prototype.forceUpdate = function (cb) { dc.schedule(cb); };

  window.DCLogic = DCLogic;
  window.__dc = dc;
})();
