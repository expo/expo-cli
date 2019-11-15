#!/usr/bin/env node
module.exports = (function(e, t) {
  'use strict';
  var r = {};
  function __webpack_require__(t) {
    if (r[t]) {
      return r[t].exports;
    }
    var n = (r[t] = { i: t, l: false, exports: {} });
    e[t].call(n.exports, n, n.exports, __webpack_require__);
    n.l = true;
    return n.exports;
  }
  __webpack_require__.ab = __dirname + '/';
  function startup() {
    return __webpack_require__(178);
  }
  t(__webpack_require__);
  return startup();
})(
  [
    ,
    function(e, t, r) {
      var n = r(959);
      var u = 1 / 0;
      function toKey(e) {
        if (typeof e == 'string' || n(e)) {
          return e;
        }
        var t = e + '';
        return t == '0' && 1 / e == -u ? '-0' : t;
      }
      e.exports = toKey;
    },
    function(e, t, r) {
      var n = r(229);
      var u = Object.prototype.toString;
      e.exports = function kindOf(e) {
        if (typeof e === 'undefined') {
          return 'undefined';
        }
        if (e === null) {
          return 'null';
        }
        if (e === true || e === false || e instanceof Boolean) {
          return 'boolean';
        }
        if (typeof e === 'string' || e instanceof String) {
          return 'string';
        }
        if (typeof e === 'number' || e instanceof Number) {
          return 'number';
        }
        if (typeof e === 'function' || e instanceof Function) {
          return 'function';
        }
        if (typeof Array.isArray !== 'undefined' && Array.isArray(e)) {
          return 'array';
        }
        if (e instanceof RegExp) {
          return 'regexp';
        }
        if (e instanceof Date) {
          return 'date';
        }
        var t = u.call(e);
        if (t === '[object RegExp]') {
          return 'regexp';
        }
        if (t === '[object Date]') {
          return 'date';
        }
        if (t === '[object Arguments]') {
          return 'arguments';
        }
        if (t === '[object Error]') {
          return 'error';
        }
        if (n(e)) {
          return 'buffer';
        }
        if (t === '[object Set]') {
          return 'set';
        }
        if (t === '[object WeakSet]') {
          return 'weakset';
        }
        if (t === '[object Map]') {
          return 'map';
        }
        if (t === '[object WeakMap]') {
          return 'weakmap';
        }
        if (t === '[object Symbol]') {
          return 'symbol';
        }
        if (t === '[object Int8Array]') {
          return 'int8array';
        }
        if (t === '[object Uint8Array]') {
          return 'uint8array';
        }
        if (t === '[object Uint8ClampedArray]') {
          return 'uint8clampedarray';
        }
        if (t === '[object Int16Array]') {
          return 'int16array';
        }
        if (t === '[object Uint16Array]') {
          return 'uint16array';
        }
        if (t === '[object Int32Array]') {
          return 'int32array';
        }
        if (t === '[object Uint32Array]') {
          return 'uint32array';
        }
        if (t === '[object Float32Array]') {
          return 'float32array';
        }
        if (t === '[object Float64Array]') {
          return 'float64array';
        }
        return 'object';
      };
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(729);
      const u = r(622);
      const i = r(467);
      const o = r(946);
      function outputJsonSync(e, t, r) {
        const a = u.dirname(e);
        if (!n.existsSync(a)) {
          i.mkdirsSync(a);
        }
        o.writeJsonSync(e, t, r);
      }
      e.exports = outputJsonSync;
    },
    ,
    function(e, t, r) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var n =
        typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol'
          ? function(e) {
              return typeof e;
            }
          : function(e) {
              return e &&
                typeof Symbol === 'function' &&
                e.constructor === Symbol &&
                e !== Symbol.prototype
                ? 'symbol'
                : typeof e;
            };
      t.default = stringify;
      var u = r(455);
      var i = _interopRequireWildcard(u);
      function _interopRequireWildcard(e) {
        if (e && e.__esModule) {
          return e;
        } else {
          var t = {};
          if (e != null) {
            for (var r in e) {
              if (Object.prototype.hasOwnProperty.call(e, r)) t[r] = e[r];
            }
          }
          t.default = e;
          return t;
        }
      }
      function stringify(e, t, r) {
        var u = [];
        var o = '';
        var a = void 0;
        var s = void 0;
        var c = '';
        var f = void 0;
        if (
          t != null &&
          (typeof t === 'undefined' ? 'undefined' : n(t)) === 'object' &&
          !Array.isArray(t)
        ) {
          r = t.space;
          f = t.quote;
          t = t.replacer;
        }
        if (typeof t === 'function') {
          s = t;
        } else if (Array.isArray(t)) {
          a = [];
          var l = true;
          var p = false;
          var h = undefined;
          try {
            for (var d = t[Symbol.iterator](), y; !(l = (y = d.next()).done); l = true) {
              var v = y.value;
              var D = void 0;
              if (typeof v === 'string') {
                D = v;
              } else if (typeof v === 'number' || v instanceof String || v instanceof Number) {
                D = String(v);
              }
              if (D !== undefined && a.indexOf(D) < 0) {
                a.push(D);
              }
            }
          } catch (e) {
            p = true;
            h = e;
          } finally {
            try {
              if (!l && d.return) {
                d.return();
              }
            } finally {
              if (p) {
                throw h;
              }
            }
          }
        }
        if (r instanceof Number) {
          r = Number(r);
        } else if (r instanceof String) {
          r = String(r);
        }
        if (typeof r === 'number') {
          if (r > 0) {
            r = Math.min(10, Math.floor(r));
            c = '          '.substr(0, r);
          }
        } else if (typeof r === 'string') {
          c = r.substr(0, 10);
        }
        return serializeProperty('', { '': e });
        function serializeProperty(e, t) {
          var r = t[e];
          if (r != null) {
            if (typeof r.toJSON5 === 'function') {
              r = r.toJSON5(e);
            } else if (typeof r.toJSON === 'function') {
              r = r.toJSON(e);
            }
          }
          if (s) {
            r = s.call(t, e, r);
          }
          if (r instanceof Number) {
            r = Number(r);
          } else if (r instanceof String) {
            r = String(r);
          } else if (r instanceof Boolean) {
            r = r.valueOf();
          }
          switch (r) {
            case null:
              return 'null';
            case true:
              return 'true';
            case false:
              return 'false';
          }
          if (typeof r === 'string') {
            return quoteString(r, false);
          }
          if (typeof r === 'number') {
            return String(r);
          }
          if ((typeof r === 'undefined' ? 'undefined' : n(r)) === 'object') {
            return Array.isArray(r) ? serializeArray(r) : serializeObject(r);
          }
          return undefined;
        }
        function quoteString(e) {
          var t = { "'": 0.1, '"': 0.2 };
          var r = {
            "'": "\\'",
            '"': '\\"',
            '\\': '\\\\',
            '\b': '\\b',
            '\f': '\\f',
            '\n': '\\n',
            '\r': '\\r',
            '\t': '\\t',
            '\v': '\\v',
            '\0': '\\0',
            '\u2028': '\\u2028',
            '\u2029': '\\u2029',
          };
          var n = '';
          var u = true;
          var i = false;
          var o = undefined;
          try {
            for (var a = e[Symbol.iterator](), s; !(u = (s = a.next()).done); u = true) {
              var c = s.value;
              switch (c) {
                case "'":
                case '"':
                  t[c]++;
                  n += c;
                  continue;
              }
              if (r[c]) {
                n += r[c];
                continue;
              }
              if (c < ' ') {
                var l = c.charCodeAt(0).toString(16);
                n += '\\x' + ('00' + l).substring(l.length);
                continue;
              }
              n += c;
            }
          } catch (e) {
            i = true;
            o = e;
          } finally {
            try {
              if (!u && a.return) {
                a.return();
              }
            } finally {
              if (i) {
                throw o;
              }
            }
          }
          var p =
            f ||
            Object.keys(t).reduce(function(e, r) {
              return t[e] < t[r] ? e : r;
            });
          n = n.replace(new RegExp(p, 'g'), r[p]);
          return p + n + p;
        }
        function serializeObject(e) {
          if (u.indexOf(e) >= 0) {
            throw TypeError('Converting circular structure to JSON5');
          }
          u.push(e);
          var t = o;
          o = o + c;
          var r = a || Object.keys(e);
          var n = [];
          var i = true;
          var s = false;
          var f = undefined;
          try {
            for (var l = r[Symbol.iterator](), p; !(i = (p = l.next()).done); i = true) {
              var h = p.value;
              var d = serializeProperty(h, e);
              if (d !== undefined) {
                var y = serializeKey(h) + ':';
                if (c !== '') {
                  y += ' ';
                }
                y += d;
                n.push(y);
              }
            }
          } catch (e) {
            s = true;
            f = e;
          } finally {
            try {
              if (!i && l.return) {
                l.return();
              }
            } finally {
              if (s) {
                throw f;
              }
            }
          }
          var v = void 0;
          if (n.length === 0) {
            v = '{}';
          } else {
            var D = void 0;
            if (c === '') {
              D = n.join(',');
              v = '{' + D + '}';
            } else {
              var m = ',\n' + o;
              D = n.join(m);
              v = '{\n' + o + D + ',\n' + t + '}';
            }
          }
          u.pop();
          o = t;
          return v;
        }
        function serializeKey(e) {
          if (e.length === 0) {
            return quoteString(e, true);
          }
          var t = String.fromCodePoint(e.codePointAt(0));
          if (!i.isIdStartChar(t)) {
            return quoteString(e, true);
          }
          for (var r = t.length; r < e.length; r++) {
            if (!i.isIdContinueChar(String.fromCodePoint(e.codePointAt(r)))) {
              return quoteString(e, true);
            }
          }
          return e;
        }
        function serializeArray(e) {
          if (u.indexOf(e) >= 0) {
            throw TypeError('Converting circular structure to JSON5');
          }
          u.push(e);
          var t = o;
          o = o + c;
          var r = [];
          for (var n = 0; n < e.length; n++) {
            var i = serializeProperty(String(n), e);
            r.push(i !== undefined ? i : 'null');
          }
          var a = void 0;
          if (r.length === 0) {
            a = '[]';
          } else {
            if (c === '') {
              var s = r.join(',');
              a = '[' + s + ']';
            } else {
              var f = ',\n' + o;
              var l = r.join(f);
              a = '[\n' + o + l + ',\n' + t + ']';
            }
          }
          u.pop();
          o = t;
          return a;
        }
      }
      e.exports = t['default'];
    },
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n = r(647);
      var u = r(785);
      var i = r(893)('snapdragon:compiler');
      var o = r(324);
      function Compiler(e, t) {
        i('initializing', __filename);
        this.options = o.extend({ source: 'string' }, e);
        this.state = t || {};
        this.compilers = {};
        this.output = '';
        this.set('eos', function(e) {
          return this.emit(e.val, e);
        });
        this.set('noop', function(e) {
          return this.emit(e.val, e);
        });
        this.set('bos', function(e) {
          return this.emit(e.val, e);
        });
        n(this);
      }
      Compiler.prototype = {
        error: function(e, t) {
          var r = t.position || { start: { column: 0 } };
          var n = this.options.source + ' column:' + r.start.column + ': ' + e;
          var u = new Error(n);
          u.reason = e;
          u.column = r.start.column;
          u.source = this.pattern;
          if (this.options.silent) {
            this.errors.push(u);
          } else {
            throw u;
          }
        },
        define: function(e, t) {
          u(this, e, t);
          return this;
        },
        emit: function(e, t) {
          this.output += e;
          return e;
        },
        set: function(e, t) {
          this.compilers[e] = t;
          return this;
        },
        get: function(e) {
          return this.compilers[e];
        },
        prev: function(e) {
          return this.ast.nodes[this.idx - (e || 1)] || { type: 'bos', val: '' };
        },
        next: function(e) {
          return this.ast.nodes[this.idx + (e || 1)] || { type: 'eos', val: '' };
        },
        visit: function(e, t, r) {
          var n = this.compilers[e.type];
          this.idx = r;
          if (typeof n !== 'function') {
            throw this.error('compiler "' + e.type + '" is not registered', e);
          }
          return n.call(this, e, t, r);
        },
        mapVisit: function(e) {
          if (!Array.isArray(e)) {
            throw new TypeError('expected an array');
          }
          var t = e.length;
          var r = -1;
          while (++r < t) {
            this.visit(e[r], e, r);
          }
          return this;
        },
        compile: function(e, t) {
          var n = o.extend({}, this.options, t);
          this.ast = e;
          this.parsingErrors = this.ast.errors;
          this.output = '';
          if (n.sourcemap) {
            var u = r(632);
            u(this);
            this.mapVisit(this.ast.nodes);
            this.applySourceMaps();
            this.map = n.sourcemap === 'generator' ? this.map : this.map.toJSON();
            return this;
          }
          this.mapVisit(this.ast.nodes);
          return this;
        },
      };
      e.exports = Compiler;
    },
    ,
    ,
    function(e) {
      'use strict';
      e.exports = function(e, t) {
        if (e === null || typeof e === 'undefined') {
          throw new TypeError('expected first argument to be an object.');
        }
        if (typeof t === 'undefined' || typeof Symbol === 'undefined') {
          return e;
        }
        if (typeof Object.getOwnPropertySymbols !== 'function') {
          return e;
        }
        var r = Object.prototype.propertyIsEnumerable;
        var n = Object(e);
        var u = arguments.length,
          i = 0;
        while (++i < u) {
          var o = Object(arguments[i]);
          var a = Object.getOwnPropertySymbols(o);
          for (var s = 0; s < a.length; s++) {
            var c = a[s];
            if (r.call(o, c)) {
              n[c] = o[c];
            }
          }
        }
        return n;
      };
    },
    function(e, t, r) {
      'use strict';
      var n = r(477);
      e.exports = function isObject(e) {
        return e != null && typeof e === 'object' && n(e) === false;
      };
    },
    ,
    ,
    function(e) {
      'use strict';
      e.exports = function isExtendable(e) {
        return (
          typeof e !== 'undefined' &&
          e !== null &&
          (typeof e === 'object' || typeof e === 'function')
        );
      };
    },
    ,
    ,
    ,
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n =
        (this && this.__awaiter) ||
        function(e, t, r, n) {
          function adopt(e) {
            return e instanceof r
              ? e
              : new r(function(t) {
                  t(e);
                });
          }
          return new (r || (r = Promise))(function(r, u) {
            function fulfilled(e) {
              try {
                step(n.next(e));
              } catch (e) {
                u(e);
              }
            }
            function rejected(e) {
              try {
                step(n['throw'](e));
              } catch (e) {
                u(e);
              }
            }
            function step(e) {
              e.done ? r(e.value) : adopt(e.value).then(fulfilled, rejected);
            }
            step((n = n.apply(e, t || [])).next());
          });
        };
      var u =
        (this && this.__importDefault) ||
        function(e) {
          return e && e.__esModule ? e : { default: e };
        };
      Object.defineProperty(t, '__esModule', { value: true });
      const i = r(673);
      const o = r(972);
      const a = u(r(676));
      const s = u(r(313));
      const c = u(r(373));
      const f = r(816);
      const l = u(r(649));
      const p = r(622);
      const h = u(r(394));
      const d = u(r(307));
      function fileExists(e) {
        try {
          return f.statSync(e).isFile();
        } catch (e) {
          return false;
        }
      }
      function readAssetJsonAsync(e) {
        return n(this, void 0, void 0, function*() {
          const t = p.join(e, '.expo-shared');
          f.ensureDirSync(t);
          const r = new a.default(p.join(t, 'assets.json'));
          if (!fileExists(r.file)) {
            console.log(
              `Creating ${s.default.italic(
                '.expo-shared/assets.json'
              )} in the project's root directory.`
            );
            console.log(`This file is autogenerated and should not be edited directly.`);
            console.log(
              `You should commit this to git so that asset state is shared between collaborators.`
            );
            yield r.writeAsync({});
          }
          const n = yield r.readAsync();
          return { assetJson: r, assetInfo: n };
        });
      }
      function optimizeImageAsync(e, t) {
        return n(this, void 0, void 0, function*() {
          console.log(`Optimizing ${e}`);
          const r = d.default.directory();
          yield o.sharpAsync({ input: e, output: r, quality: t });
          return p.join(r, p.basename(e));
        });
      }
      function createNewFilename(e) {
        const { dir: t, name: r, ext: n } = p.parse(e);
        return p.join(t, `${r}.orig${n}`);
      }
      function getAssetFilesAsync(e, t) {
        return n(this, void 0, void 0, function*() {
          const { exp: r } = yield i.readConfigJsonAsync(e, true, true);
          const n = yield i.getWebOutputPath(r);
          const { assetBundlePatterns: u } = r;
          const o = {
            cwd: e,
            ignore: ['**/node_modules/**', '**/ios/**', '**/android/**', `**/${n}/**`],
          };
          const a = [];
          const s = u || ['**/*'];
          s.forEach(e => {
            a.push(...l.default.sync(e, o));
          });
          const c = t && t.include ? [...l.default.sync(t.include, o)] : a;
          const f = new Set();
          if (t && t.exclude) {
            l.default.sync(t.exclude, o).forEach(e => f.add(e));
          }
          const p = c.filter(e => !f.has(e));
          const h = t && t.exclude ? p : c;
          return { allFiles: filterImages(a, e), selectedFiles: filterImages(h, e) };
        });
      }
      function filterImages(e, t) {
        const r = /\.(png|jpg|jpeg)$/;
        const n = e.map(e => `${t}/${e}`.replace('//', '/'));
        const u = n.filter(e => r.test(e.toLowerCase()));
        return u;
      }
      function calculateHash(e) {
        const t = f.readFileSync(e);
        return c.default
          .createHash('sha256')
          .update(t)
          .digest('hex');
      }
      function isProjectOptimized(e, t) {
        return n(this, void 0, void 0, function*() {
          if (!fileExists(p.join(e, '.expo-shared/assets.json'))) {
            return false;
          }
          const { selectedFiles: r } = yield getAssetFilesAsync(e, t);
          const { assetInfo: n } = yield readAssetJsonAsync(e);
          for (const e of r) {
            const t = calculateHash(e);
            if (!n[t]) {
              return false;
            }
          }
          return true;
        });
      }
      t.isProjectOptimized = isProjectOptimized;
      function optimizeAsync(e = './', t = {}) {
        return n(this, void 0, void 0, function*() {
          console.log(s.default.green('Optimizing assets...'));
          const { assetJson: r, assetInfo: n } = yield readAssetJsonAsync(e);
          const u = new Set();
          for (const e in n) u.add(e);
          let i = 0;
          const { allFiles: o, selectedFiles: a } = yield getAssetFilesAsync(e, t);
          const c = {};
          o.forEach(e => {
            const t = calculateHash(e);
            if (n[t]) {
              u.delete(t);
            }
            c[e] = t;
          });
          u.forEach(e => {
            delete n[e];
          });
          const { include: l, exclude: p, save: d } = t;
          const y = t.quality == null ? 80 : t.quality;
          const v = l || p ? a : o;
          for (const e of v) {
            const t = c[e];
            if (n[t]) {
              continue;
            }
            const { size: r } = f.statSync(e);
            const u = createNewFilename(e);
            const o = yield optimizeImageAsync(e, y);
            const { size: a } = f.statSync(o);
            const l = r - a;
            if (l > 0) {
              yield f.move(e, u);
              yield f.move(o, e);
            } else {
              n[t] = true;
              console.log(
                s.default.gray(
                  l === 0
                    ? `Compressed version of ${e} same size as original. Using original instead.`
                    : `Compressed version of ${e} was larger than original. Using original instead.`
                )
              );
              continue;
            }
            const p = calculateHash(e);
            n[p] = true;
            if (d) {
              if (t === p) {
                console.log(
                  s.default.gray(
                    `Compressed asset ${e} is identical to the original. Using original instead.`
                  )
                );
                f.unlinkSync(u);
              } else {
                console.log(s.default.gray(`Saving original asset to ${u}`));
                n[t] = true;
              }
            } else {
              f.unlinkSync(u);
            }
            if (l) {
              i += l;
              console.log(`Saved ${h.default(l)}`);
            } else {
              console.log(s.default.gray(`Nothing to compress.`));
            }
          }
          if (i === 0) {
            console.log('No assets optimized. Everything is fully compressed!');
          } else {
            console.log(`Finished compressing assets. ${s.default.green(h.default(i))} saved.`);
          }
          r.writeAsync(n);
        });
      }
      t.optimizeAsync = optimizeAsync;
    },
    ,
    ,
    function(e, t) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r = (t.Space_Separator = /[\u1680\u2000-\u200A\u202F\u205F\u3000]/);
      var n = (t.ID_Start = /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B4\u08B6-\u08BD\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDF00-\uDF19]|\uD806[\uDCA0-\uDCDF\uDCFF\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC72-\uDC8F]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50\uDF93-\uDF9F\uDFE0]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDC00-\uDCC4\uDD00-\uDD43]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1]|\uD87E[\uDC00-\uDE1D]/);
      var u = (t.ID_Continue = /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0-\u08B4\u08B6-\u08BD\u08D4-\u08E1\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C80-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D54-\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1CD0-\u1CD2\u1CD4-\u1CF6\u1CF8\u1CF9\u1D00-\u1DF5\u1DFB-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDCA-\uDDCC\uDDD0-\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE37\uDE3E\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC00-\uDC4A\uDC50-\uDC59\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDDD8-\uDDDD\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB7\uDEC0-\uDEC9\uDF00-\uDF19\uDF1D-\uDF2B\uDF30-\uDF39]|\uD806[\uDCA0-\uDCE9\uDCFF\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC36\uDC38-\uDC40\uDC50-\uDC59\uDC72-\uDC8F\uDC92-\uDCA7\uDCA9-\uDCB6]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50-\uDF7E\uDF8F-\uDF9F\uDFE0]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6\uDD00-\uDD4A\uDD50-\uDD59]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF]/);
    },
    function(e, t, r) {
      var n = r(173),
        u = r(95),
        i = r(683),
        o = r(219),
        a = r(103);
      function MapCache(e) {
        var t = -1,
          r = e == null ? 0 : e.length;
        this.clear();
        while (++t < r) {
          var n = e[t];
          this.set(n[0], n[1]);
        }
      }
      MapCache.prototype.clear = n;
      MapCache.prototype['delete'] = u;
      MapCache.prototype.get = i;
      MapCache.prototype.has = o;
      MapCache.prototype.set = a;
      e.exports = MapCache;
    },
    ,
    ,
    ,
    ,
    function(e) {
      e.exports = require('https');
    },
    function(e, t, r) {
      var n = r(702);
      function generatedPositionAfter(e, t) {
        var r = e.generatedLine;
        var u = t.generatedLine;
        var i = e.generatedColumn;
        var o = t.generatedColumn;
        return u > r || (u == r && o >= i) || n.compareByGeneratedPositionsInflated(e, t) <= 0;
      }
      function MappingList() {
        this._array = [];
        this._sorted = true;
        this._last = { generatedLine: -1, generatedColumn: 0 };
      }
      MappingList.prototype.unsortedForEach = function MappingList_forEach(e, t) {
        this._array.forEach(e, t);
      };
      MappingList.prototype.add = function MappingList_add(e) {
        if (generatedPositionAfter(this._last, e)) {
          this._last = e;
          this._array.push(e);
        } else {
          this._sorted = false;
          this._array.push(e);
        }
      };
      MappingList.prototype.toArray = function MappingList_toArray() {
        if (!this._sorted) {
          this._array.sort(n.compareByGeneratedPositionsInflated);
          this._sorted = true;
        }
        return this._array;
      };
      t.MappingList = MappingList;
    },
    function(e, t, r) {
      'use strict';
      var n = r(65);
      var u = r(192);
      var i = r(755);
      var o = r(18);
      e.exports = function(e, t, r) {
        if (!o(e)) {
          return e;
        }
        if (Array.isArray(t)) {
          t = n(t);
        }
        if (typeof t !== 'string') {
          return e;
        }
        var a = t.split('.');
        var s = a.length,
          c = -1;
        var f = e;
        var l;
        while (++c < s) {
          var p = a[c];
          while (p[p.length - 1] === '\\') {
            p = p.slice(0, -1) + '.' + a[++c];
          }
          if (c === s - 1) {
            l = p;
            break;
          }
          if (!o(e[p])) {
            e[p] = {};
          }
          e = e[p];
        }
        if (e.hasOwnProperty(l) && o(e[l])) {
          if (i(r)) {
            u(e[l], r);
          } else {
            e[l] = r;
          }
        } else {
          e[l] = r;
        }
        return f;
      };
    },
    function(e, t, r) {
      var n = r(396);
      var u = r(702);
      var i = r(991).ArraySet;
      var o = r(35).MappingList;
      function SourceMapGenerator(e) {
        if (!e) {
          e = {};
        }
        this._file = u.getArg(e, 'file', null);
        this._sourceRoot = u.getArg(e, 'sourceRoot', null);
        this._skipValidation = u.getArg(e, 'skipValidation', false);
        this._sources = new i();
        this._names = new i();
        this._mappings = new o();
        this._sourcesContents = null;
      }
      SourceMapGenerator.prototype._version = 3;
      SourceMapGenerator.fromSourceMap = function SourceMapGenerator_fromSourceMap(e) {
        var t = e.sourceRoot;
        var r = new SourceMapGenerator({ file: e.file, sourceRoot: t });
        e.eachMapping(function(e) {
          var n = { generated: { line: e.generatedLine, column: e.generatedColumn } };
          if (e.source != null) {
            n.source = e.source;
            if (t != null) {
              n.source = u.relative(t, n.source);
            }
            n.original = { line: e.originalLine, column: e.originalColumn };
            if (e.name != null) {
              n.name = e.name;
            }
          }
          r.addMapping(n);
        });
        e.sources.forEach(function(t) {
          var n = e.sourceContentFor(t);
          if (n != null) {
            r.setSourceContent(t, n);
          }
        });
        return r;
      };
      SourceMapGenerator.prototype.addMapping = function SourceMapGenerator_addMapping(e) {
        var t = u.getArg(e, 'generated');
        var r = u.getArg(e, 'original', null);
        var n = u.getArg(e, 'source', null);
        var i = u.getArg(e, 'name', null);
        if (!this._skipValidation) {
          this._validateMapping(t, r, n, i);
        }
        if (n != null) {
          n = String(n);
          if (!this._sources.has(n)) {
            this._sources.add(n);
          }
        }
        if (i != null) {
          i = String(i);
          if (!this._names.has(i)) {
            this._names.add(i);
          }
        }
        this._mappings.add({
          generatedLine: t.line,
          generatedColumn: t.column,
          originalLine: r != null && r.line,
          originalColumn: r != null && r.column,
          source: n,
          name: i,
        });
      };
      SourceMapGenerator.prototype.setSourceContent = function SourceMapGenerator_setSourceContent(
        e,
        t
      ) {
        var r = e;
        if (this._sourceRoot != null) {
          r = u.relative(this._sourceRoot, r);
        }
        if (t != null) {
          if (!this._sourcesContents) {
            this._sourcesContents = Object.create(null);
          }
          this._sourcesContents[u.toSetString(r)] = t;
        } else if (this._sourcesContents) {
          delete this._sourcesContents[u.toSetString(r)];
          if (Object.keys(this._sourcesContents).length === 0) {
            this._sourcesContents = null;
          }
        }
      };
      SourceMapGenerator.prototype.applySourceMap = function SourceMapGenerator_applySourceMap(
        e,
        t,
        r
      ) {
        var n = t;
        if (t == null) {
          if (e.file == null) {
            throw new Error(
              'SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' +
                'or the source map\'s "file" property. Both were omitted.'
            );
          }
          n = e.file;
        }
        var o = this._sourceRoot;
        if (o != null) {
          n = u.relative(o, n);
        }
        var a = new i();
        var s = new i();
        this._mappings.unsortedForEach(function(t) {
          if (t.source === n && t.originalLine != null) {
            var i = e.originalPositionFor({ line: t.originalLine, column: t.originalColumn });
            if (i.source != null) {
              t.source = i.source;
              if (r != null) {
                t.source = u.join(r, t.source);
              }
              if (o != null) {
                t.source = u.relative(o, t.source);
              }
              t.originalLine = i.line;
              t.originalColumn = i.column;
              if (i.name != null) {
                t.name = i.name;
              }
            }
          }
          var c = t.source;
          if (c != null && !a.has(c)) {
            a.add(c);
          }
          var f = t.name;
          if (f != null && !s.has(f)) {
            s.add(f);
          }
        }, this);
        this._sources = a;
        this._names = s;
        e.sources.forEach(function(t) {
          var n = e.sourceContentFor(t);
          if (n != null) {
            if (r != null) {
              t = u.join(r, t);
            }
            if (o != null) {
              t = u.relative(o, t);
            }
            this.setSourceContent(t, n);
          }
        }, this);
      };
      SourceMapGenerator.prototype._validateMapping = function SourceMapGenerator_validateMapping(
        e,
        t,
        r,
        n
      ) {
        if (t && typeof t.line !== 'number' && typeof t.column !== 'number') {
          throw new Error(
            'original.line and original.column are not numbers -- you probably meant to omit ' +
              'the original mapping entirely and only map the generated position. If so, pass ' +
              'null for the original mapping instead of an object with empty or null values.'
          );
        }
        if (e && 'line' in e && 'column' in e && e.line > 0 && e.column >= 0 && !t && !r && !n) {
          return;
        } else if (
          e &&
          'line' in e &&
          'column' in e &&
          t &&
          'line' in t &&
          'column' in t &&
          e.line > 0 &&
          e.column >= 0 &&
          t.line > 0 &&
          t.column >= 0 &&
          r
        ) {
          return;
        } else {
          throw new Error(
            'Invalid mapping: ' + JSON.stringify({ generated: e, source: r, original: t, name: n })
          );
        }
      };
      SourceMapGenerator.prototype._serializeMappings = function SourceMapGenerator_serializeMappings() {
        var e = 0;
        var t = 1;
        var r = 0;
        var i = 0;
        var o = 0;
        var a = 0;
        var s = '';
        var c;
        var f;
        var l;
        var p;
        var h = this._mappings.toArray();
        for (var d = 0, y = h.length; d < y; d++) {
          f = h[d];
          c = '';
          if (f.generatedLine !== t) {
            e = 0;
            while (f.generatedLine !== t) {
              c += ';';
              t++;
            }
          } else {
            if (d > 0) {
              if (!u.compareByGeneratedPositionsInflated(f, h[d - 1])) {
                continue;
              }
              c += ',';
            }
          }
          c += n.encode(f.generatedColumn - e);
          e = f.generatedColumn;
          if (f.source != null) {
            p = this._sources.indexOf(f.source);
            c += n.encode(p - a);
            a = p;
            c += n.encode(f.originalLine - 1 - i);
            i = f.originalLine - 1;
            c += n.encode(f.originalColumn - r);
            r = f.originalColumn;
            if (f.name != null) {
              l = this._names.indexOf(f.name);
              c += n.encode(l - o);
              o = l;
            }
          }
          s += c;
        }
        return s;
      };
      SourceMapGenerator.prototype._generateSourcesContent = function SourceMapGenerator_generateSourcesContent(
        e,
        t
      ) {
        return e.map(function(e) {
          if (!this._sourcesContents) {
            return null;
          }
          if (t != null) {
            e = u.relative(t, e);
          }
          var r = u.toSetString(e);
          return Object.prototype.hasOwnProperty.call(this._sourcesContents, r)
            ? this._sourcesContents[r]
            : null;
        }, this);
      };
      SourceMapGenerator.prototype.toJSON = function SourceMapGenerator_toJSON() {
        var e = {
          version: this._version,
          sources: this._sources.toArray(),
          names: this._names.toArray(),
          mappings: this._serializeMappings(),
        };
        if (this._file != null) {
          e.file = this._file;
        }
        if (this._sourceRoot != null) {
          e.sourceRoot = this._sourceRoot;
        }
        if (this._sourcesContents) {
          e.sourcesContent = this._generateSourcesContent(e.sources, e.sourceRoot);
        }
        return e;
      };
      SourceMapGenerator.prototype.toString = function SourceMapGenerator_toString() {
        return JSON.stringify(this.toJSON());
      };
      t.SourceMapGenerator = SourceMapGenerator;
    },
    function(e, t, r) {
      'use strict';
      var n = r(765);
      var u = e.exports;
      u.isNode = function(e) {
        return n(e) === 'object' && e.isNode === true;
      };
      u.noop = function(e) {
        append(this, '', e);
      };
      u.identity = function(e) {
        append(this, e.val, e);
      };
      u.append = function(e) {
        return function(t) {
          append(this, e, t);
        };
      };
      u.toNoop = function(e, t) {
        if (t) {
          e.nodes = t;
        } else {
          delete e.nodes;
          e.type = 'text';
          e.val = '';
        }
      };
      u.visit = function(e, t) {
        assert(u.isNode(e), 'expected node to be an instance of Node');
        assert(isFunction(t), 'expected a visitor function');
        t(e);
        return e.nodes ? u.mapVisit(e, t) : e;
      };
      u.mapVisit = function(e, t) {
        assert(u.isNode(e), 'expected node to be an instance of Node');
        assert(isArray(e.nodes), 'expected node.nodes to be an array');
        assert(isFunction(t), 'expected a visitor function');
        for (var r = 0; r < e.nodes.length; r++) {
          u.visit(e.nodes[r], t);
        }
        return e;
      };
      u.addOpen = function(e, t, r, n) {
        assert(u.isNode(e), 'expected node to be an instance of Node');
        assert(isFunction(t), 'expected Node to be a constructor function');
        if (typeof r === 'function') {
          n = r;
          r = '';
        }
        if (typeof n === 'function' && !n(e)) return;
        var i = new t({ type: e.type + '.open', val: r });
        var o = e.unshift || e.unshiftNode;
        if (typeof o === 'function') {
          o.call(e, i);
        } else {
          u.unshiftNode(e, i);
        }
        return i;
      };
      u.addClose = function(e, t, r, n) {
        assert(u.isNode(e), 'expected node to be an instance of Node');
        assert(isFunction(t), 'expected Node to be a constructor function');
        if (typeof r === 'function') {
          n = r;
          r = '';
        }
        if (typeof n === 'function' && !n(e)) return;
        var i = new t({ type: e.type + '.close', val: r });
        var o = e.push || e.pushNode;
        if (typeof o === 'function') {
          o.call(e, i);
        } else {
          u.pushNode(e, i);
        }
        return i;
      };
      u.wrapNodes = function(e, t, r) {
        assert(u.isNode(e), 'expected node to be an instance of Node');
        assert(isFunction(t), 'expected Node to be a constructor function');
        u.addOpen(e, t, r);
        u.addClose(e, t, r);
        return e;
      };
      u.pushNode = function(e, t) {
        assert(u.isNode(e), 'expected parent node to be an instance of Node');
        assert(u.isNode(t), 'expected node to be an instance of Node');
        t.define('parent', e);
        e.nodes = e.nodes || [];
        e.nodes.push(t);
        return t;
      };
      u.unshiftNode = function(e, t) {
        assert(u.isNode(e), 'expected parent node to be an instance of Node');
        assert(u.isNode(t), 'expected node to be an instance of Node');
        t.define('parent', e);
        e.nodes = e.nodes || [];
        e.nodes.unshift(t);
      };
      u.popNode = function(e) {
        assert(u.isNode(e), 'expected node to be an instance of Node');
        if (typeof e.pop === 'function') {
          return e.pop();
        }
        return e.nodes && e.nodes.pop();
      };
      u.shiftNode = function(e) {
        assert(u.isNode(e), 'expected node to be an instance of Node');
        if (typeof e.shift === 'function') {
          return e.shift();
        }
        return e.nodes && e.nodes.shift();
      };
      u.removeNode = function(e, t) {
        assert(u.isNode(e), 'expected parent.node to be an instance of Node');
        assert(u.isNode(t), 'expected node to be an instance of Node');
        if (!e.nodes) {
          return null;
        }
        if (typeof e.remove === 'function') {
          return e.remove(t);
        }
        var r = e.nodes.indexOf(t);
        if (r !== -1) {
          return e.nodes.splice(r, 1);
        }
      };
      u.isType = function(e, t) {
        assert(u.isNode(e), 'expected node to be an instance of Node');
        switch (n(t)) {
          case 'array':
            var r = t.slice();
            for (var i = 0; i < r.length; i++) {
              if (u.isType(e, r[i])) {
                return true;
              }
            }
            return false;
          case 'string':
            return e.type === t;
          case 'regexp':
            return t.test(e.type);
          default: {
            throw new TypeError('expected "type" to be an array, string or regexp');
          }
        }
      };
      u.hasType = function(e, t) {
        assert(u.isNode(e), 'expected node to be an instance of Node');
        if (!Array.isArray(e.nodes)) return false;
        for (var r = 0; r < e.nodes.length; r++) {
          if (u.isType(e.nodes[r], t)) {
            return true;
          }
        }
        return false;
      };
      u.firstOfType = function(e, t) {
        for (var r = 0; r < e.length; r++) {
          var n = e[r];
          if (u.isType(n, t)) {
            return n;
          }
        }
      };
      u.findNode = function(e, t) {
        if (!Array.isArray(e)) {
          return null;
        }
        if (typeof t === 'number') {
          return e[t];
        }
        return u.firstOfType(e, t);
      };
      u.isOpen = function(e) {
        assert(u.isNode(e), 'expected node to be an instance of Node');
        return e.type.slice(-5) === '.open';
      };
      u.isClose = function(e) {
        assert(u.isNode(e), 'expected node to be an instance of Node');
        return e.type.slice(-6) === '.close';
      };
      u.hasOpen = function(e) {
        assert(u.isNode(e), 'expected node to be an instance of Node');
        var t = e.first || e.nodes ? e.nodes[0] : null;
        if (u.isNode(t)) {
          return t.type === e.type + '.open';
        }
        return false;
      };
      u.hasClose = function(e) {
        assert(u.isNode(e), 'expected node to be an instance of Node');
        var t = e.last || e.nodes ? e.nodes[e.nodes.length - 1] : null;
        if (u.isNode(t)) {
          return t.type === e.type + '.close';
        }
        return false;
      };
      u.hasOpenAndClose = function(e) {
        return u.hasOpen(e) && u.hasClose(e);
      };
      u.addType = function(e, t) {
        assert(u.isNode(t), 'expected node to be an instance of Node');
        assert(isObject(e), 'expected state to be an object');
        var r = t.parent ? t.parent.type : t.type.replace(/\.open$/, '');
        if (!e.hasOwnProperty('inside')) {
          e.inside = {};
        }
        if (!e.inside.hasOwnProperty(r)) {
          e.inside[r] = [];
        }
        var n = e.inside[r];
        n.push(t);
        return n;
      };
      u.removeType = function(e, t) {
        assert(u.isNode(t), 'expected node to be an instance of Node');
        assert(isObject(e), 'expected state to be an object');
        var r = t.parent ? t.parent.type : t.type.replace(/\.close$/, '');
        if (e.inside.hasOwnProperty(r)) {
          return e.inside[r].pop();
        }
      };
      u.isEmpty = function(e, t) {
        assert(u.isNode(e), 'expected node to be an instance of Node');
        if (!Array.isArray(e.nodes)) {
          if (e.type !== 'text') {
            return true;
          }
          if (typeof t === 'function') {
            return t(e, e.parent);
          }
          return !u.trim(e.val);
        }
        for (var r = 0; r < e.nodes.length; r++) {
          var n = e.nodes[r];
          if (u.isOpen(n) || u.isClose(n)) {
            continue;
          }
          if (!u.isEmpty(n, t)) {
            return false;
          }
        }
        return true;
      };
      u.isInsideType = function(e, t) {
        assert(isObject(e), 'expected state to be an object');
        assert(isString(t), 'expected type to be a string');
        if (!e.hasOwnProperty('inside')) {
          return false;
        }
        if (!e.inside.hasOwnProperty(t)) {
          return false;
        }
        return e.inside[t].length > 0;
      };
      u.isInside = function(e, t, r) {
        assert(u.isNode(t), 'expected node to be an instance of Node');
        assert(isObject(e), 'expected state to be an object');
        if (Array.isArray(r)) {
          for (var i = 0; i < r.length; i++) {
            if (u.isInside(e, t, r[i])) {
              return true;
            }
          }
          return false;
        }
        var o = t.parent;
        if (typeof r === 'string') {
          return (o && o.type === r) || u.isInsideType(e, r);
        }
        if (n(r) === 'regexp') {
          if (o && o.type && r.test(o.type)) {
            return true;
          }
          var a = Object.keys(e.inside);
          var s = a.length;
          var c = -1;
          while (++c < s) {
            var f = a[c];
            var l = e.inside[f];
            if (Array.isArray(l) && l.length !== 0 && r.test(f)) {
              return true;
            }
          }
        }
        return false;
      };
      u.last = function(e, t) {
        return e[e.length - (t || 1)];
      };
      u.arrayify = function(e) {
        if (typeof e === 'string' && e !== '') {
          return [e];
        }
        if (!Array.isArray(e)) {
          return [];
        }
        return e;
      };
      u.stringify = function(e) {
        return u.arrayify(e).join(',');
      };
      u.trim = function(e) {
        return typeof e === 'string' ? e.trim() : '';
      };
      function isObject(e) {
        return n(e) === 'object';
      }
      function isString(e) {
        return typeof e === 'string';
      }
      function isFunction(e) {
        return typeof e === 'function';
      }
      function isArray(e) {
        return Array.isArray(e);
      }
      function append(e, t, r) {
        if (typeof e.append !== 'function') {
          return e.emit(t, r);
        }
        return e.append(t, r);
      }
      function assert(e, t) {
        if (!e) throw new Error(t);
      }
    },
    function() {
      eval('require')('worker_threads');
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var n =
        typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol'
          ? function(e) {
              return typeof e;
            }
          : function(e) {
              return e &&
                typeof Symbol === 'function' &&
                e.constructor === Symbol &&
                e !== Symbol.prototype
                ? 'symbol'
                : typeof e;
            };
      t.default = parse;
      var u = r(455);
      var i = _interopRequireWildcard(u);
      function _interopRequireWildcard(e) {
        if (e && e.__esModule) {
          return e;
        } else {
          var t = {};
          if (e != null) {
            for (var r in e) {
              if (Object.prototype.hasOwnProperty.call(e, r)) t[r] = e[r];
            }
          }
          t.default = e;
          return t;
        }
      }
      var o = void 0;
      var a = void 0;
      var s = void 0;
      var c = void 0;
      var f = void 0;
      var l = void 0;
      var p = void 0;
      var h = void 0;
      var d = void 0;
      function parse(e, t) {
        o = String(e);
        a = 'start';
        s = [];
        c = 0;
        f = 1;
        l = 0;
        p = undefined;
        h = undefined;
        d = undefined;
        do {
          p = lex();
          E[a]();
        } while (p.type !== 'eof');
        if (typeof t === 'function') {
          return internalize({ '': d }, '', t);
        }
        return d;
      }
      function internalize(e, t, r) {
        var u = e[t];
        if (u != null && (typeof u === 'undefined' ? 'undefined' : n(u)) === 'object') {
          for (var i in u) {
            var o = internalize(u, i, r);
            if (o === undefined) {
              delete u[i];
            } else {
              u[i] = o;
            }
          }
        }
        return r.call(e, t, u);
      }
      var y = void 0;
      var v = void 0;
      var D = void 0;
      var m = void 0;
      var A = void 0;
      function lex() {
        y = 'default';
        v = '';
        D = false;
        m = 1;
        for (;;) {
          A = peek();
          var e = g[y]();
          if (e) {
            return e;
          }
        }
      }
      function peek() {
        if (o[c]) {
          return String.fromCodePoint(o.codePointAt(c));
        }
      }
      function read() {
        var e = peek();
        if (e === '\n') {
          f++;
          l = 0;
        } else if (e) {
          l += e.length;
        } else {
          l++;
        }
        if (e) {
          c += e.length;
        }
        return e;
      }
      var g = {
        default: function _default() {
          switch (A) {
            case '\t':
            case '\v':
            case '\f':
            case ' ':
            case ' ':
            case '\ufeff':
            case '\n':
            case '\r':
            case '\u2028':
            case '\u2029':
              read();
              return;
            case '/':
              read();
              y = 'comment';
              return;
            case undefined:
              read();
              return newToken('eof');
          }
          if (i.isSpaceSeparator(A)) {
            read();
            return;
          }
          return g[a]();
        },
        comment: function comment() {
          switch (A) {
            case '*':
              read();
              y = 'multiLineComment';
              return;
            case '/':
              read();
              y = 'singleLineComment';
              return;
          }
          throw invalidChar(read());
        },
        multiLineComment: function multiLineComment() {
          switch (A) {
            case '*':
              read();
              y = 'multiLineCommentAsterisk';
              return;
            case undefined:
              throw invalidChar(read());
          }
          read();
        },
        multiLineCommentAsterisk: function multiLineCommentAsterisk() {
          switch (A) {
            case '*':
              read();
              return;
            case '/':
              read();
              y = 'default';
              return;
            case undefined:
              throw invalidChar(read());
          }
          read();
          y = 'multiLineComment';
        },
        singleLineComment: function singleLineComment() {
          switch (A) {
            case '\n':
            case '\r':
            case '\u2028':
            case '\u2029':
              read();
              y = 'default';
              return;
            case undefined:
              read();
              return newToken('eof');
          }
          read();
        },
        value: function value() {
          switch (A) {
            case '{':
            case '[':
              return newToken('punctuator', read());
            case 'n':
              read();
              literal('ull');
              return newToken('null', null);
            case 't':
              read();
              literal('rue');
              return newToken('boolean', true);
            case 'f':
              read();
              literal('alse');
              return newToken('boolean', false);
            case '-':
            case '+':
              if (read() === '-') {
                m = -1;
              }
              y = 'sign';
              return;
            case '.':
              v = read();
              y = 'decimalPointLeading';
              return;
            case '0':
              v = read();
              y = 'zero';
              return;
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
              v = read();
              y = 'decimalInteger';
              return;
            case 'I':
              read();
              literal('nfinity');
              return newToken('numeric', Infinity);
            case 'N':
              read();
              literal('aN');
              return newToken('numeric', NaN);
            case '"':
            case "'":
              D = read() === '"';
              v = '';
              y = 'string';
              return;
          }
          throw invalidChar(read());
        },
        identifierNameStartEscape: function identifierNameStartEscape() {
          if (A !== 'u') {
            throw invalidChar(read());
          }
          read();
          var e = unicodeEscape();
          switch (e) {
            case '$':
            case '_':
              break;
            default:
              if (!i.isIdStartChar(e)) {
                throw invalidIdentifier();
              }
              break;
          }
          v += e;
          y = 'identifierName';
        },
        identifierName: function identifierName() {
          switch (A) {
            case '$':
            case '_':
            case '‌':
            case '‍':
              v += read();
              return;
            case '\\':
              read();
              y = 'identifierNameEscape';
              return;
          }
          if (i.isIdContinueChar(A)) {
            v += read();
            return;
          }
          return newToken('identifier', v);
        },
        identifierNameEscape: function identifierNameEscape() {
          if (A !== 'u') {
            throw invalidChar(read());
          }
          read();
          var e = unicodeEscape();
          switch (e) {
            case '$':
            case '_':
            case '‌':
            case '‍':
              break;
            default:
              if (!i.isIdContinueChar(e)) {
                throw invalidIdentifier();
              }
              break;
          }
          v += e;
          y = 'identifierName';
        },
        sign: function sign() {
          switch (A) {
            case '.':
              v = read();
              y = 'decimalPointLeading';
              return;
            case '0':
              v = read();
              y = 'zero';
              return;
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
              v = read();
              y = 'decimalInteger';
              return;
            case 'I':
              read();
              literal('nfinity');
              return newToken('numeric', m * Infinity);
            case 'N':
              read();
              literal('aN');
              return newToken('numeric', NaN);
          }
          throw invalidChar(read());
        },
        zero: function zero() {
          switch (A) {
            case '.':
              v += read();
              y = 'decimalPoint';
              return;
            case 'e':
            case 'E':
              v += read();
              y = 'decimalExponent';
              return;
            case 'x':
            case 'X':
              v += read();
              y = 'hexadecimal';
              return;
          }
          return newToken('numeric', m * 0);
        },
        decimalInteger: function decimalInteger() {
          switch (A) {
            case '.':
              v += read();
              y = 'decimalPoint';
              return;
            case 'e':
            case 'E':
              v += read();
              y = 'decimalExponent';
              return;
          }
          if (i.isDigit(A)) {
            v += read();
            return;
          }
          return newToken('numeric', m * Number(v));
        },
        decimalPointLeading: function decimalPointLeading() {
          if (i.isDigit(A)) {
            v += read();
            y = 'decimalFraction';
            return;
          }
          throw invalidChar(read());
        },
        decimalPoint: function decimalPoint() {
          switch (A) {
            case 'e':
            case 'E':
              v += read();
              y = 'decimalExponent';
              return;
          }
          if (i.isDigit(A)) {
            v += read();
            y = 'decimalFraction';
            return;
          }
          return newToken('numeric', m * Number(v));
        },
        decimalFraction: function decimalFraction() {
          switch (A) {
            case 'e':
            case 'E':
              v += read();
              y = 'decimalExponent';
              return;
          }
          if (i.isDigit(A)) {
            v += read();
            return;
          }
          return newToken('numeric', m * Number(v));
        },
        decimalExponent: function decimalExponent() {
          switch (A) {
            case '+':
            case '-':
              v += read();
              y = 'decimalExponentSign';
              return;
          }
          if (i.isDigit(A)) {
            v += read();
            y = 'decimalExponentInteger';
            return;
          }
          throw invalidChar(read());
        },
        decimalExponentSign: function decimalExponentSign() {
          if (i.isDigit(A)) {
            v += read();
            y = 'decimalExponentInteger';
            return;
          }
          throw invalidChar(read());
        },
        decimalExponentInteger: function decimalExponentInteger() {
          if (i.isDigit(A)) {
            v += read();
            return;
          }
          return newToken('numeric', m * Number(v));
        },
        hexadecimal: function hexadecimal() {
          if (i.isHexDigit(A)) {
            v += read();
            y = 'hexadecimalInteger';
            return;
          }
          throw invalidChar(read());
        },
        hexadecimalInteger: function hexadecimalInteger() {
          if (i.isHexDigit(A)) {
            v += read();
            return;
          }
          return newToken('numeric', m * Number(v));
        },
        string: function string() {
          switch (A) {
            case '\\':
              read();
              v += escape();
              return;
            case '"':
              if (D) {
                read();
                return newToken('string', v);
              }
              v += read();
              return;
            case "'":
              if (!D) {
                read();
                return newToken('string', v);
              }
              v += read();
              return;
            case '\n':
            case '\r':
              throw invalidChar(read());
            case '\u2028':
            case '\u2029':
              separatorChar(A);
              break;
            case undefined:
              throw invalidChar(read());
          }
          v += read();
        },
        start: function start() {
          switch (A) {
            case '{':
            case '[':
              return newToken('punctuator', read());
          }
          y = 'value';
        },
        beforePropertyName: function beforePropertyName() {
          switch (A) {
            case '$':
            case '_':
              v = read();
              y = 'identifierName';
              return;
            case '\\':
              read();
              y = 'identifierNameStartEscape';
              return;
            case '}':
              return newToken('punctuator', read());
            case '"':
            case "'":
              D = read() === '"';
              y = 'string';
              return;
          }
          if (i.isIdStartChar(A)) {
            v += read();
            y = 'identifierName';
            return;
          }
          throw invalidChar(read());
        },
        afterPropertyName: function afterPropertyName() {
          if (A === ':') {
            return newToken('punctuator', read());
          }
          throw invalidChar(read());
        },
        beforePropertyValue: function beforePropertyValue() {
          y = 'value';
        },
        afterPropertyValue: function afterPropertyValue() {
          switch (A) {
            case ',':
            case '}':
              return newToken('punctuator', read());
          }
          throw invalidChar(read());
        },
        beforeArrayValue: function beforeArrayValue() {
          if (A === ']') {
            return newToken('punctuator', read());
          }
          y = 'value';
        },
        afterArrayValue: function afterArrayValue() {
          switch (A) {
            case ',':
            case ']':
              return newToken('punctuator', read());
          }
          throw invalidChar(read());
        },
        end: function end() {
          throw invalidChar(read());
        },
      };
      function newToken(e, t) {
        return { type: e, value: t, line: f, column: l };
      }
      function literal(e) {
        var t = true;
        var r = false;
        var n = undefined;
        try {
          for (var u = e[Symbol.iterator](), i; !(t = (i = u.next()).done); t = true) {
            var o = i.value;
            var a = peek();
            if (a !== o) {
              throw invalidChar(read());
            }
            read();
          }
        } catch (e) {
          r = true;
          n = e;
        } finally {
          try {
            if (!t && u.return) {
              u.return();
            }
          } finally {
            if (r) {
              throw n;
            }
          }
        }
      }
      function escape() {
        var e = peek();
        switch (e) {
          case 'b':
            read();
            return '\b';
          case 'f':
            read();
            return '\f';
          case 'n':
            read();
            return '\n';
          case 'r':
            read();
            return '\r';
          case 't':
            read();
            return '\t';
          case 'v':
            read();
            return '\v';
          case '0':
            read();
            if (i.isDigit(peek())) {
              throw invalidChar(read());
            }
            return '\0';
          case 'x':
            read();
            return hexEscape();
          case 'u':
            read();
            return unicodeEscape();
          case '\n':
          case '\u2028':
          case '\u2029':
            read();
            return '';
          case '\r':
            read();
            if (peek() === '\n') {
              read();
            }
            return '';
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
          case '7':
          case '8':
          case '9':
            throw invalidChar(read());
          case undefined:
            throw invalidChar(read());
        }
        return read();
      }
      function hexEscape() {
        var e = '';
        var t = peek();
        if (!i.isHexDigit(t)) {
          throw invalidChar(read());
        }
        e += read();
        t = peek();
        if (!i.isHexDigit(t)) {
          throw invalidChar(read());
        }
        e += read();
        return String.fromCodePoint(parseInt(e, 16));
      }
      function unicodeEscape() {
        var e = '';
        var t = 4;
        while (t-- > 0) {
          var r = peek();
          if (!i.isHexDigit(r)) {
            throw invalidChar(read());
          }
          e += read();
        }
        return String.fromCodePoint(parseInt(e, 16));
      }
      var E = {
        start: function start() {
          if (p.type === 'eof') {
            throw invalidEOF();
          }
          push();
        },
        beforePropertyName: function beforePropertyName() {
          switch (p.type) {
            case 'identifier':
            case 'string':
              h = p.value;
              a = 'afterPropertyName';
              return;
            case 'punctuator':
              pop();
              return;
            case 'eof':
              throw invalidEOF();
          }
        },
        afterPropertyName: function afterPropertyName() {
          if (p.type === 'eof') {
            throw invalidEOF();
          }
          a = 'beforePropertyValue';
        },
        beforePropertyValue: function beforePropertyValue() {
          if (p.type === 'eof') {
            throw invalidEOF();
          }
          push();
        },
        beforeArrayValue: function beforeArrayValue() {
          if (p.type === 'eof') {
            throw invalidEOF();
          }
          if (p.type === 'punctuator' && p.value === ']') {
            pop();
            return;
          }
          push();
        },
        afterPropertyValue: function afterPropertyValue() {
          if (p.type === 'eof') {
            throw invalidEOF();
          }
          switch (p.value) {
            case ',':
              a = 'beforePropertyName';
              return;
            case '}':
              pop();
          }
        },
        afterArrayValue: function afterArrayValue() {
          if (p.type === 'eof') {
            throw invalidEOF();
          }
          switch (p.value) {
            case ',':
              a = 'beforeArrayValue';
              return;
            case ']':
              pop();
          }
        },
        end: function end() {},
      };
      function push() {
        var e = void 0;
        switch (p.type) {
          case 'punctuator':
            switch (p.value) {
              case '{':
                e = {};
                break;
              case '[':
                e = [];
                break;
            }
            break;
          case 'null':
          case 'boolean':
          case 'numeric':
          case 'string':
            e = p.value;
            break;
        }
        if (d === undefined) {
          d = e;
        } else {
          var t = s[s.length - 1];
          if (Array.isArray(t)) {
            t.push(e);
          } else {
            t[h] = e;
          }
        }
        if (e !== null && (typeof e === 'undefined' ? 'undefined' : n(e)) === 'object') {
          s.push(e);
          if (Array.isArray(e)) {
            a = 'beforeArrayValue';
          } else {
            a = 'beforePropertyName';
          }
        } else {
          var r = s[s.length - 1];
          if (r == null) {
            a = 'end';
          } else if (Array.isArray(r)) {
            a = 'afterArrayValue';
          } else {
            a = 'afterPropertyValue';
          }
        }
      }
      function pop() {
        s.pop();
        var e = s[s.length - 1];
        if (e == null) {
          a = 'end';
        } else if (Array.isArray(e)) {
          a = 'afterArrayValue';
        } else {
          a = 'afterPropertyValue';
        }
      }
      function invalidChar(e) {
        if (e === undefined) {
          return syntaxError('JSON5: invalid end of input at ' + f + ':' + l);
        }
        return syntaxError("JSON5: invalid character '" + formatChar(e) + "' at " + f + ':' + l);
      }
      function invalidEOF() {
        return syntaxError('JSON5: invalid end of input at ' + f + ':' + l);
      }
      function invalidIdentifier() {
        l -= 5;
        return syntaxError('JSON5: invalid identifier character at ' + f + ':' + l);
      }
      function separatorChar(e) {
        console.warn("JSON5: '" + e + "' is not valid ECMAScript; consider escaping");
      }
      function formatChar(e) {
        var t = {
          "'": "\\'",
          '"': '\\"',
          '\\': '\\\\',
          '\b': '\\b',
          '\f': '\\f',
          '\n': '\\n',
          '\r': '\\r',
          '\t': '\\t',
          '\v': '\\v',
          '\0': '\\0',
          '\u2028': '\\u2028',
          '\u2029': '\\u2029',
        };
        if (t[e]) {
          return t[e];
        }
        if (e < ' ') {
          var r = e.charCodeAt(0).toString(16);
          return '\\x' + ('00' + r).substring(r.length);
        }
        return e;
      }
      function syntaxError(e) {
        var t = new SyntaxError(e);
        t.lineNumber = f;
        t.columnNumber = l;
        return t;
      }
      e.exports = t['default'];
    },
    ,
    function(e) {
      (function() {
        'use strict';
        function isExpression(e) {
          if (e == null) {
            return false;
          }
          switch (e.type) {
            case 'ArrayExpression':
            case 'AssignmentExpression':
            case 'BinaryExpression':
            case 'CallExpression':
            case 'ConditionalExpression':
            case 'FunctionExpression':
            case 'Identifier':
            case 'Literal':
            case 'LogicalExpression':
            case 'MemberExpression':
            case 'NewExpression':
            case 'ObjectExpression':
            case 'SequenceExpression':
            case 'ThisExpression':
            case 'UnaryExpression':
            case 'UpdateExpression':
              return true;
          }
          return false;
        }
        function isIterationStatement(e) {
          if (e == null) {
            return false;
          }
          switch (e.type) {
            case 'DoWhileStatement':
            case 'ForInStatement':
            case 'ForStatement':
            case 'WhileStatement':
              return true;
          }
          return false;
        }
        function isStatement(e) {
          if (e == null) {
            return false;
          }
          switch (e.type) {
            case 'BlockStatement':
            case 'BreakStatement':
            case 'ContinueStatement':
            case 'DebuggerStatement':
            case 'DoWhileStatement':
            case 'EmptyStatement':
            case 'ExpressionStatement':
            case 'ForInStatement':
            case 'ForStatement':
            case 'IfStatement':
            case 'LabeledStatement':
            case 'ReturnStatement':
            case 'SwitchStatement':
            case 'ThrowStatement':
            case 'TryStatement':
            case 'VariableDeclaration':
            case 'WhileStatement':
            case 'WithStatement':
              return true;
          }
          return false;
        }
        function isSourceElement(e) {
          return isStatement(e) || (e != null && e.type === 'FunctionDeclaration');
        }
        function trailingStatement(e) {
          switch (e.type) {
            case 'IfStatement':
              if (e.alternate != null) {
                return e.alternate;
              }
              return e.consequent;
            case 'LabeledStatement':
            case 'ForStatement':
            case 'ForInStatement':
            case 'WhileStatement':
            case 'WithStatement':
              return e.body;
          }
          return null;
        }
        function isProblematicIfStatement(e) {
          var t;
          if (e.type !== 'IfStatement') {
            return false;
          }
          if (e.alternate == null) {
            return false;
          }
          t = e.consequent;
          do {
            if (t.type === 'IfStatement') {
              if (t.alternate == null) {
                return true;
              }
            }
            t = trailingStatement(t);
          } while (t);
          return false;
        }
        e.exports = {
          isExpression: isExpression,
          isStatement: isStatement,
          isIterationStatement: isIterationStatement,
          isSourceElement: isSourceElement,
          isProblematicIfStatement: isProblematicIfStatement,
          trailingStatement: trailingStatement,
        };
      })();
    },
    ,
    ,
    function(e) {
      'use strict';
      var t = '%[a-f0-9]{2}';
      var r = new RegExp(t, 'gi');
      var n = new RegExp('(' + t + ')+', 'gi');
      function decodeComponents(e, t) {
        try {
          return decodeURIComponent(e.join(''));
        } catch (e) {}
        if (e.length === 1) {
          return e;
        }
        t = t || 1;
        var r = e.slice(0, t);
        var n = e.slice(t);
        return Array.prototype.concat.call([], decodeComponents(r), decodeComponents(n));
      }
      function decode(e) {
        try {
          return decodeURIComponent(e);
        } catch (u) {
          var t = e.match(r);
          for (var n = 1; n < t.length; n++) {
            e = decodeComponents(t, n).join('');
            t = e.match(r);
          }
          return e;
        }
      }
      function customDecodeURIComponent(e) {
        var t = { '%FE%FF': '��', '%FF%FE': '��' };
        var r = n.exec(e);
        while (r) {
          try {
            t[r[0]] = decodeURIComponent(r[0]);
          } catch (e) {
            var u = decode(r[0]);
            if (u !== r[0]) {
              t[r[0]] = u;
            }
          }
          r = n.exec(e);
        }
        t['%C2'] = '�';
        var i = Object.keys(t);
        for (var o = 0; o < i.length; o++) {
          var a = i[o];
          e = e.replace(new RegExp(a, 'g'), t[a]);
        }
        return e;
      }
      e.exports = function(e) {
        if (typeof e !== 'string') {
          throw new TypeError(
            'Expected `encodedURI` to be of type `string`, got `' + typeof e + '`'
          );
        }
        try {
          e = e.replace(/\+/g, ' ');
          return decodeURIComponent(e);
        } catch (t) {
          return customDecodeURIComponent(e);
        }
      };
    },
    function(e, t, r) {
      var n = r(348);
      var u = n.Symbol;
      e.exports = u;
    },
    function(e, t, r) {
      'use strict';
      var n = r(906);
      var u = e.exports;
      u.extend = r(192);
      u.flatten = r(624);
      u.isObject = r(58);
      u.fillRange = r(939);
      u.repeat = r(826);
      u.unique = r(156);
      u.define = function(e, t, r) {
        Object.defineProperty(e, t, {
          writable: true,
          configurable: true,
          enumerable: false,
          value: r,
        });
      };
      u.isEmptySets = function(e) {
        return /^(?:\{,\})+$/.test(e);
      };
      u.isQuotedString = function(e) {
        var t = e.charAt(0);
        if (t === "'" || t === '"' || t === '`') {
          return e.slice(-1) === t;
        }
        return false;
      };
      u.createKey = function(e, t) {
        var r = e;
        if (typeof t === 'undefined') {
          return r;
        }
        var n = Object.keys(t);
        for (var u = 0; u < n.length; u++) {
          var i = n[u];
          r += ';' + i + '=' + String(t[i]);
        }
        return r;
      };
      u.createOptions = function(e) {
        var t = u.extend.apply(null, arguments);
        if (typeof t.expand === 'boolean') {
          t.optimize = !t.expand;
        }
        if (typeof t.optimize === 'boolean') {
          t.expand = !t.optimize;
        }
        if (t.optimize === true) {
          t.makeRe = true;
        }
        return t;
      };
      u.join = function(e, t, r) {
        r = r || {};
        e = u.arrayify(e);
        t = u.arrayify(t);
        if (!e.length) return t;
        if (!t.length) return e;
        var n = e.length;
        var i = -1;
        var o = [];
        while (++i < n) {
          var a = e[i];
          if (Array.isArray(a)) {
            for (var s = 0; s < a.length; s++) {
              a[s] = u.join(a[s], t, r);
            }
            o.push(a);
            continue;
          }
          for (var c = 0; c < t.length; c++) {
            var f = t[c];
            if (Array.isArray(f)) {
              o.push(u.join(a, f, r));
            } else {
              o.push(a + f);
            }
          }
        }
        return o;
      };
      u.split = function(e, t) {
        var r = u.extend({ sep: ',' }, t);
        if (typeof r.keepQuotes !== 'boolean') {
          r.keepQuotes = true;
        }
        if (r.unescape === false) {
          r.keepEscaping = true;
        }
        return n(e, r, u.escapeBrackets(r));
      };
      u.expand = function(e, t) {
        var r = u.extend({ rangeLimit: 1e4 }, t);
        var n = u.split(e, r);
        var i = { segs: n };
        if (u.isQuotedString(e)) {
          return i;
        }
        if (r.rangeLimit === true) {
          r.rangeLimit = 1e4;
        }
        if (n.length > 1) {
          if (r.optimize === false) {
            i.val = n[0];
            return i;
          }
          i.segs = u.stringifyArray(i.segs);
        } else if (n.length === 1) {
          var o = e.split('..');
          if (o.length === 1) {
            i.val = i.segs[i.segs.length - 1] || i.val || e;
            i.segs = [];
            return i;
          }
          if (o.length === 2 && o[0] === o[1]) {
            i.escaped = true;
            i.val = o[0];
            i.segs = [];
            return i;
          }
          if (o.length > 1) {
            if (r.optimize !== false) {
              r.optimize = true;
              delete r.expand;
            }
            if (r.optimize !== true) {
              var a = Math.min(o[0], o[1]);
              var s = Math.max(o[0], o[1]);
              var c = o[2] || 1;
              if (r.rangeLimit !== false && (s - a) / c >= r.rangeLimit) {
                throw new RangeError(
                  'expanded array length exceeds range limit. Use options.rangeLimit to increase or disable the limit.'
                );
              }
            }
            o.push(r);
            i.segs = u.fillRange.apply(null, o);
            if (!i.segs.length) {
              i.escaped = true;
              i.val = e;
              return i;
            }
            if (r.optimize === true) {
              i.segs = u.stringifyArray(i.segs);
            }
            if (i.segs === '') {
              i.val = e;
            } else {
              i.val = i.segs[0];
            }
            return i;
          }
        } else {
          i.val = e;
        }
        return i;
      };
      u.escapeBrackets = function(e) {
        return function(t) {
          if (t.escaped && t.val === 'b') {
            t.val = '\\b';
            return;
          }
          if (t.val !== '(' && t.val !== '[') return;
          var r = u.extend({}, e);
          var n = [];
          var i = [];
          var o = [];
          var a = t.val;
          var s = t.str;
          var c = t.idx - 1;
          while (++c < s.length) {
            var f = s[c];
            if (f === '\\') {
              a += (r.keepEscaping === false ? '' : f) + s[++c];
              continue;
            }
            if (f === '(') {
              i.push(f);
              o.push(f);
            }
            if (f === '[') {
              n.push(f);
              o.push(f);
            }
            if (f === ')') {
              i.pop();
              o.pop();
              if (!o.length) {
                a += f;
                break;
              }
            }
            if (f === ']') {
              n.pop();
              o.pop();
              if (!o.length) {
                a += f;
                break;
              }
            }
            a += f;
          }
          t.split = false;
          t.val = a.slice(1);
          t.idx = c;
        };
      };
      u.isQuantifier = function(e) {
        return /^(?:[0-9]?,[0-9]|[0-9],)$/.test(e);
      };
      u.stringifyArray = function(e) {
        return [u.arrayify(e).join('|')];
      };
      u.arrayify = function(e) {
        if (typeof e === 'undefined') {
          return [];
        }
        if (typeof e === 'string') {
          return [e];
        }
        return e;
      };
      u.isString = function(e) {
        return e != null && typeof e === 'string';
      };
      u.last = function(e, t) {
        return e[e.length - (t || 1)];
      };
      u.escapeRegex = function(e) {
        return e.replace(/\\?([!^*?()[\]{}+?\/])/g, '\\$1');
      };
    },
    function(e, t, r) {
      'use strict';
      var n = r(204);
      var u = r(844);
      var i;
      t.last = function(e) {
        return e[e.length - 1];
      };
      t.createRegex = function(e, t) {
        if (i) return i;
        var r = { contains: true, strictClose: false };
        var o = u.create(e, r);
        var a;
        if (typeof t === 'string') {
          a = n('^(?:' + t + '|' + o + ')', r);
        } else {
          a = n(o, r);
        }
        return (i = a);
      };
    },
    ,
    ,
    ,
    function(e, t, r) {
      t.SourceMapGenerator = r(37).SourceMapGenerator;
      t.SourceMapConsumer = r(411).SourceMapConsumer;
      t.SourceNode = r(243).SourceNode;
    },
    function(e, t, r) {
      var n = r(698);
      var u = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
      var i = /\\(\\)?/g;
      var o = n(function(e) {
        var t = [];
        if (e.charCodeAt(0) === 46) {
          t.push('');
        }
        e.replace(u, function(e, r, n, u) {
          t.push(n ? u.replace(i, '$1') : r || e);
        });
        return t;
      });
      e.exports = o;
    },
    function(e, t, r) {
      var n = r(348);
      var u = n['__core-js_shared__'];
      e.exports = u;
    },
    ,
    function(e) {
      'use strict';
      e.exports = function isObject(e) {
        return e != null && typeof e === 'object' && Array.isArray(e) === false;
      };
    },
    function(e) {
      var t = Object.prototype;
      var r = t.hasOwnProperty;
      function baseHas(e, t) {
        return e != null && r.call(e, t);
      }
      e.exports = baseHas;
    },
    function(e, t, r) {
      'use strict';
      var n = r(241);
      var u = r(603);
      var i = r(417);
      e.exports = function isDescriptor(e, t) {
        if (n(e) !== 'object') {
          return false;
        }
        if ('get' in e) {
          return u(e, t);
        }
        return i(e, t);
      };
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n = r(669);
      var u = r(787);
      e.exports = function mapVisit(e, t, r) {
        if (isObject(r)) {
          return u.apply(null, arguments);
        }
        if (!Array.isArray(r)) {
          throw new TypeError('expected an array: ' + n.inspect(r));
        }
        var i = [].slice.call(arguments, 3);
        for (var o = 0; o < r.length; o++) {
          var a = r[o];
          if (isObject(a)) {
            u.apply(null, [e, t, a].concat(i));
          } else {
            e[t].apply(e, [a].concat(i));
          }
        }
      };
      function isObject(e) {
        return e && (typeof e === 'function' || (!Array.isArray(e) && typeof e === 'object'));
      }
    },
    function(e, t, r) {
      'use strict';
      var n = r(796);
      function FragmentCache(e) {
        this.caches = e || {};
      }
      FragmentCache.prototype = {
        cache: function(e) {
          return this.caches[e] || (this.caches[e] = new n());
        },
        set: function(e, t, r) {
          var n = this.cache(e);
          n.set(t, r);
          return n;
        },
        has: function(e, t) {
          return typeof this.get(e, t) !== 'undefined';
        },
        get: function(e, t) {
          var r = this.cache(e);
          if (typeof t === 'string') {
            return r.get(t);
          }
          return r;
        },
      };
      t = e.exports = FragmentCache;
    },
    function(e, t, r) {
      'use strict';
      var n = r(765);
      e.exports = function toPath(e) {
        if (n(e) !== 'arguments') {
          e = arguments;
        }
        return filter(e).join('.');
      };
      function filter(e) {
        var t = e.length;
        var r = -1;
        var u = [];
        while (++r < t) {
          var i = e[r];
          if (n(i) === 'arguments' || Array.isArray(i)) {
            u.push.apply(u, filter(i));
          } else if (typeof i === 'string') {
            u.push(i);
          }
        }
        return u;
      }
    },
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    function(e) {
      'use strict';
      e.exports = function copyDescriptor(e, t, r, n) {
        if (!isObject(t) && typeof t !== 'function') {
          n = r;
          r = t;
          t = e;
        }
        if (!isObject(e) && typeof e !== 'function') {
          throw new TypeError('expected the first argument to be an object');
        }
        if (!isObject(t) && typeof t !== 'function') {
          throw new TypeError('expected provider to be an object');
        }
        if (typeof n !== 'string') {
          n = r;
        }
        if (typeof r !== 'string') {
          throw new TypeError('expected key to be a string');
        }
        if (!(r in t)) {
          throw new Error('property "' + r + '" does not exist');
        }
        var u = Object.getOwnPropertyDescriptor(t, r);
        if (u) Object.defineProperty(e, n, u);
      };
      function isObject(e) {
        return {}.toString.call(e) === '[object Object]';
      }
    },
    function(e, t, r) {
      'use strict';
      var n = r(175);
      var u = { configurable: 'boolean', enumerable: 'boolean', writable: 'boolean' };
      function isDataDescriptor(e, t) {
        if (n(e) !== 'object') {
          return false;
        }
        if (typeof t === 'string') {
          var r = Object.getOwnPropertyDescriptor(e, t);
          return typeof r !== 'undefined';
        }
        if (!('value' in e) && !('writable' in e)) {
          return false;
        }
        for (var i in e) {
          if (i === 'value') continue;
          if (!u.hasOwnProperty(i)) {
            continue;
          }
          if (n(e[i]) === u[i]) {
            continue;
          }
          if (typeof e[i] !== 'undefined') {
            return false;
          }
        }
        return true;
      }
      e.exports = isDataDescriptor;
    },
    ,
    function(e, t, r) {
      'use strict';
      const n = r(729);
      const u = r(622);
      const i = r(620).copySync;
      const o = r(363).removeSync;
      const a = r(983).mkdirsSync;
      const s = r(645);
      function moveSync(e, t, r) {
        r = r || {};
        const i = r.overwrite || r.clobber || false;
        e = u.resolve(e);
        t = u.resolve(t);
        if (e === t) return n.accessSync(e);
        if (isSrcSubdir(e, t)) throw new Error(`Cannot move '${e}' into itself '${t}'.`);
        a(u.dirname(t));
        tryRenameSync();
        function tryRenameSync() {
          if (i) {
            try {
              return n.renameSync(e, t);
            } catch (n) {
              if (n.code === 'ENOTEMPTY' || n.code === 'EEXIST' || n.code === 'EPERM') {
                o(t);
                r.overwrite = false;
                return moveSync(e, t, r);
              }
              if (n.code !== 'EXDEV') throw n;
              return moveSyncAcrossDevice(e, t, i);
            }
          } else {
            try {
              n.linkSync(e, t);
              return n.unlinkSync(e);
            } catch (r) {
              if (
                r.code === 'EXDEV' ||
                r.code === 'EISDIR' ||
                r.code === 'EPERM' ||
                r.code === 'ENOTSUP'
              ) {
                return moveSyncAcrossDevice(e, t, i);
              }
              throw r;
            }
          }
        }
      }
      function moveSyncAcrossDevice(e, t, r) {
        const u = n.statSync(e);
        if (u.isDirectory()) {
          return moveDirSyncAcrossDevice(e, t, r);
        } else {
          return moveFileSyncAcrossDevice(e, t, r);
        }
      }
      function moveFileSyncAcrossDevice(e, t, r) {
        const u = 64 * 1024;
        const i = s(u);
        const o = r ? 'w' : 'wx';
        const a = n.openSync(e, 'r');
        const c = n.fstatSync(a);
        const f = n.openSync(t, o, c.mode);
        let l = 1;
        let p = 0;
        while (l > 0) {
          l = n.readSync(a, i, 0, u, p);
          n.writeSync(f, i, 0, l);
          p += l;
        }
        n.closeSync(a);
        n.closeSync(f);
        return n.unlinkSync(e);
      }
      function moveDirSyncAcrossDevice(e, t, r) {
        const n = { overwrite: false };
        if (r) {
          o(t);
          tryCopySync();
        } else {
          tryCopySync();
        }
        function tryCopySync() {
          i(e, t, n);
          return o(e);
        }
      }
      function isSrcSubdir(e, t) {
        try {
          return (
            n.statSync(e).isDirectory() &&
            e !== t &&
            t.indexOf(e) > -1 &&
            t.split(u.dirname(e) + u.sep)[1].split(u.sep)[0] === u.basename(e)
          );
        } catch (e) {
          return false;
        }
      }
      e.exports = { moveSync: moveSync };
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(729);
      const u = 64 * 1024;
      const i = r(645)(u);
      function copyFileSync(e, t, r) {
        const o = r.overwrite;
        const a = r.errorOnExist;
        const s = r.preserveTimestamps;
        if (n.existsSync(t)) {
          if (o) {
            n.unlinkSync(t);
          } else if (a) {
            throw new Error(`${t} already exists`);
          } else return;
        }
        const c = n.openSync(e, 'r');
        const f = n.fstatSync(c);
        const l = n.openSync(t, 'w', f.mode);
        let p = 1;
        let h = 0;
        while (p > 0) {
          p = n.readSync(c, i, 0, u, h);
          n.writeSync(l, i, 0, p);
          h += p;
        }
        if (s) {
          n.futimesSync(l, f.atime, f.mtime);
        }
        n.closeSync(c);
        n.closeSync(l);
      }
      e.exports = copyFileSync;
    },
    function(e, t, r) {
      var n = r(161);
      var u = r(840);
      var i = {};
      var o = Object.keys(n);
      function wrapRaw(e) {
        var t = function(t) {
          if (t === undefined || t === null) {
            return t;
          }
          if (arguments.length > 1) {
            t = Array.prototype.slice.call(arguments);
          }
          return e(t);
        };
        if ('conversion' in e) {
          t.conversion = e.conversion;
        }
        return t;
      }
      function wrapRounded(e) {
        var t = function(t) {
          if (t === undefined || t === null) {
            return t;
          }
          if (arguments.length > 1) {
            t = Array.prototype.slice.call(arguments);
          }
          var r = e(t);
          if (typeof r === 'object') {
            for (var n = r.length, u = 0; u < n; u++) {
              r[u] = Math.round(r[u]);
            }
          }
          return r;
        };
        if ('conversion' in e) {
          t.conversion = e.conversion;
        }
        return t;
      }
      o.forEach(function(e) {
        i[e] = {};
        Object.defineProperty(i[e], 'channels', { value: n[e].channels });
        Object.defineProperty(i[e], 'labels', { value: n[e].labels });
        var t = u(e);
        var r = Object.keys(t);
        r.forEach(function(r) {
          var n = t[r];
          i[e][r] = wrapRounded(n);
          i[e][r].raw = wrapRaw(n);
        });
      });
      e.exports = i;
    },
    ,
    ,
    function(e, t, r) {
      var n = r(116),
        u = r(518),
        i = r(922),
        o = r(342),
        a = r(615),
        s = r(1);
      function hasPath(e, t, r) {
        t = n(t, e);
        var c = -1,
          f = t.length,
          l = false;
        while (++c < f) {
          var p = s(t[c]);
          if (!(l = e != null && r(e, p))) {
            break;
          }
          e = e[p];
        }
        if (l || ++c != f) {
          return l;
        }
        f = e == null ? 0 : e.length;
        return !!f && a(f) && o(p, f) && (i(e) || u(e));
      }
      e.exports = hasPath;
    },
    function(e) {
      e.exports = require('os');
    },
    ,
    ,
    ,
    function(e, t, r) {
      var n = r(59),
        u = r(86);
      function has(e, t) {
        return e != null && u(e, t, n);
      }
      e.exports = has;
    },
    function(e, t, r) {
      'use strict';
      var n = r(2);
      var u = { get: 'function', set: 'function', configurable: 'boolean', enumerable: 'boolean' };
      function isAccessorDescriptor(e, t) {
        if (typeof t === 'string') {
          var r = Object.getOwnPropertyDescriptor(e, t);
          return typeof r !== 'undefined';
        }
        if (n(e) !== 'object') {
          return false;
        }
        if (has(e, 'value') || has(e, 'writable')) {
          return false;
        }
        if (!has(e, 'get') || typeof e.get !== 'function') {
          return false;
        }
        if (has(e, 'set') && typeof e[i] !== 'function' && typeof e[i] !== 'undefined') {
          return false;
        }
        for (var i in e) {
          if (!u.hasOwnProperty(i)) {
            continue;
          }
          if (n(e[i]) === u[i]) {
            continue;
          }
          if (typeof e[i] !== 'undefined') {
            return false;
          }
        }
        return true;
      }
      function has(e, t) {
        return {}.hasOwnProperty.call(e, t);
      }
      e.exports = isAccessorDescriptor;
    },
    ,
    ,
    function(e, t, r) {
      var n = r(580);
      function mapCacheDelete(e) {
        var t = n(this, e)['delete'](e);
        this.size -= t ? 1 : 0;
        return t;
      }
      e.exports = mapCacheDelete;
    },
    ,
    ,
    ,
    ,
    function(e) {
      var t = Object.prototype.toString;
      e.exports = function kindOf(e) {
        var r = typeof e;
        if (r === 'undefined') {
          return 'undefined';
        }
        if (e === null) {
          return 'null';
        }
        if (e === true || e === false || e instanceof Boolean) {
          return 'boolean';
        }
        if (r === 'string' || e instanceof String) {
          return 'string';
        }
        if (r === 'number' || e instanceof Number) {
          return 'number';
        }
        if (r === 'function' || e instanceof Function) {
          if (
            typeof e.constructor.name !== 'undefined' &&
            e.constructor.name.slice(0, 9) === 'Generator'
          ) {
            return 'generatorfunction';
          }
          return 'function';
        }
        if (typeof Array.isArray !== 'undefined' && Array.isArray(e)) {
          return 'array';
        }
        if (e instanceof RegExp) {
          return 'regexp';
        }
        if (e instanceof Date) {
          return 'date';
        }
        r = t.call(e);
        if (r === '[object RegExp]') {
          return 'regexp';
        }
        if (r === '[object Date]') {
          return 'date';
        }
        if (r === '[object Arguments]') {
          return 'arguments';
        }
        if (r === '[object Error]') {
          return 'error';
        }
        if (r === '[object Promise]') {
          return 'promise';
        }
        if (isBuffer(e)) {
          return 'buffer';
        }
        if (r === '[object Set]') {
          return 'set';
        }
        if (r === '[object WeakSet]') {
          return 'weakset';
        }
        if (r === '[object Map]') {
          return 'map';
        }
        if (r === '[object WeakMap]') {
          return 'weakmap';
        }
        if (r === '[object Symbol]') {
          return 'symbol';
        }
        if (r === '[object Map Iterator]') {
          return 'mapiterator';
        }
        if (r === '[object Set Iterator]') {
          return 'setiterator';
        }
        if (r === '[object String Iterator]') {
          return 'stringiterator';
        }
        if (r === '[object Array Iterator]') {
          return 'arrayiterator';
        }
        if (r === '[object Int8Array]') {
          return 'int8array';
        }
        if (r === '[object Uint8Array]') {
          return 'uint8array';
        }
        if (r === '[object Uint8ClampedArray]') {
          return 'uint8clampedarray';
        }
        if (r === '[object Int16Array]') {
          return 'int16array';
        }
        if (r === '[object Uint16Array]') {
          return 'uint16array';
        }
        if (r === '[object Int32Array]') {
          return 'int32array';
        }
        if (r === '[object Uint32Array]') {
          return 'uint32array';
        }
        if (r === '[object Float32Array]') {
          return 'float32array';
        }
        if (r === '[object Float64Array]') {
          return 'float64array';
        }
        return 'object';
      };
      function isBuffer(e) {
        return (
          e.constructor && typeof e.constructor.isBuffer === 'function' && e.constructor.isBuffer(e)
        );
      }
    },
    ,
    function(e, t, r) {
      'use strict';
      const n = r(622);
      const u = r(467);
      const i = r(780).pathExists;
      const o = r(946);
      function outputJson(e, t, r, a) {
        if (typeof r === 'function') {
          a = r;
          r = {};
        }
        const s = n.dirname(e);
        i(s, (n, i) => {
          if (n) return a(n);
          if (i) return o.writeJson(e, t, r, a);
          u.mkdirs(s, n => {
            if (n) return a(n);
            o.writeJson(e, t, r, a);
          });
        });
      }
      e.exports = outputJson;
    },
    function(e, t, r) {
      var n = r(580);
      function mapCacheSet(e, t) {
        var r = n(this, e),
          u = r.size;
        r.set(e, t);
        this.size += r.size == u ? 0 : 1;
        return this;
      }
      e.exports = mapCacheSet;
    },
    ,
    ,
    function(e) {
      void (function(t, r) {
        if (typeof define === 'function' && define.amd) {
          define(r);
        } else if (true) {
          e.exports = r();
        } else {
        }
      })(this, function() {
        var e = /[#@] sourceMappingURL=([^\s'"]*)/;
        var t = RegExp(
          '(?:' +
            '/\\*' +
            '(?:\\s*\r?\n(?://)?)?' +
            '(?:' +
            e.source +
            ')' +
            '\\s*' +
            '\\*/' +
            '|' +
            '//(?:' +
            e.source +
            ')' +
            ')' +
            '\\s*'
        );
        return {
          regex: t,
          _innerRegex: e,
          getFrom: function(e) {
            var r = e.match(t);
            return r ? r[1] || r[2] || '' : null;
          },
          existsIn: function(e) {
            return t.test(e);
          },
          removeFrom: function(e) {
            return e.replace(t, '');
          },
          insertBefore: function(e, r) {
            var n = e.match(t);
            if (n) {
              return e.slice(0, n.index) + r + e.slice(n.index);
            } else {
              return e + r;
            }
          },
        };
      });
    },
    function(e, t, r) {
      var n = r(143);
      function assocIndexOf(e, t) {
        var r = e.length;
        while (r--) {
          if (n(e[r][0], t)) {
            return r;
          }
        }
        return -1;
      }
      e.exports = assocIndexOf;
    },
    function(e) {
      var t = Object.prototype.toString;
      e.exports = function kindOf(e) {
        if (e === void 0) return 'undefined';
        if (e === null) return 'null';
        var r = typeof e;
        if (r === 'boolean') return 'boolean';
        if (r === 'string') return 'string';
        if (r === 'number') return 'number';
        if (r === 'symbol') return 'symbol';
        if (r === 'function') {
          return isGeneratorFn(e) ? 'generatorfunction' : 'function';
        }
        if (isArray(e)) return 'array';
        if (isBuffer(e)) return 'buffer';
        if (isArguments(e)) return 'arguments';
        if (isDate(e)) return 'date';
        if (isError(e)) return 'error';
        if (isRegexp(e)) return 'regexp';
        switch (ctorName(e)) {
          case 'Symbol':
            return 'symbol';
          case 'Promise':
            return 'promise';
          case 'WeakMap':
            return 'weakmap';
          case 'WeakSet':
            return 'weakset';
          case 'Map':
            return 'map';
          case 'Set':
            return 'set';
          case 'Int8Array':
            return 'int8array';
          case 'Uint8Array':
            return 'uint8array';
          case 'Uint8ClampedArray':
            return 'uint8clampedarray';
          case 'Int16Array':
            return 'int16array';
          case 'Uint16Array':
            return 'uint16array';
          case 'Int32Array':
            return 'int32array';
          case 'Uint32Array':
            return 'uint32array';
          case 'Float32Array':
            return 'float32array';
          case 'Float64Array':
            return 'float64array';
        }
        if (isGeneratorObj(e)) {
          return 'generator';
        }
        r = t.call(e);
        switch (r) {
          case '[object Object]':
            return 'object';
          case '[object Map Iterator]':
            return 'mapiterator';
          case '[object Set Iterator]':
            return 'setiterator';
          case '[object String Iterator]':
            return 'stringiterator';
          case '[object Array Iterator]':
            return 'arrayiterator';
        }
        return r
          .slice(8, -1)
          .toLowerCase()
          .replace(/\s/g, '');
      };
      function ctorName(e) {
        return e.constructor ? e.constructor.name : null;
      }
      function isArray(e) {
        if (Array.isArray) return Array.isArray(e);
        return e instanceof Array;
      }
      function isError(e) {
        return (
          e instanceof Error ||
          (typeof e.message === 'string' &&
            e.constructor &&
            typeof e.constructor.stackTraceLimit === 'number')
        );
      }
      function isDate(e) {
        if (e instanceof Date) return true;
        return (
          typeof e.toDateString === 'function' &&
          typeof e.getDate === 'function' &&
          typeof e.setDate === 'function'
        );
      }
      function isRegexp(e) {
        if (e instanceof RegExp) return true;
        return (
          typeof e.flags === 'string' &&
          typeof e.ignoreCase === 'boolean' &&
          typeof e.multiline === 'boolean' &&
          typeof e.global === 'boolean'
        );
      }
      function isGeneratorFn(e, t) {
        return ctorName(e) === 'GeneratorFunction';
      }
      function isGeneratorObj(e) {
        return (
          typeof e.throw === 'function' &&
          typeof e.return === 'function' &&
          typeof e.next === 'function'
        );
      }
      function isArguments(e) {
        try {
          if (typeof e.length === 'number' && typeof e.callee === 'function') {
            return true;
          }
        } catch (e) {
          if (e.message.indexOf('callee') !== -1) {
            return true;
          }
        }
        return false;
      }
      function isBuffer(e) {
        if (e.constructor && typeof e.constructor.isBuffer === 'function') {
          return e.constructor.isBuffer(e);
        }
        return false;
      }
    },
    ,
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(323).fromCallback;
      const u = r(914);
      e.exports = {
        readJson: n(u.readFile),
        readJsonSync: u.readFileSync,
        writeJson: n(u.writeFile),
        writeJsonSync: u.writeFileSync,
      };
    },
    ,
    function(e, t, r) {
      var n = r(407);
      var u = n.Buffer;
      function copyProps(e, t) {
        for (var r in e) {
          t[r] = e[r];
        }
      }
      if (u.from && u.alloc && u.allocUnsafe && u.allocUnsafeSlow) {
        e.exports = n;
      } else {
        copyProps(n, t);
        t.Buffer = SafeBuffer;
      }
      function SafeBuffer(e, t, r) {
        return u(e, t, r);
      }
      copyProps(u, SafeBuffer);
      SafeBuffer.from = function(e, t, r) {
        if (typeof e === 'number') {
          throw new TypeError('Argument must not be a number');
        }
        return u(e, t, r);
      };
      SafeBuffer.alloc = function(e, t, r) {
        if (typeof e !== 'number') {
          throw new TypeError('Argument must be a number');
        }
        var n = u(e);
        if (t !== undefined) {
          if (typeof r === 'string') {
            n.fill(t, r);
          } else {
            n.fill(t);
          }
        } else {
          n.fill(0);
        }
        return n;
      };
      SafeBuffer.allocUnsafe = function(e) {
        if (typeof e !== 'number') {
          throw new TypeError('Argument must be a number');
        }
        return u(e);
      };
      SafeBuffer.allocUnsafeSlow = function(e) {
        if (typeof e !== 'number') {
          throw new TypeError('Argument must be a number');
        }
        return n.SlowBuffer(e);
      };
    },
    function(e, t, r) {
      var n = r(922),
        u = r(758),
        i = r(55),
        o = r(974);
      function castPath(e, t) {
        if (n(e)) {
          return e;
        }
        return u(e, t) ? [e] : i(o(e));
      }
      e.exports = castPath;
    },
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    function(e) {
      e.exports = require('child_process');
    },
    function(e) {
      (function() {
        'use strict';
        var t, r, n, u, i, o;
        r = {
          NonAsciiIdentifierStart: /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B2\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]/,
          NonAsciiIdentifierPart: /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0-\u08B2\u08E4-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58\u0C59\u0C60-\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D60-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1CF8\u1CF9\u1D00-\u1DF5\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA69D\uA69F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2D\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]/,
        };
        t = {
          NonAsciiIdentifierStart: /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B2\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309B-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDE00-\uDE11\uDE13-\uDE2B\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF5D-\uDF61]|\uD805[\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDE00-\uDE2F\uDE44\uDE80-\uDEAA]|\uD806[\uDCA0-\uDCDF\uDCFF\uDEC0-\uDEF8]|\uD808[\uDC00-\uDF98]|\uD809[\uDC00-\uDC6E]|[\uD80C\uD840-\uD868\uD86A-\uD86C][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50\uDF93-\uDF9F]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDC00-\uDCC4]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D]|\uD87E[\uDC00-\uDE1D]/,
          NonAsciiIdentifierPart: /[\xAA\xB5\xB7\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0-\u08B2\u08E4-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58\u0C59\u0C60-\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D60-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1369-\u1371\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1CF8\u1CF9\u1D00-\u1DF5\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA69D\uA69F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2D\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDD0-\uDDDA\uDE00-\uDE11\uDE13-\uDE37\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF01-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB7\uDEC0-\uDEC9]|\uD806[\uDCA0-\uDCE9\uDCFF\uDEC0-\uDEF8]|\uD808[\uDC00-\uDF98]|\uD809[\uDC00-\uDC6E]|[\uD80C\uD840-\uD868\uD86A-\uD86C][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50-\uDF7E\uDF8F-\uDF9F]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF]/,
        };
        function isDecimalDigit(e) {
          return 48 <= e && e <= 57;
        }
        function isHexDigit(e) {
          return (48 <= e && e <= 57) || (97 <= e && e <= 102) || (65 <= e && e <= 70);
        }
        function isOctalDigit(e) {
          return e >= 48 && e <= 55;
        }
        n = [
          5760,
          6158,
          8192,
          8193,
          8194,
          8195,
          8196,
          8197,
          8198,
          8199,
          8200,
          8201,
          8202,
          8239,
          8287,
          12288,
          65279,
        ];
        function isWhiteSpace(e) {
          return (
            e === 32 ||
            e === 9 ||
            e === 11 ||
            e === 12 ||
            e === 160 ||
            (e >= 5760 && n.indexOf(e) >= 0)
          );
        }
        function isLineTerminator(e) {
          return e === 10 || e === 13 || e === 8232 || e === 8233;
        }
        function fromCodePoint(e) {
          if (e <= 65535) {
            return String.fromCharCode(e);
          }
          var t = String.fromCharCode(Math.floor((e - 65536) / 1024) + 55296);
          var r = String.fromCharCode((e - 65536) % 1024 + 56320);
          return t + r;
        }
        u = new Array(128);
        for (o = 0; o < 128; ++o) {
          u[o] = (o >= 97 && o <= 122) || (o >= 65 && o <= 90) || o === 36 || o === 95;
        }
        i = new Array(128);
        for (o = 0; o < 128; ++o) {
          i[o] =
            (o >= 97 && o <= 122) ||
            (o >= 65 && o <= 90) ||
            (o >= 48 && o <= 57) ||
            o === 36 ||
            o === 95;
        }
        function isIdentifierStartES5(e) {
          return e < 128 ? u[e] : r.NonAsciiIdentifierStart.test(fromCodePoint(e));
        }
        function isIdentifierPartES5(e) {
          return e < 128 ? i[e] : r.NonAsciiIdentifierPart.test(fromCodePoint(e));
        }
        function isIdentifierStartES6(e) {
          return e < 128 ? u[e] : t.NonAsciiIdentifierStart.test(fromCodePoint(e));
        }
        function isIdentifierPartES6(e) {
          return e < 128 ? i[e] : t.NonAsciiIdentifierPart.test(fromCodePoint(e));
        }
        e.exports = {
          isDecimalDigit: isDecimalDigit,
          isHexDigit: isHexDigit,
          isOctalDigit: isOctalDigit,
          isWhiteSpace: isWhiteSpace,
          isLineTerminator: isLineTerminator,
          isIdentifierStartES5: isIdentifierStartES5,
          isIdentifierPartES5: isIdentifierPartES5,
          isIdentifierStartES6: isIdentifierStartES6,
          isIdentifierPartES6: isIdentifierPartES6,
        };
      })();
    },
    ,
    ,
    ,
    function(e) {
      e.exports = {
        name: 'expo-optimize',
        version: '0.0.0',
        main: 'build',
        preferGlobal: true,
        keywords: ['expo', 'sharp', 'optimize', 'react-native', 'react-native-web'],
        description: 'Compress the assets in your project',
        repository: {
          type: 'git',
          url: 'https://github.com/expo/expo-cli.git',
          directory: 'packages/expo-optimize',
        },
        author: 'Expo <support@expo.io>',
        license: 'MIT',
        bin: { 'expo-optimize': './build/index.js' },
        files: ['build'],
        scripts: {
          prepare: 'yarn run clean && yarn run build:prod',
          lint: 'eslint .',
          watch: 'yarn run build -w',
          build: 'ncc build ./src/index.ts -o build/ --external @expo/image-utils',
          'build:prod': 'yarn run build --minify --no-cache --no-source-map-register',
          clean: 'rimraf ./build/',
        },
        devDependencies: {
          '@expo/babel-preset-cli': '^0.2.1',
          '@types/node': '^12.6.8',
          '@zeit/ncc': '^0.20.5',
          chalk: '2.4.2',
          commander: '2.20.0',
          cpy: '7.3.0',
          'cross-spawn': '6.0.5',
          rimraf: '2.6.3',
          typescript: '^3.5.3',
          'update-check': '1.5.3',
          'validate-npm-package-name': '3.0.0',
        },
        dependencies: {
          '@expo/config': '^2.4.0',
          '@expo/image-utils': '^0.2.7',
          '@expo/json-file': '^8.2.1',
        },
      };
    },
    function(e, t, r) {
      'use strict';
      const n = r(323).fromCallback;
      const u = r(601);
      e.exports = { remove: n(u), removeSync: u.sync };
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n = r(928);
      var u = { configurable: 'boolean', enumerable: 'boolean', writable: 'boolean' };
      function isDataDescriptor(e, t) {
        if (n(e) !== 'object') {
          return false;
        }
        if (typeof t === 'string') {
          var r = Object.getOwnPropertyDescriptor(e, t);
          return typeof r !== 'undefined';
        }
        if (!('value' in e) && !('writable' in e)) {
          return false;
        }
        for (var i in e) {
          if (i === 'value') continue;
          if (!u.hasOwnProperty(i)) {
            continue;
          }
          if (n(e[i]) === u[i]) {
            continue;
          }
          if (typeof e[i] !== 'undefined') {
            return false;
          }
        }
        return true;
      }
      e.exports = isDataDescriptor;
    },
    function(e) {
      'use strict';
      e.exports = function(e) {
        if (typeof Buffer.allocUnsafe === 'function') {
          try {
            return Buffer.allocUnsafe(e);
          } catch (t) {
            return new Buffer(e);
          }
        }
        return new Buffer(e);
      };
    },
    ,
    ,
    ,
    function(e) {
      function eq(e, t) {
        return e === t || (e !== e && t !== t);
      }
      e.exports = eq;
    },
    ,
    function(e, t, r) {
      var n = r(357);
      var u = r(573);
      var i = r(614);
      if (typeof i !== 'function') {
        i = i.EventEmitter;
      }
      var o;
      if (process.__signal_exit_emitter__) {
        o = process.__signal_exit_emitter__;
      } else {
        o = process.__signal_exit_emitter__ = new i();
        o.count = 0;
        o.emitted = {};
      }
      if (!o.infinite) {
        o.setMaxListeners(Infinity);
        o.infinite = true;
      }
      e.exports = function(e, t) {
        n.equal(typeof e, 'function', 'a callback must be provided for exit handler');
        if (s === false) {
          load();
        }
        var r = 'exit';
        if (t && t.alwaysLast) {
          r = 'afterexit';
        }
        var u = function() {
          o.removeListener(r, e);
          if (o.listeners('exit').length === 0 && o.listeners('afterexit').length === 0) {
            unload();
          }
        };
        o.on(r, e);
        return u;
      };
      e.exports.unload = unload;
      function unload() {
        if (!s) {
          return;
        }
        s = false;
        u.forEach(function(e) {
          try {
            process.removeListener(e, a[e]);
          } catch (e) {}
        });
        process.emit = f;
        process.reallyExit = c;
        o.count -= 1;
      }
      function emit(e, t, r) {
        if (o.emitted[e]) {
          return;
        }
        o.emitted[e] = true;
        o.emit(e, t, r);
      }
      var a = {};
      u.forEach(function(e) {
        a[e] = function listener() {
          var t = process.listeners(e);
          if (t.length === o.count) {
            unload();
            emit('exit', null, e);
            emit('afterexit', null, e);
            process.kill(process.pid, e);
          }
        };
      });
      e.exports.signals = function() {
        return u;
      };
      e.exports.load = load;
      var s = false;
      function load() {
        if (s) {
          return;
        }
        s = true;
        o.count += 1;
        u = u.filter(function(e) {
          try {
            process.on(e, a[e]);
            return true;
          } catch (e) {
            return false;
          }
        });
        process.emit = processEmit;
        process.reallyExit = processReallyExit;
      }
      var c = process.reallyExit;
      function processReallyExit(e) {
        process.exitCode = e || 0;
        emit('exit', process.exitCode, null);
        emit('afterexit', process.exitCode, null);
        c.call(process, process.exitCode);
      }
      var f = process.emit;
      function processEmit(e, t) {
        if (e === 'exit') {
          if (t !== undefined) {
            process.exitCode = t;
          }
          var r = f.apply(this, arguments);
          emit('exit', process.exitCode, null);
          emit('afterexit', process.exitCode, null);
          return r;
        } else {
          return f.apply(this, arguments);
        }
      }
    },
    function(e, t, r) {
      'use strict';
      const n = r(622);
      function getRootPath(e) {
        e = n.normalize(n.resolve(e)).split(n.sep);
        if (e.length > 0) return e[0];
        return null;
      }
      const u = /[<>:"|?*]/;
      function invalidWin32Path(e) {
        const t = getRootPath(e);
        e = e.replace(t, '');
        return u.test(e);
      }
      e.exports = { getRootPath: getRootPath, invalidWin32Path: invalidWin32Path };
    },
    ,
    function(e, t, r) {
      'use strict';
      var n = r(331);
      var u = r(92);
      var i = r(77);
      e.exports = function isDescriptor(e, t) {
        if (n(e) !== 'object') {
          return false;
        }
        if ('get' in e) {
          return u(e, t);
        }
        return i(e, t);
      };
    },
    function(e, t, r) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      t.shouldHighlight = shouldHighlight;
      t.getChalk = getChalk;
      t.default = highlight;
      function _jsTokens() {
        const e = _interopRequireWildcard(r(537));
        _jsTokens = function() {
          return e;
        };
        return e;
      }
      function _esutils() {
        const e = _interopRequireDefault(r(499));
        _esutils = function() {
          return e;
        };
        return e;
      }
      function _chalk() {
        const e = _interopRequireDefault(r(313));
        _chalk = function() {
          return e;
        };
        return e;
      }
      function _interopRequireDefault(e) {
        return e && e.__esModule ? e : { default: e };
      }
      function _interopRequireWildcard(e) {
        if (e && e.__esModule) {
          return e;
        } else {
          var t = {};
          if (e != null) {
            for (var r in e) {
              if (Object.prototype.hasOwnProperty.call(e, r)) {
                var n =
                  Object.defineProperty && Object.getOwnPropertyDescriptor
                    ? Object.getOwnPropertyDescriptor(e, r)
                    : {};
                if (n.get || n.set) {
                  Object.defineProperty(t, r, n);
                } else {
                  t[r] = e[r];
                }
              }
            }
          }
          t.default = e;
          return t;
        }
      }
      function getDefs(e) {
        return {
          keyword: e.cyan,
          capitalized: e.yellow,
          jsx_tag: e.yellow,
          punctuator: e.yellow,
          number: e.magenta,
          string: e.green,
          regex: e.magenta,
          comment: e.grey,
          invalid: e.white.bgRed.bold,
        };
      }
      const n = /\r\n|[\n\r\u2028\u2029]/;
      const u = /^[a-z][\w-]*$/i;
      const i = /^[()[\]{}]$/;
      function getTokenType(e) {
        const [t, r] = e.slice(-2);
        const n = (0, _jsTokens().matchToToken)(e);
        if (n.type === 'name') {
          if (_esutils().default.keyword.isReservedWordES6(n.value)) {
            return 'keyword';
          }
          if (u.test(n.value) && (r[t - 1] === '<' || r.substr(t - 2, 2) == '</')) {
            return 'jsx_tag';
          }
          if (n.value[0] !== n.value[0].toLowerCase()) {
            return 'capitalized';
          }
        }
        if (n.type === 'punctuator' && i.test(n.value)) {
          return 'bracket';
        }
        if (n.type === 'invalid' && (n.value === '@' || n.value === '#')) {
          return 'punctuator';
        }
        return n.type;
      }
      function highlightTokens(e, t) {
        return t.replace(_jsTokens().default, function(...t) {
          const r = getTokenType(t);
          const u = e[r];
          if (u) {
            return t[0]
              .split(n)
              .map(e => u(e))
              .join('\n');
          } else {
            return t[0];
          }
        });
      }
      function shouldHighlight(e) {
        return _chalk().default.supportsColor || e.forceColor;
      }
      function getChalk(e) {
        let t = _chalk().default;
        if (e.forceColor) {
          t = new (_chalk()).default.constructor({ enabled: true, level: 1 });
        }
        return t;
      }
      function highlight(e, t = {}) {
        if (shouldHighlight(t)) {
          const r = getChalk(t);
          const n = getDefs(r);
          return highlightTokens(n, e);
        } else {
          return e;
        }
      }
    },
    ,
    function(e) {
      'use strict';
      e.exports = {
        alnum: 'a-zA-Z0-9',
        alpha: 'a-zA-Z',
        ascii: '\\x00-\\x7F',
        blank: ' \\t',
        cntrl: '\\x00-\\x1F\\x7F',
        digit: '0-9',
        graph: '\\x21-\\x7E',
        lower: 'a-z',
        print: '\\x20-\\x7E ',
        punct: '\\-!"#$%&\'()\\*+,./:;<=>?@[\\]^_`{|}~',
        space: ' \\t\\r\\n\\v\\f',
        upper: 'A-Z',
        word: 'A-Za-z0-9_',
        xdigit: 'A-Fa-f0-9',
      };
    },
    ,
    function(e, t, r) {
      'use strict';
      const n = r(729);
      const u = r(622);
      const i = r(425).invalidWin32Path;
      const o = parseInt('0777', 8);
      function mkdirs(e, t, r, a) {
        if (typeof t === 'function') {
          r = t;
          t = {};
        } else if (!t || typeof t !== 'object') {
          t = { mode: t };
        }
        if (process.platform === 'win32' && i(e)) {
          const t = new Error(e + ' contains invalid WIN32 path characters.');
          t.code = 'EINVAL';
          return r(t);
        }
        let s = t.mode;
        const c = t.fs || n;
        if (s === undefined) {
          s = o & ~process.umask();
        }
        if (!a) a = null;
        r = r || function() {};
        e = u.resolve(e);
        c.mkdir(e, s, n => {
          if (!n) {
            a = a || e;
            return r(null, a);
          }
          switch (n.code) {
            case 'ENOENT':
              if (u.dirname(e) === e) return r(n);
              mkdirs(u.dirname(e), t, (n, u) => {
                if (n) r(n, u);
                else mkdirs(e, t, r, u);
              });
              break;
            default:
              c.stat(e, (e, t) => {
                if (e || !t.isDirectory()) r(n, a);
                else r(null, a);
              });
              break;
          }
        });
      }
      e.exports = mkdirs;
    },
    ,
    ,
    function(e) {
      'use strict';
      e.exports = function unique(e) {
        if (!Array.isArray(e)) {
          throw new TypeError('array-unique expects an array.');
        }
        var t = e.length;
        var r = -1;
        while (r++ < t) {
          var n = r + 1;
          for (; n < e.length; ++n) {
            if (e[r] === e[n]) {
              e.splice(n--, 1);
            }
          }
        }
        return e;
      };
      e.exports.immutable = function uniqueImmutable(t) {
        if (!Array.isArray(t)) {
          throw new TypeError('array-unique expects an array.');
        }
        var r = t.length;
        var n = new Array(r);
        for (var u = 0; u < r; u++) {
          n[u] = t[u];
        }
        return e.exports(n);
      };
    },
    ,
    function(e, t, r) {
      var n = r(729);
      var u = r(622);
      var i = r(607);
      function ncp(e, t, r, o) {
        if (!o) {
          o = r;
          r = {};
        }
        var a = process.cwd();
        var s = u.resolve(a, e);
        var c = u.resolve(a, t);
        var f = r.filter;
        var l = r.transform;
        var p = r.overwrite;
        if (p === undefined) p = r.clobber;
        if (p === undefined) p = true;
        var h = r.errorOnExist;
        var d = r.dereference;
        var y = r.preserveTimestamps === true;
        var v = 0;
        var D = 0;
        var m = 0;
        var A = false;
        startCopy(s);
        function startCopy(e) {
          v++;
          if (f) {
            if (f instanceof RegExp) {
              console.warn(
                'Warning: fs-extra: Passing a RegExp filter is deprecated, use a function'
              );
              if (!f.test(e)) {
                return doneOne(true);
              }
            } else if (typeof f === 'function') {
              if (!f(e, t)) {
                return doneOne(true);
              }
            }
          }
          return getStats(e);
        }
        function getStats(e) {
          var t = d ? n.stat : n.lstat;
          m++;
          t(e, function(t, r) {
            if (t) return onError(t);
            var n = { name: e, mode: r.mode, mtime: r.mtime, atime: r.atime, stats: r };
            if (r.isDirectory()) {
              return onDir(n);
            } else if (r.isFile() || r.isCharacterDevice() || r.isBlockDevice()) {
              return onFile(n);
            } else if (r.isSymbolicLink()) {
              return onLink(e);
            }
          });
        }
        function onFile(e) {
          var t = e.name.replace(s, c.replace('$', '$$$$'));
          isWritable(t, function(r) {
            if (r) {
              copyFile(e, t);
            } else {
              if (p) {
                rmFile(t, function() {
                  copyFile(e, t);
                });
              } else if (h) {
                onError(new Error(t + ' already exists'));
              } else {
                doneOne();
              }
            }
          });
        }
        function copyFile(e, t) {
          var r = n.createReadStream(e.name);
          var u = n.createWriteStream(t, { mode: e.mode });
          r.on('error', onError);
          u.on('error', onError);
          if (l) {
            l(r, u, e);
          } else {
            u.on('open', function() {
              r.pipe(u);
            });
          }
          u.once('close', function() {
            n.chmod(t, e.mode, function(r) {
              if (r) return onError(r);
              if (y) {
                i.utimesMillis(t, e.atime, e.mtime, function(e) {
                  if (e) return onError(e);
                  return doneOne();
                });
              } else {
                doneOne();
              }
            });
          });
        }
        function rmFile(e, t) {
          n.unlink(e, function(e) {
            if (e) return onError(e);
            return t();
          });
        }
        function onDir(e) {
          var t = e.name.replace(s, c.replace('$', '$$$$'));
          isWritable(t, function(r) {
            if (r) {
              return mkDir(e, t);
            }
            copyDir(e.name);
          });
        }
        function mkDir(e, t) {
          n.mkdir(t, e.mode, function(r) {
            if (r) return onError(r);
            n.chmod(t, e.mode, function(t) {
              if (t) return onError(t);
              copyDir(e.name);
            });
          });
        }
        function copyDir(e) {
          n.readdir(e, function(t, r) {
            if (t) return onError(t);
            r.forEach(function(t) {
              startCopy(u.join(e, t));
            });
            return doneOne();
          });
        }
        function onLink(e) {
          var t = e.replace(s, c);
          n.readlink(e, function(e, r) {
            if (e) return onError(e);
            checkLink(r, t);
          });
        }
        function checkLink(e, t) {
          if (d) {
            e = u.resolve(a, e);
          }
          isWritable(t, function(r) {
            if (r) {
              return makeLink(e, t);
            }
            n.readlink(t, function(r, n) {
              if (r) return onError(r);
              if (d) {
                n = u.resolve(a, n);
              }
              if (n === e) {
                return doneOne();
              }
              return rmFile(t, function() {
                makeLink(e, t);
              });
            });
          });
        }
        function makeLink(e, t) {
          n.symlink(e, t, function(e) {
            if (e) return onError(e);
            return doneOne();
          });
        }
        function isWritable(e, t) {
          n.lstat(e, function(e) {
            if (e) {
              if (e.code === 'ENOENT') return t(true);
              return t(false);
            }
            return t(false);
          });
        }
        function onError(e) {
          if (!A && o !== undefined) {
            A = true;
            return o(e);
          }
        }
        function doneOne(e) {
          if (!e) m--;
          D++;
          if (v === D && m === 0) {
            if (o !== undefined) {
              return o(null);
            }
          }
        }
      }
      e.exports = ncp;
    },
    function(e, t, r) {
      'use strict';
      var n = e.exports;
      var u = r(622);
      var i = r(556)();
      var o = r(440);
      n.define = r(542);
      n.diff = r(186);
      n.extend = r(965);
      n.pick = r(520);
      n.typeOf = r(108);
      n.unique = r(156);
      n.isEmptyString = function(e) {
        return String(e) === '' || String(e) === './';
      };
      n.isWindows = function() {
        return u.sep === '\\' || i === true;
      };
      n.last = function(e, t) {
        return e[e.length - (t || 1)];
      };
      n.instantiate = function(e, t) {
        var r;
        if (n.typeOf(e) === 'object' && e.snapdragon) {
          r = e.snapdragon;
        } else if (n.typeOf(t) === 'object' && t.snapdragon) {
          r = t.snapdragon;
        } else {
          r = new o(t);
        }
        n.define(r, 'parse', function(e, t) {
          var r = o.prototype.parse.call(this, e, t);
          r.input = e;
          var u = this.parser.stack.pop();
          if (u && this.options.strictErrors !== true) {
            var i = u.nodes[0];
            var a = u.nodes[1];
            if (u.type === 'bracket') {
              if (a.val.charAt(0) === '[') {
                a.val = '\\' + a.val;
              }
            } else {
              i.val = '\\' + i.val;
              var s = i.parent.nodes[1];
              if (s.type === 'star') {
                s.loose = true;
              }
            }
          }
          n.define(r, 'parser', this.parser);
          return r;
        });
        return r;
      };
      n.createKey = function(e, t) {
        if (typeof t === 'undefined') {
          return e;
        }
        var r = e;
        for (var n in t) {
          if (t.hasOwnProperty(n)) {
            r += ';' + n + '=' + String(t[n]);
          }
        }
        return r;
      };
      n.arrayify = function(e) {
        if (typeof e === 'string') return [e];
        return e ? (Array.isArray(e) ? e : [e]) : [];
      };
      n.isString = function(e) {
        return typeof e === 'string';
      };
      n.isRegex = function(e) {
        return n.typeOf(e) === 'regexp';
      };
      n.isObject = function(e) {
        return n.typeOf(e) === 'object';
      };
      n.escapeRegex = function(e) {
        return e.replace(/[-[\]{}()^$|*+?.\\\/\s]/g, '\\$&');
      };
      n.combineDupes = function(e, t) {
        t = n
          .arrayify(t)
          .join('|')
          .split('|');
        t = t.map(function(e) {
          return e.replace(/\\?([+*\\\/])/g, '\\$1');
        });
        var r = t.join('|');
        var u = new RegExp('(' + r + ')(?=\\1)', 'g');
        return e.replace(u, '');
      };
      n.hasSpecialChars = function(e) {
        return /(?:(?:(^|\/)[!.])|[*?+()|[\]{}]|[+@]\()/.test(e);
      };
      n.toPosixPath = function(e) {
        return e.replace(/\\+/g, '/');
      };
      n.unescape = function(e) {
        return n.toPosixPath(e.replace(/\\(?=[*+?!.])/g, ''));
      };
      n.stripDrive = function(e) {
        return n.isWindows() ? e.replace(/^[a-z]:[\\\/]+?/i, '/') : e;
      };
      n.stripPrefix = function(e) {
        if (e.charAt(0) === '.' && (e.charAt(1) === '/' || e.charAt(1) === '\\')) {
          return e.slice(2);
        }
        return e;
      };
      n.isSimpleChar = function(e) {
        return e.trim() === '' || e === '.';
      };
      n.isSlash = function(e) {
        return e === '/' || e === '\\/' || e === '\\' || e === '\\\\';
      };
      n.matchPath = function(e, t) {
        return t && t.contains ? n.containsPattern(e, t) : n.equalsPattern(e, t);
      };
      n._equals = function(e, t, r) {
        return r === e || r === t;
      };
      n._contains = function(e, t, r) {
        return e.indexOf(r) !== -1 || t.indexOf(r) !== -1;
      };
      n.equalsPattern = function(e, t) {
        var r = n.unixify(t);
        t = t || {};
        return function fn(u) {
          var i = n._equals(u, r(u), e);
          if (i === true || t.nocase !== true) {
            return i;
          }
          var o = u.toLowerCase();
          return n._equals(o, r(o), e);
        };
      };
      n.containsPattern = function(e, t) {
        var r = n.unixify(t);
        t = t || {};
        return function(u) {
          var i = n._contains(u, r(u), e);
          if (i === true || t.nocase !== true) {
            return i;
          }
          var o = u.toLowerCase();
          return n._contains(o, r(o), e);
        };
      };
      n.matchBasename = function(e) {
        return function(t) {
          return e.test(t) || e.test(u.basename(t));
        };
      };
      n.identity = function(e) {
        return e;
      };
      n.value = function(e, t, r) {
        if (r && r.unixify === false) {
          return e;
        }
        if (r && typeof r.unixify === 'function') {
          return r.unixify(e);
        }
        return t(e);
      };
      n.unixify = function(e) {
        var t = e || {};
        return function(e) {
          if (t.stripPrefix !== false) {
            e = n.stripPrefix(e);
          }
          if (t.unescape === true) {
            e = n.unescape(e);
          }
          if (t.unixify === true || n.isWindows()) {
            e = n.toPosixPath(e);
          }
          return e;
        };
      };
    },
    ,
    function(e, t, r) {
      var n = r(694);
      var u = {};
      for (var i in n) {
        if (n.hasOwnProperty(i)) {
          u[n[i]] = i;
        }
      }
      var o = (e.exports = {
        rgb: { channels: 3, labels: 'rgb' },
        hsl: { channels: 3, labels: 'hsl' },
        hsv: { channels: 3, labels: 'hsv' },
        hwb: { channels: 3, labels: 'hwb' },
        cmyk: { channels: 4, labels: 'cmyk' },
        xyz: { channels: 3, labels: 'xyz' },
        lab: { channels: 3, labels: 'lab' },
        lch: { channels: 3, labels: 'lch' },
        hex: { channels: 1, labels: ['hex'] },
        keyword: { channels: 1, labels: ['keyword'] },
        ansi16: { channels: 1, labels: ['ansi16'] },
        ansi256: { channels: 1, labels: ['ansi256'] },
        hcg: { channels: 3, labels: ['h', 'c', 'g'] },
        apple: { channels: 3, labels: ['r16', 'g16', 'b16'] },
        gray: { channels: 1, labels: ['gray'] },
      });
      for (var a in o) {
        if (o.hasOwnProperty(a)) {
          if (!('channels' in o[a])) {
            throw new Error('missing channels property: ' + a);
          }
          if (!('labels' in o[a])) {
            throw new Error('missing channel labels property: ' + a);
          }
          if (o[a].labels.length !== o[a].channels) {
            throw new Error('channel and label counts mismatch: ' + a);
          }
          var s = o[a].channels;
          var c = o[a].labels;
          delete o[a].channels;
          delete o[a].labels;
          Object.defineProperty(o[a], 'channels', { value: s });
          Object.defineProperty(o[a], 'labels', { value: c });
        }
      }
      o.rgb.hsl = function(e) {
        var t = e[0] / 255;
        var r = e[1] / 255;
        var n = e[2] / 255;
        var u = Math.min(t, r, n);
        var i = Math.max(t, r, n);
        var o = i - u;
        var a;
        var s;
        var c;
        if (i === u) {
          a = 0;
        } else if (t === i) {
          a = (r - n) / o;
        } else if (r === i) {
          a = 2 + (n - t) / o;
        } else if (n === i) {
          a = 4 + (t - r) / o;
        }
        a = Math.min(a * 60, 360);
        if (a < 0) {
          a += 360;
        }
        c = (u + i) / 2;
        if (i === u) {
          s = 0;
        } else if (c <= 0.5) {
          s = o / (i + u);
        } else {
          s = o / (2 - i - u);
        }
        return [a, s * 100, c * 100];
      };
      o.rgb.hsv = function(e) {
        var t;
        var r;
        var n;
        var u;
        var i;
        var o = e[0] / 255;
        var a = e[1] / 255;
        var s = e[2] / 255;
        var c = Math.max(o, a, s);
        var f = c - Math.min(o, a, s);
        var l = function(e) {
          return (c - e) / 6 / f + 1 / 2;
        };
        if (f === 0) {
          u = i = 0;
        } else {
          i = f / c;
          t = l(o);
          r = l(a);
          n = l(s);
          if (o === c) {
            u = n - r;
          } else if (a === c) {
            u = 1 / 3 + t - n;
          } else if (s === c) {
            u = 2 / 3 + r - t;
          }
          if (u < 0) {
            u += 1;
          } else if (u > 1) {
            u -= 1;
          }
        }
        return [u * 360, i * 100, c * 100];
      };
      o.rgb.hwb = function(e) {
        var t = e[0];
        var r = e[1];
        var n = e[2];
        var u = o.rgb.hsl(e)[0];
        var i = 1 / 255 * Math.min(t, Math.min(r, n));
        n = 1 - 1 / 255 * Math.max(t, Math.max(r, n));
        return [u, i * 100, n * 100];
      };
      o.rgb.cmyk = function(e) {
        var t = e[0] / 255;
        var r = e[1] / 255;
        var n = e[2] / 255;
        var u;
        var i;
        var o;
        var a;
        a = Math.min(1 - t, 1 - r, 1 - n);
        u = (1 - t - a) / (1 - a) || 0;
        i = (1 - r - a) / (1 - a) || 0;
        o = (1 - n - a) / (1 - a) || 0;
        return [u * 100, i * 100, o * 100, a * 100];
      };
      function comparativeDistance(e, t) {
        return Math.pow(e[0] - t[0], 2) + Math.pow(e[1] - t[1], 2) + Math.pow(e[2] - t[2], 2);
      }
      o.rgb.keyword = function(e) {
        var t = u[e];
        if (t) {
          return t;
        }
        var r = Infinity;
        var i;
        for (var o in n) {
          if (n.hasOwnProperty(o)) {
            var a = n[o];
            var s = comparativeDistance(e, a);
            if (s < r) {
              r = s;
              i = o;
            }
          }
        }
        return i;
      };
      o.keyword.rgb = function(e) {
        return n[e];
      };
      o.rgb.xyz = function(e) {
        var t = e[0] / 255;
        var r = e[1] / 255;
        var n = e[2] / 255;
        t = t > 0.04045 ? Math.pow((t + 0.055) / 1.055, 2.4) : t / 12.92;
        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        n = n > 0.04045 ? Math.pow((n + 0.055) / 1.055, 2.4) : n / 12.92;
        var u = t * 0.4124 + r * 0.3576 + n * 0.1805;
        var i = t * 0.2126 + r * 0.7152 + n * 0.0722;
        var o = t * 0.0193 + r * 0.1192 + n * 0.9505;
        return [u * 100, i * 100, o * 100];
      };
      o.rgb.lab = function(e) {
        var t = o.rgb.xyz(e);
        var r = t[0];
        var n = t[1];
        var u = t[2];
        var i;
        var a;
        var s;
        r /= 95.047;
        n /= 100;
        u /= 108.883;
        r = r > 0.008856 ? Math.pow(r, 1 / 3) : 7.787 * r + 16 / 116;
        n = n > 0.008856 ? Math.pow(n, 1 / 3) : 7.787 * n + 16 / 116;
        u = u > 0.008856 ? Math.pow(u, 1 / 3) : 7.787 * u + 16 / 116;
        i = 116 * n - 16;
        a = 500 * (r - n);
        s = 200 * (n - u);
        return [i, a, s];
      };
      o.hsl.rgb = function(e) {
        var t = e[0] / 360;
        var r = e[1] / 100;
        var n = e[2] / 100;
        var u;
        var i;
        var o;
        var a;
        var s;
        if (r === 0) {
          s = n * 255;
          return [s, s, s];
        }
        if (n < 0.5) {
          i = n * (1 + r);
        } else {
          i = n + r - n * r;
        }
        u = 2 * n - i;
        a = [0, 0, 0];
        for (var c = 0; c < 3; c++) {
          o = t + 1 / 3 * -(c - 1);
          if (o < 0) {
            o++;
          }
          if (o > 1) {
            o--;
          }
          if (6 * o < 1) {
            s = u + (i - u) * 6 * o;
          } else if (2 * o < 1) {
            s = i;
          } else if (3 * o < 2) {
            s = u + (i - u) * (2 / 3 - o) * 6;
          } else {
            s = u;
          }
          a[c] = s * 255;
        }
        return a;
      };
      o.hsl.hsv = function(e) {
        var t = e[0];
        var r = e[1] / 100;
        var n = e[2] / 100;
        var u = r;
        var i = Math.max(n, 0.01);
        var o;
        var a;
        n *= 2;
        r *= n <= 1 ? n : 2 - n;
        u *= i <= 1 ? i : 2 - i;
        a = (n + r) / 2;
        o = n === 0 ? 2 * u / (i + u) : 2 * r / (n + r);
        return [t, o * 100, a * 100];
      };
      o.hsv.rgb = function(e) {
        var t = e[0] / 60;
        var r = e[1] / 100;
        var n = e[2] / 100;
        var u = Math.floor(t) % 6;
        var i = t - Math.floor(t);
        var o = 255 * n * (1 - r);
        var a = 255 * n * (1 - r * i);
        var s = 255 * n * (1 - r * (1 - i));
        n *= 255;
        switch (u) {
          case 0:
            return [n, s, o];
          case 1:
            return [a, n, o];
          case 2:
            return [o, n, s];
          case 3:
            return [o, a, n];
          case 4:
            return [s, o, n];
          case 5:
            return [n, o, a];
        }
      };
      o.hsv.hsl = function(e) {
        var t = e[0];
        var r = e[1] / 100;
        var n = e[2] / 100;
        var u = Math.max(n, 0.01);
        var i;
        var o;
        var a;
        a = (2 - r) * n;
        i = (2 - r) * u;
        o = r * u;
        o /= i <= 1 ? i : 2 - i;
        o = o || 0;
        a /= 2;
        return [t, o * 100, a * 100];
      };
      o.hwb.rgb = function(e) {
        var t = e[0] / 360;
        var r = e[1] / 100;
        var n = e[2] / 100;
        var u = r + n;
        var i;
        var o;
        var a;
        var s;
        if (u > 1) {
          r /= u;
          n /= u;
        }
        i = Math.floor(6 * t);
        o = 1 - n;
        a = 6 * t - i;
        if ((i & 1) !== 0) {
          a = 1 - a;
        }
        s = r + a * (o - r);
        var c;
        var f;
        var l;
        switch (i) {
          default:
          case 6:
          case 0:
            c = o;
            f = s;
            l = r;
            break;
          case 1:
            c = s;
            f = o;
            l = r;
            break;
          case 2:
            c = r;
            f = o;
            l = s;
            break;
          case 3:
            c = r;
            f = s;
            l = o;
            break;
          case 4:
            c = s;
            f = r;
            l = o;
            break;
          case 5:
            c = o;
            f = r;
            l = s;
            break;
        }
        return [c * 255, f * 255, l * 255];
      };
      o.cmyk.rgb = function(e) {
        var t = e[0] / 100;
        var r = e[1] / 100;
        var n = e[2] / 100;
        var u = e[3] / 100;
        var i;
        var o;
        var a;
        i = 1 - Math.min(1, t * (1 - u) + u);
        o = 1 - Math.min(1, r * (1 - u) + u);
        a = 1 - Math.min(1, n * (1 - u) + u);
        return [i * 255, o * 255, a * 255];
      };
      o.xyz.rgb = function(e) {
        var t = e[0] / 100;
        var r = e[1] / 100;
        var n = e[2] / 100;
        var u;
        var i;
        var o;
        u = t * 3.2406 + r * -1.5372 + n * -0.4986;
        i = t * -0.9689 + r * 1.8758 + n * 0.0415;
        o = t * 0.0557 + r * -0.204 + n * 1.057;
        u = u > 0.0031308 ? 1.055 * Math.pow(u, 1 / 2.4) - 0.055 : u * 12.92;
        i = i > 0.0031308 ? 1.055 * Math.pow(i, 1 / 2.4) - 0.055 : i * 12.92;
        o = o > 0.0031308 ? 1.055 * Math.pow(o, 1 / 2.4) - 0.055 : o * 12.92;
        u = Math.min(Math.max(0, u), 1);
        i = Math.min(Math.max(0, i), 1);
        o = Math.min(Math.max(0, o), 1);
        return [u * 255, i * 255, o * 255];
      };
      o.xyz.lab = function(e) {
        var t = e[0];
        var r = e[1];
        var n = e[2];
        var u;
        var i;
        var o;
        t /= 95.047;
        r /= 100;
        n /= 108.883;
        t = t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116;
        r = r > 0.008856 ? Math.pow(r, 1 / 3) : 7.787 * r + 16 / 116;
        n = n > 0.008856 ? Math.pow(n, 1 / 3) : 7.787 * n + 16 / 116;
        u = 116 * r - 16;
        i = 500 * (t - r);
        o = 200 * (r - n);
        return [u, i, o];
      };
      o.lab.xyz = function(e) {
        var t = e[0];
        var r = e[1];
        var n = e[2];
        var u;
        var i;
        var o;
        i = (t + 16) / 116;
        u = r / 500 + i;
        o = i - n / 200;
        var a = Math.pow(i, 3);
        var s = Math.pow(u, 3);
        var c = Math.pow(o, 3);
        i = a > 0.008856 ? a : (i - 16 / 116) / 7.787;
        u = s > 0.008856 ? s : (u - 16 / 116) / 7.787;
        o = c > 0.008856 ? c : (o - 16 / 116) / 7.787;
        u *= 95.047;
        i *= 100;
        o *= 108.883;
        return [u, i, o];
      };
      o.lab.lch = function(e) {
        var t = e[0];
        var r = e[1];
        var n = e[2];
        var u;
        var i;
        var o;
        u = Math.atan2(n, r);
        i = u * 360 / 2 / Math.PI;
        if (i < 0) {
          i += 360;
        }
        o = Math.sqrt(r * r + n * n);
        return [t, o, i];
      };
      o.lch.lab = function(e) {
        var t = e[0];
        var r = e[1];
        var n = e[2];
        var u;
        var i;
        var o;
        o = n / 360 * 2 * Math.PI;
        u = r * Math.cos(o);
        i = r * Math.sin(o);
        return [t, u, i];
      };
      o.rgb.ansi16 = function(e) {
        var t = e[0];
        var r = e[1];
        var n = e[2];
        var u = 1 in arguments ? arguments[1] : o.rgb.hsv(e)[2];
        u = Math.round(u / 50);
        if (u === 0) {
          return 30;
        }
        var i =
          30 + ((Math.round(n / 255) << 2) | (Math.round(r / 255) << 1) | Math.round(t / 255));
        if (u === 2) {
          i += 60;
        }
        return i;
      };
      o.hsv.ansi16 = function(e) {
        return o.rgb.ansi16(o.hsv.rgb(e), e[2]);
      };
      o.rgb.ansi256 = function(e) {
        var t = e[0];
        var r = e[1];
        var n = e[2];
        if (t === r && r === n) {
          if (t < 8) {
            return 16;
          }
          if (t > 248) {
            return 231;
          }
          return Math.round((t - 8) / 247 * 24) + 232;
        }
        var u =
          16 + 36 * Math.round(t / 255 * 5) + 6 * Math.round(r / 255 * 5) + Math.round(n / 255 * 5);
        return u;
      };
      o.ansi16.rgb = function(e) {
        var t = e % 10;
        if (t === 0 || t === 7) {
          if (e > 50) {
            t += 3.5;
          }
          t = t / 10.5 * 255;
          return [t, t, t];
        }
        var r = (~~(e > 50) + 1) * 0.5;
        var n = (t & 1) * r * 255;
        var u = ((t >> 1) & 1) * r * 255;
        var i = ((t >> 2) & 1) * r * 255;
        return [n, u, i];
      };
      o.ansi256.rgb = function(e) {
        if (e >= 232) {
          var t = (e - 232) * 10 + 8;
          return [t, t, t];
        }
        e -= 16;
        var r;
        var n = Math.floor(e / 36) / 5 * 255;
        var u = Math.floor((r = e % 36) / 6) / 5 * 255;
        var i = (r % 6) / 5 * 255;
        return [n, u, i];
      };
      o.rgb.hex = function(e) {
        var t =
          ((Math.round(e[0]) & 255) << 16) +
          ((Math.round(e[1]) & 255) << 8) +
          (Math.round(e[2]) & 255);
        var r = t.toString(16).toUpperCase();
        return '000000'.substring(r.length) + r;
      };
      o.hex.rgb = function(e) {
        var t = e.toString(16).match(/[a-f0-9]{6}|[a-f0-9]{3}/i);
        if (!t) {
          return [0, 0, 0];
        }
        var r = t[0];
        if (t[0].length === 3) {
          r = r
            .split('')
            .map(function(e) {
              return e + e;
            })
            .join('');
        }
        var n = parseInt(r, 16);
        var u = (n >> 16) & 255;
        var i = (n >> 8) & 255;
        var o = n & 255;
        return [u, i, o];
      };
      o.rgb.hcg = function(e) {
        var t = e[0] / 255;
        var r = e[1] / 255;
        var n = e[2] / 255;
        var u = Math.max(Math.max(t, r), n);
        var i = Math.min(Math.min(t, r), n);
        var o = u - i;
        var a;
        var s;
        if (o < 1) {
          a = i / (1 - o);
        } else {
          a = 0;
        }
        if (o <= 0) {
          s = 0;
        } else if (u === t) {
          s = ((r - n) / o) % 6;
        } else if (u === r) {
          s = 2 + (n - t) / o;
        } else {
          s = 4 + (t - r) / o + 4;
        }
        s /= 6;
        s %= 1;
        return [s * 360, o * 100, a * 100];
      };
      o.hsl.hcg = function(e) {
        var t = e[1] / 100;
        var r = e[2] / 100;
        var n = 1;
        var u = 0;
        if (r < 0.5) {
          n = 2 * t * r;
        } else {
          n = 2 * t * (1 - r);
        }
        if (n < 1) {
          u = (r - 0.5 * n) / (1 - n);
        }
        return [e[0], n * 100, u * 100];
      };
      o.hsv.hcg = function(e) {
        var t = e[1] / 100;
        var r = e[2] / 100;
        var n = t * r;
        var u = 0;
        if (n < 1) {
          u = (r - n) / (1 - n);
        }
        return [e[0], n * 100, u * 100];
      };
      o.hcg.rgb = function(e) {
        var t = e[0] / 360;
        var r = e[1] / 100;
        var n = e[2] / 100;
        if (r === 0) {
          return [n * 255, n * 255, n * 255];
        }
        var u = [0, 0, 0];
        var i = (t % 1) * 6;
        var o = i % 1;
        var a = 1 - o;
        var s = 0;
        switch (Math.floor(i)) {
          case 0:
            u[0] = 1;
            u[1] = o;
            u[2] = 0;
            break;
          case 1:
            u[0] = a;
            u[1] = 1;
            u[2] = 0;
            break;
          case 2:
            u[0] = 0;
            u[1] = 1;
            u[2] = o;
            break;
          case 3:
            u[0] = 0;
            u[1] = a;
            u[2] = 1;
            break;
          case 4:
            u[0] = o;
            u[1] = 0;
            u[2] = 1;
            break;
          default:
            u[0] = 1;
            u[1] = 0;
            u[2] = a;
        }
        s = (1 - r) * n;
        return [(r * u[0] + s) * 255, (r * u[1] + s) * 255, (r * u[2] + s) * 255];
      };
      o.hcg.hsv = function(e) {
        var t = e[1] / 100;
        var r = e[2] / 100;
        var n = t + r * (1 - t);
        var u = 0;
        if (n > 0) {
          u = t / n;
        }
        return [e[0], u * 100, n * 100];
      };
      o.hcg.hsl = function(e) {
        var t = e[1] / 100;
        var r = e[2] / 100;
        var n = r * (1 - t) + 0.5 * t;
        var u = 0;
        if (n > 0 && n < 0.5) {
          u = t / (2 * n);
        } else if (n >= 0.5 && n < 1) {
          u = t / (2 * (1 - n));
        }
        return [e[0], u * 100, n * 100];
      };
      o.hcg.hwb = function(e) {
        var t = e[1] / 100;
        var r = e[2] / 100;
        var n = t + r * (1 - t);
        return [e[0], (n - t) * 100, (1 - n) * 100];
      };
      o.hwb.hcg = function(e) {
        var t = e[1] / 100;
        var r = e[2] / 100;
        var n = 1 - r;
        var u = n - t;
        var i = 0;
        if (u < 1) {
          i = (n - u) / (1 - u);
        }
        return [e[0], u * 100, i * 100];
      };
      o.apple.rgb = function(e) {
        return [e[0] / 65535 * 255, e[1] / 65535 * 255, e[2] / 65535 * 255];
      };
      o.rgb.apple = function(e) {
        return [e[0] / 255 * 65535, e[1] / 255 * 65535, e[2] / 255 * 65535];
      };
      o.gray.rgb = function(e) {
        return [e[0] / 100 * 255, e[0] / 100 * 255, e[0] / 100 * 255];
      };
      o.gray.hsl = o.gray.hsv = function(e) {
        return [0, 0, e[0]];
      };
      o.gray.hwb = function(e) {
        return [0, 100, e[0]];
      };
      o.gray.cmyk = function(e) {
        return [0, 0, 0, e[0]];
      };
      o.gray.lab = function(e) {
        return [e[0], 0, 0];
      };
      o.gray.hex = function(e) {
        var t = Math.round(e[0] / 100 * 255) & 255;
        var r = (t << 16) + (t << 8) + t;
        var n = r.toString(16).toUpperCase();
        return '000000'.substring(n.length) + n;
      };
      o.rgb.gray = function(e) {
        var t = (e[0] + e[1] + e[2]) / 3;
        return [t / 255 * 100];
      };
    },
    function(e, t, r) {
      var n = r(106);
      var u = r(980);
      var i = r(762);
      var o = r(405);
      var a = r(597);
      function callbackAsync(e, t, r) {
        setImmediate(function() {
          e(t, r);
        });
      }
      function parseMapToJSON(e, t) {
        try {
          return JSON.parse(e.replace(/^\)\]\}'/, ''));
        } catch (e) {
          e.sourceMapData = t;
          throw e;
        }
      }
      function readSync(e, t, r) {
        var n = i(t);
        try {
          return String(e(n));
        } catch (e) {
          e.sourceMapData = r;
          throw e;
        }
      }
      function resolveSourceMap(e, t, r, n) {
        var u;
        try {
          u = resolveSourceMapHelper(e, t);
        } catch (e) {
          return callbackAsync(n, e);
        }
        if (!u || u.map) {
          return callbackAsync(n, null, u);
        }
        var o = i(u.url);
        r(o, function(e, t) {
          if (e) {
            e.sourceMapData = u;
            return n(e);
          }
          u.map = String(t);
          try {
            u.map = parseMapToJSON(u.map, u);
          } catch (e) {
            return n(e);
          }
          n(null, u);
        });
      }
      function resolveSourceMapSync(e, t, r) {
        var n = resolveSourceMapHelper(e, t);
        if (!n || n.map) {
          return n;
        }
        n.map = readSync(r, n.url, n);
        n.map = parseMapToJSON(n.map, n);
        return n;
      }
      var s = /^data:([^,;]*)(;[^,;]*)*(?:,(.*))?$/;
      var c = /^(?:application|text)\/json$/;
      function resolveSourceMapHelper(e, t) {
        t = o(t);
        var r = n.getFrom(e);
        if (!r) {
          return null;
        }
        var i = r.match(s);
        if (i) {
          var f = i[1];
          var l = i[2] || '';
          var p = i[3] || '';
          var h = { sourceMappingURL: r, url: null, sourcesRelativeTo: t, map: p };
          if (!c.test(f)) {
            var d = new Error('Unuseful data uri mime type: ' + (f || 'text/plain'));
            d.sourceMapData = h;
            throw d;
          }
          h.map = parseMapToJSON(l === ';base64' ? a(p) : decodeURIComponent(p), h);
          return h;
        }
        var y = u(t, r);
        return { sourceMappingURL: r, url: y, sourcesRelativeTo: y, map: null };
      }
      function resolveSources(e, t, r, n, u) {
        if (typeof n === 'function') {
          u = n;
          n = {};
        }
        var o = e.sources ? e.sources.length : 0;
        var a = { sourcesResolved: [], sourcesContent: [] };
        if (o === 0) {
          callbackAsync(u, null, a);
          return;
        }
        var s = function() {
          o--;
          if (o === 0) {
            u(null, a);
          }
        };
        resolveSourcesHelper(e, t, n, function(e, t, n) {
          a.sourcesResolved[n] = e;
          if (typeof t === 'string') {
            a.sourcesContent[n] = t;
            callbackAsync(s, null);
          } else {
            var u = i(e);
            r(u, function(e, t) {
              a.sourcesContent[n] = e ? e : String(t);
              s();
            });
          }
        });
      }
      function resolveSourcesSync(e, t, r, n) {
        var u = { sourcesResolved: [], sourcesContent: [] };
        if (!e.sources || e.sources.length === 0) {
          return u;
        }
        resolveSourcesHelper(e, t, n, function(e, t, n) {
          u.sourcesResolved[n] = e;
          if (r !== null) {
            if (typeof t === 'string') {
              u.sourcesContent[n] = t;
            } else {
              var o = i(e);
              try {
                u.sourcesContent[n] = String(r(o));
              } catch (e) {
                u.sourcesContent[n] = e;
              }
            }
          }
        });
        return u;
      }
      var f = /\/?$/;
      function resolveSourcesHelper(e, t, r, n) {
        r = r || {};
        t = o(t);
        var i;
        var a;
        var s;
        for (var c = 0, l = e.sources.length; c < l; c++) {
          s = null;
          if (typeof r.sourceRoot === 'string') {
            s = r.sourceRoot;
          } else if (typeof e.sourceRoot === 'string' && r.sourceRoot !== false) {
            s = e.sourceRoot;
          }
          if (s === null || s === '') {
            i = u(t, e.sources[c]);
          } else {
            i = u(t, s.replace(f, '/'), e.sources[c]);
          }
          a = (e.sourcesContent || [])[c];
          n(i, a, c);
        }
      }
      function resolve(e, t, r, n, u) {
        if (typeof n === 'function') {
          u = n;
          n = {};
        }
        if (e === null) {
          var o = t;
          var a = { sourceMappingURL: null, url: o, sourcesRelativeTo: o, map: null };
          var s = i(o);
          r(s, function(e, t) {
            if (e) {
              e.sourceMapData = a;
              return u(e);
            }
            a.map = String(t);
            try {
              a.map = parseMapToJSON(a.map, a);
            } catch (e) {
              return u(e);
            }
            _resolveSources(a);
          });
        } else {
          resolveSourceMap(e, t, r, function(e, t) {
            if (e) {
              return u(e);
            }
            if (!t) {
              return u(null, null);
            }
            _resolveSources(t);
          });
        }
        function _resolveSources(e) {
          resolveSources(e.map, e.sourcesRelativeTo, r, n, function(t, r) {
            if (t) {
              return u(t);
            }
            e.sourcesResolved = r.sourcesResolved;
            e.sourcesContent = r.sourcesContent;
            u(null, e);
          });
        }
      }
      function resolveSync(e, t, r, n) {
        var u;
        if (e === null) {
          var i = t;
          u = { sourceMappingURL: null, url: i, sourcesRelativeTo: i, map: null };
          u.map = readSync(r, i, u);
          u.map = parseMapToJSON(u.map, u);
        } else {
          u = resolveSourceMapSync(e, t, r);
          if (!u) {
            return null;
          }
        }
        var o = resolveSourcesSync(u.map, u.sourcesRelativeTo, r, n);
        u.sourcesResolved = o.sourcesResolved;
        u.sourcesContent = o.sourcesContent;
        return u;
      }
      e.exports = {
        resolveSourceMap: resolveSourceMap,
        resolveSourceMapSync: resolveSourceMapSync,
        resolveSources: resolveSources,
        resolveSourcesSync: resolveSourcesSync,
        resolve: resolve,
        resolveSync: resolveSync,
        parseMapToJSON: parseMapToJSON,
      };
    },
    function(e, t, r) {
      'use strict';
      var n = r(669);
      var u = r(358);
      var i = r(204);
      var o = r(678);
      var a = r(327);
      var s = r(789);
      var c = r(764);
      var f = r(727);
      var l = 1024 * 64;
      function micromatch(e, t, r) {
        t = f.arrayify(t);
        e = f.arrayify(e);
        var n = t.length;
        if (e.length === 0 || n === 0) {
          return [];
        }
        if (n === 1) {
          return micromatch.match(e, t[0], r);
        }
        var u = [];
        var i = [];
        var o = -1;
        while (++o < n) {
          var a = t[o];
          if (typeof a === 'string' && a.charCodeAt(0) === 33) {
            u.push.apply(u, micromatch.match(e, a.slice(1), r));
          } else {
            i.push.apply(i, micromatch.match(e, a, r));
          }
        }
        var s = f.diff(i, u);
        if (!r || r.nodupes !== false) {
          return f.unique(s);
        }
        return s;
      }
      micromatch.match = function(e, t, r) {
        if (Array.isArray(t)) {
          throw new TypeError('expected pattern to be a string');
        }
        var n = f.unixify(r);
        var u = memoize('match', t, r, micromatch.matcher);
        var i = [];
        e = f.arrayify(e);
        var o = e.length;
        var a = -1;
        while (++a < o) {
          var s = e[a];
          if (s === t || u(s)) {
            i.push(f.value(s, n, r));
          }
        }
        if (typeof r === 'undefined') {
          return f.unique(i);
        }
        if (i.length === 0) {
          if (r.failglob === true) {
            throw new Error('no matches found for "' + t + '"');
          }
          if (r.nonull === true || r.nullglob === true) {
            return [r.unescape ? f.unescape(t) : t];
          }
        }
        if (r.ignore) {
          i = micromatch.not(i, r.ignore, r);
        }
        return r.nodupes !== false ? f.unique(i) : i;
      };
      micromatch.isMatch = function(e, t, r) {
        if (typeof e !== 'string') {
          throw new TypeError('expected a string: "' + n.inspect(e) + '"');
        }
        if (isEmptyString(e) || isEmptyString(t)) {
          return false;
        }
        var u = f.equalsPattern(r);
        if (u(e)) {
          return true;
        }
        var i = memoize('isMatch', t, r, micromatch.matcher);
        return i(e);
      };
      micromatch.some = function(e, t, r) {
        if (typeof e === 'string') {
          e = [e];
        }
        for (var n = 0; n < e.length; n++) {
          if (micromatch(e[n], t, r).length === 1) {
            return true;
          }
        }
        return false;
      };
      micromatch.every = function(e, t, r) {
        if (typeof e === 'string') {
          e = [e];
        }
        for (var n = 0; n < e.length; n++) {
          if (micromatch(e[n], t, r).length !== 1) {
            return false;
          }
        }
        return true;
      };
      micromatch.any = function(e, t, r) {
        if (typeof e !== 'string') {
          throw new TypeError('expected a string: "' + n.inspect(e) + '"');
        }
        if (isEmptyString(e) || isEmptyString(t)) {
          return false;
        }
        if (typeof t === 'string') {
          t = [t];
        }
        for (var u = 0; u < t.length; u++) {
          if (micromatch.isMatch(e, t[u], r)) {
            return true;
          }
        }
        return false;
      };
      micromatch.all = function(e, t, r) {
        if (typeof e !== 'string') {
          throw new TypeError('expected a string: "' + n.inspect(e) + '"');
        }
        if (typeof t === 'string') {
          t = [t];
        }
        for (var u = 0; u < t.length; u++) {
          if (!micromatch.isMatch(e, t[u], r)) {
            return false;
          }
        }
        return true;
      };
      micromatch.not = function(e, t, r) {
        var n = o({}, r);
        var u = n.ignore;
        delete n.ignore;
        var i = f.unixify(n);
        e = f.arrayify(e).map(i);
        var a = f.diff(e, micromatch(e, t, n));
        if (u) {
          a = f.diff(a, micromatch(e, u));
        }
        return n.nodupes !== false ? f.unique(a) : a;
      };
      micromatch.contains = function(e, t, r) {
        if (typeof e !== 'string') {
          throw new TypeError('expected a string: "' + n.inspect(e) + '"');
        }
        if (typeof t === 'string') {
          if (isEmptyString(e) || isEmptyString(t)) {
            return false;
          }
          var u = f.equalsPattern(t, r);
          if (u(e)) {
            return true;
          }
          var i = f.containsPattern(t, r);
          if (i(e)) {
            return true;
          }
        }
        var a = o({}, r, { contains: true });
        return micromatch.any(e, t, a);
      };
      micromatch.matchBase = function(e, t) {
        if ((e && e.indexOf('/') !== -1) || !t) return false;
        return t.basename === true || t.matchBase === true;
      };
      micromatch.matchKeys = function(e, t, r) {
        if (!f.isObject(e)) {
          throw new TypeError('expected the first argument to be an object');
        }
        var n = micromatch(Object.keys(e), t, r);
        return f.pick(e, n);
      };
      micromatch.matcher = function matcher(e, t) {
        if (Array.isArray(e)) {
          return compose(e, t, matcher);
        }
        if (e instanceof RegExp) {
          return test(e);
        }
        if (!f.isString(e)) {
          throw new TypeError('expected pattern to be an array, string or regex');
        }
        if (!f.hasSpecialChars(e)) {
          if (t && t.nocase === true) {
            e = e.toLowerCase();
          }
          return f.matchPath(e, t);
        }
        var r = micromatch.makeRe(e, t);
        if (micromatch.matchBase(e, t)) {
          return f.matchBasename(r, t);
        }
        function test(e) {
          var r = f.equalsPattern(t);
          var n = f.unixify(t);
          return function(t) {
            if (r(t)) {
              return true;
            }
            if (e.test(n(t))) {
              return true;
            }
            return false;
          };
        }
        var n = test(r);
        Object.defineProperty(n, 'result', {
          configurable: true,
          enumerable: false,
          value: r.result,
        });
        return n;
      };
      micromatch.capture = function(e, t, r) {
        var n = micromatch.makeRe(e, o({ capture: true }, r));
        var u = f.unixify(r);
        function match() {
          return function(e) {
            var t = n.exec(u(e));
            if (!t) {
              return null;
            }
            return t.slice(1);
          };
        }
        var i = memoize('capture', e, r, match);
        return i(t);
      };
      micromatch.makeRe = function(e, t) {
        if (typeof e !== 'string') {
          throw new TypeError('expected pattern to be a string');
        }
        if (e.length > l) {
          throw new Error('expected pattern to be less than ' + l + ' characters');
        }
        function makeRe() {
          var r = micromatch.create(e, t);
          var n = [];
          var u = r.map(function(e) {
            e.ast.state = e.state;
            n.push(e.ast);
            return e.output;
          });
          var o = i(u.join('|'), t);
          Object.defineProperty(o, 'result', { configurable: true, enumerable: false, value: n });
          return o;
        }
        return memoize('makeRe', e, t, makeRe);
      };
      micromatch.braces = function(e, t) {
        if (typeof e !== 'string' && !Array.isArray(e)) {
          throw new TypeError('expected pattern to be an array or string');
        }
        function expand() {
          if ((t && t.nobrace === true) || !/\{.*\}/.test(e)) {
            return f.arrayify(e);
          }
          return u(e, t);
        }
        return memoize('braces', e, t, expand);
      };
      micromatch.braceExpand = function(e, t) {
        var r = o({}, t, { expand: true });
        return micromatch.braces(e, r);
      };
      micromatch.create = function(e, t) {
        return memoize('create', e, t, function() {
          function create(e, t) {
            return micromatch.compile(micromatch.parse(e, t), t);
          }
          e = micromatch.braces(e, t);
          var r = e.length;
          var n = -1;
          var u = [];
          while (++n < r) {
            u.push(create(e[n], t));
          }
          return u;
        });
      };
      micromatch.parse = function(e, t) {
        if (typeof e !== 'string') {
          throw new TypeError('expected a string');
        }
        function parse() {
          var r = f.instantiate(null, t);
          s(r, t);
          var n = r.parse(e, t);
          f.define(n, 'snapdragon', r);
          n.input = e;
          return n;
        }
        return memoize('parse', e, t, parse);
      };
      micromatch.compile = function(e, t) {
        if (typeof e === 'string') {
          e = micromatch.parse(e, t);
        }
        return memoize('compile', e.input, t, function() {
          var r = f.instantiate(e, t);
          a(r, t);
          return r.compile(e, t);
        });
      };
      micromatch.clearCache = function() {
        micromatch.cache.caches = {};
      };
      function isEmptyString(e) {
        return String(e) === '' || String(e) === './';
      }
      function compose(e, t, r) {
        var n;
        return memoize('compose', String(e), t, function() {
          return function(u) {
            if (!n) {
              n = [];
              for (var i = 0; i < e.length; i++) {
                n.push(r(e[i], t));
              }
            }
            var o = n.length;
            while (o--) {
              if (n[o](u) === true) {
                return true;
              }
            }
            return false;
          };
        });
      }
      function memoize(e, t, r, n) {
        var u = f.createKey(e + '=' + t, r);
        if (r && r.cache === false) {
          return n(t, r);
        }
        if (c.has(e, u)) {
          return c.get(e, u);
        }
        var i = n(t, r);
        c.set(e, u, i);
        return i;
      }
      micromatch.compilers = a;
      micromatch.parsers = s;
      micromatch.caches = c.caches;
      e.exports = micromatch;
    },
    ,
    function(e, t, r) {
      var n = r(567),
        u = r(351),
        i = r(540),
        o = r(834);
      var a = /[\\^$.*+?()[\]{}|]/g;
      var s = /^\[object .+?Constructor\]$/;
      var c = Function.prototype,
        f = Object.prototype;
      var l = c.toString;
      var p = f.hasOwnProperty;
      var h = RegExp(
        '^' +
          l
            .call(p)
            .replace(a, '\\$&')
            .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') +
          '$'
      );
      function baseIsNative(e) {
        if (!i(e) || u(e)) {
          return false;
        }
        var t = n(e) ? h : s;
        return t.test(o(e));
      }
      e.exports = baseIsNative;
    },
    ,
    ,
    ,
    ,
    function(e, t, r) {
      var n = r(165),
        u = r(195);
      function getNative(e, t) {
        var r = u(e, t);
        return n(r) ? r : undefined;
      }
      e.exports = getNative;
    },
    ,
    ,
    function(e, t, r) {
      var n = r(412),
        u = r(881),
        i = r(312);
      function mapCacheClear() {
        this.size = 0;
        this.__data__ = { hash: new n(), map: new (i || u)(), string: new n() };
      }
      e.exports = mapCacheClear;
    },
    function(e) {
      e.exports = wrappy;
      function wrappy(e, t) {
        if (e && t) return wrappy(e)(t);
        if (typeof e !== 'function') throw new TypeError('need wrapper function');
        Object.keys(e).forEach(function(t) {
          wrapper[t] = e[t];
        });
        return wrapper;
        function wrapper() {
          var t = new Array(arguments.length);
          for (var r = 0; r < t.length; r++) {
            t[r] = arguments[r];
          }
          var n = e.apply(this, t);
          var u = t[t.length - 1];
          if (typeof n === 'function' && n !== u) {
            Object.keys(u).forEach(function(e) {
              n[e] = u[e];
            });
          }
          return n;
        }
      }
    },
    function(e, t, r) {
      var n = r(229);
      var u = Object.prototype.toString;
      e.exports = function kindOf(e) {
        if (typeof e === 'undefined') {
          return 'undefined';
        }
        if (e === null) {
          return 'null';
        }
        if (e === true || e === false || e instanceof Boolean) {
          return 'boolean';
        }
        if (typeof e === 'string' || e instanceof String) {
          return 'string';
        }
        if (typeof e === 'number' || e instanceof Number) {
          return 'number';
        }
        if (typeof e === 'function' || e instanceof Function) {
          return 'function';
        }
        if (typeof Array.isArray !== 'undefined' && Array.isArray(e)) {
          return 'array';
        }
        if (e instanceof RegExp) {
          return 'regexp';
        }
        if (e instanceof Date) {
          return 'date';
        }
        var t = u.call(e);
        if (t === '[object RegExp]') {
          return 'regexp';
        }
        if (t === '[object Date]') {
          return 'date';
        }
        if (t === '[object Arguments]') {
          return 'arguments';
        }
        if (t === '[object Error]') {
          return 'error';
        }
        if (n(e)) {
          return 'buffer';
        }
        if (t === '[object Set]') {
          return 'set';
        }
        if (t === '[object WeakSet]') {
          return 'weakset';
        }
        if (t === '[object Map]') {
          return 'map';
        }
        if (t === '[object WeakMap]') {
          return 'weakmap';
        }
        if (t === '[object Symbol]') {
          return 'symbol';
        }
        if (t === '[object Int8Array]') {
          return 'int8array';
        }
        if (t === '[object Uint8Array]') {
          return 'uint8array';
        }
        if (t === '[object Uint8ClampedArray]') {
          return 'uint8clampedarray';
        }
        if (t === '[object Int16Array]') {
          return 'int16array';
        }
        if (t === '[object Uint16Array]') {
          return 'uint16array';
        }
        if (t === '[object Int32Array]') {
          return 'int32array';
        }
        if (t === '[object Uint32Array]') {
          return 'uint32array';
        }
        if (t === '[object Float32Array]') {
          return 'float32array';
        }
        if (t === '[object Float64Array]') {
          return 'float64array';
        }
        return 'object';
      };
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n =
        (this && this.__awaiter) ||
        function(e, t, r, n) {
          function adopt(e) {
            return e instanceof r
              ? e
              : new r(function(t) {
                  t(e);
                });
          }
          return new (r || (r = Promise))(function(r, u) {
            function fulfilled(e) {
              try {
                step(n.next(e));
              } catch (e) {
                u(e);
              }
            }
            function rejected(e) {
              try {
                step(n['throw'](e));
              } catch (e) {
                u(e);
              }
            }
            function step(e) {
              e.done ? r(e.value) : adopt(e.value).then(fulfilled, rejected);
            }
            step((n = n.apply(e, t || [])).next());
          });
        };
      var u =
        (this && this.__importDefault) ||
        function(e) {
          return e && e.__esModule ? e : { default: e };
        };
      Object.defineProperty(t, '__esModule', { value: true });
      const i = u(r(313));
      const o = r(550);
      const a = r(622);
      const s = r(25);
      const c = u(r(278));
      let f = '';
      const l = () => r(134);
      const p = new o.Command(l().name)
        .version(l().version)
        .arguments('<project-directory>')
        .usage(`${i.default.green('<project-directory>')} [options]`)
        .description('Compress the assets in your Expo project')
        .option('-s, --save', 'Save the original assets with a .orig extension')
        .option(
          '-q, --quality [number]',
          'Specify the quality the compressed image is reduced to. Default is 80'
        )
        .option(
          '-i, --include [pattern]',
          'Include only assets that match this glob pattern relative to the project root'
        )
        .option(
          '-e, --exclude [pattern]',
          'Exclude all assets that match this glob pattern relative to the project root'
        )
        .action(e => (f = e))
        .allowUnknownOption()
        .parse(process.argv);
      function run() {
        return n(this, void 0, void 0, function*() {
          if (typeof f === 'string') {
            f = f.trim();
          }
          const e = a.resolve(f);
          const t = {
            save: p.save,
            include: p.include,
            exclude: p.exclude,
            quality: parseQuality(),
          };
          const r = yield s.isProjectOptimized(e, t);
          if (!p.save && !r) {
            console.warn('This will overwrite the original assets.');
          }
          yield s.optimizeAsync(e, t);
        });
      }
      function parseQuality() {
        if (p.quality == null) {
          return undefined;
        }
        const e = Number(p.quality);
        if (!(Number.isInteger(e) && e > 0 && e <= 100)) {
          throw new Error(
            'Invalid value for --quality flag. Must be an integer between 1 and 100.'
          );
        }
        return e;
      }
      run()
        .then(c.default)
        .catch(e =>
          n(void 0, void 0, void 0, function*() {
            console.log();
            console.log('Aborting installation.');
            if (e.command) {
              console.log(`  ${i.default.magenta(e.command)} has failed.`);
            } else {
              console.log(
                i.default.red('An unexpected error was encountered. Please report it as a bug:')
              );
              console.log(e);
            }
            console.log();
            yield c.default();
            process.exit(1);
          })
        );
    },
    function(e, t, r) {
      'use strict';
      var n = r(375);
      var u = r(14);
      e.exports =
        Object.assign ||
        function(e) {
          if (e === null || typeof e === 'undefined') {
            throw new TypeError('Cannot convert undefined or null to object');
          }
          if (!isObject(e)) {
            e = {};
          }
          for (var t = 1; t < arguments.length; t++) {
            var r = arguments[t];
            if (isString(r)) {
              r = toObject(r);
            }
            if (isObject(r)) {
              assign(e, r);
              u(e, r);
            }
          }
          return e;
        };
      function assign(e, t) {
        for (var r in t) {
          if (hasOwn(t, r)) {
            e[r] = t[r];
          }
        }
      }
      function isString(e) {
        return e && typeof e === 'string';
      }
      function toObject(e) {
        var t = {};
        for (var r in e) {
          t[r] = e[r];
        }
        return t;
      }
      function isObject(e) {
        return (e && typeof e === 'object') || n(e);
      }
      function hasOwn(e, t) {
        return Object.prototype.hasOwnProperty.call(e, t);
      }
      function isEnum(e, t) {
        return Object.prototype.propertyIsEnumerable.call(e, t);
      }
    },
    ,
    function(e, t, r) {
      'use strict';
      const n = r(323).fromCallback;
      const u = r(622);
      const i = r(729);
      const o = r(467);
      const a = r(780).pathExists;
      function createLink(e, t, r) {
        function makeLink(e, t) {
          i.link(e, t, e => {
            if (e) return r(e);
            r(null);
          });
        }
        a(t, (n, s) => {
          if (n) return r(n);
          if (s) return r(null);
          i.lstat(e, n => {
            if (n) {
              n.message = n.message.replace('lstat', 'ensureLink');
              return r(n);
            }
            const i = u.dirname(t);
            a(i, (n, u) => {
              if (n) return r(n);
              if (u) return makeLink(e, t);
              o.mkdirs(i, n => {
                if (n) return r(n);
                makeLink(e, t);
              });
            });
          });
        });
      }
      function createLinkSync(e, t) {
        const r = i.existsSync(t);
        if (r) return undefined;
        try {
          i.lstatSync(e);
        } catch (e) {
          e.message = e.message.replace('lstat', 'ensureLink');
          throw e;
        }
        const n = u.dirname(t);
        const a = i.existsSync(n);
        if (a) return i.linkSync(e, t);
        o.mkdirsSync(n);
        return i.linkSync(e, t);
      }
      e.exports = { createLink: n(createLink), createLinkSync: createLinkSync };
    },
    ,
    function(e, t, r) {
      'use strict';
      const n = r(729);
      const u = r(622);
      const i = r(467).mkdirs;
      const o = r(780).pathExists;
      const a = r(936).utimesMillis;
      const s = Symbol('notExist');
      function copy(e, t, r, n) {
        if (typeof r === 'function' && !n) {
          n = r;
          r = {};
        } else if (typeof r === 'function') {
          r = { filter: r };
        }
        n = n || function() {};
        r = r || {};
        r.clobber = 'clobber' in r ? !!r.clobber : true;
        r.overwrite = 'overwrite' in r ? !!r.overwrite : r.clobber;
        if (r.preserveTimestamps && process.arch === 'ia32') {
          console.warn(
            `fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;\n\n    see https://github.com/jprichardson/node-fs-extra/issues/269`
          );
        }
        checkPaths(e, t, (u, i) => {
          if (u) return n(u);
          if (r.filter) return handleFilter(checkParentDir, i, e, t, r, n);
          return checkParentDir(i, e, t, r, n);
        });
      }
      function checkParentDir(e, t, r, n, a) {
        const s = u.dirname(r);
        o(s, (u, o) => {
          if (u) return a(u);
          if (o) return startCopy(e, t, r, n, a);
          i(s, u => {
            if (u) return a(u);
            return startCopy(e, t, r, n, a);
          });
        });
      }
      function handleFilter(e, t, r, n, u, i) {
        Promise.resolve(u.filter(r, n)).then(
          o => {
            if (o) {
              if (t) return e(t, r, n, u, i);
              return e(r, n, u, i);
            }
            return i();
          },
          e => i(e)
        );
      }
      function startCopy(e, t, r, n, u) {
        if (n.filter) return handleFilter(getStats, e, t, r, n, u);
        return getStats(e, t, r, n, u);
      }
      function getStats(e, t, r, u, i) {
        const o = u.dereference ? n.stat : n.lstat;
        o(t, (n, o) => {
          if (n) return i(n);
          if (o.isDirectory()) return onDir(o, e, t, r, u, i);
          else if (o.isFile() || o.isCharacterDevice() || o.isBlockDevice())
            return onFile(o, e, t, r, u, i);
          else if (o.isSymbolicLink()) return onLink(e, t, r, u, i);
        });
      }
      function onFile(e, t, r, n, u, i) {
        if (t === s) return copyFile(e, r, n, u, i);
        return mayCopyFile(e, r, n, u, i);
      }
      function mayCopyFile(e, t, r, u, i) {
        if (u.overwrite) {
          n.unlink(r, n => {
            if (n) return i(n);
            return copyFile(e, t, r, u, i);
          });
        } else if (u.errorOnExist) {
          return i(new Error(`'${r}' already exists`));
        } else return i();
      }
      function copyFile(e, t, r, u, i) {
        if (typeof n.copyFile === 'function') {
          return n.copyFile(t, r, t => {
            if (t) return i(t);
            return setDestModeAndTimestamps(e, r, u, i);
          });
        }
        return copyFileFallback(e, t, r, u, i);
      }
      function copyFileFallback(e, t, r, u, i) {
        const o = n.createReadStream(t);
        o.on('error', e => i(e)).once('open', () => {
          const t = n.createWriteStream(r, { mode: e.mode });
          t
            .on('error', e => i(e))
            .on('open', () => o.pipe(t))
            .once('close', () => setDestModeAndTimestamps(e, r, u, i));
        });
      }
      function setDestModeAndTimestamps(e, t, r, u) {
        n.chmod(t, e.mode, n => {
          if (n) return u(n);
          if (r.preserveTimestamps) {
            return a(t, e.atime, e.mtime, u);
          }
          return u();
        });
      }
      function onDir(e, t, r, n, u, i) {
        if (t === s) return mkDirAndCopy(e, r, n, u, i);
        if (t && !t.isDirectory()) {
          return i(new Error(`Cannot overwrite non-directory '${n}' with directory '${r}'.`));
        }
        return copyDir(r, n, u, i);
      }
      function mkDirAndCopy(e, t, r, u, i) {
        n.mkdir(r, o => {
          if (o) return i(o);
          copyDir(t, r, u, t => {
            if (t) return i(t);
            return n.chmod(r, e.mode, i);
          });
        });
      }
      function copyDir(e, t, r, u) {
        n.readdir(e, (n, i) => {
          if (n) return u(n);
          return copyDirItems(i, e, t, r, u);
        });
      }
      function copyDirItems(e, t, r, n, u) {
        const i = e.pop();
        if (!i) return u();
        return copyDirItem(e, i, t, r, n, u);
      }
      function copyDirItem(e, t, r, n, i, o) {
        const a = u.join(r, t);
        const s = u.join(n, t);
        checkPaths(a, s, (t, u) => {
          if (t) return o(t);
          startCopy(u, a, s, i, t => {
            if (t) return o(t);
            return copyDirItems(e, r, n, i, o);
          });
        });
      }
      function onLink(e, t, r, i, o) {
        n.readlink(t, (t, a) => {
          if (t) return o(t);
          if (i.dereference) {
            a = u.resolve(process.cwd(), a);
          }
          if (e === s) {
            return n.symlink(a, r, o);
          } else {
            n.readlink(r, (t, s) => {
              if (t) {
                if (t.code === 'EINVAL' || t.code === 'UNKNOWN') return n.symlink(a, r, o);
                return o(t);
              }
              if (i.dereference) {
                s = u.resolve(process.cwd(), s);
              }
              if (isSrcSubdir(a, s)) {
                return o(new Error(`Cannot copy '${a}' to a subdirectory of itself, '${s}'.`));
              }
              if (e.isDirectory() && isSrcSubdir(s, a)) {
                return o(new Error(`Cannot overwrite '${s}' with '${a}'.`));
              }
              return copyLink(a, r, o);
            });
          }
        });
      }
      function copyLink(e, t, r) {
        n.unlink(t, u => {
          if (u) return r(u);
          return n.symlink(e, t, r);
        });
      }
      function isSrcSubdir(e, t) {
        const r = u.resolve(e).split(u.sep);
        const n = u.resolve(t).split(u.sep);
        return r.reduce((e, t, r) => e && n[r] === t, true);
      }
      function checkStats(e, t, r) {
        n.stat(e, (e, u) => {
          if (e) return r(e);
          n.stat(t, (e, t) => {
            if (e) {
              if (e.code === 'ENOENT') return r(null, { srcStat: u, destStat: s });
              return r(e);
            }
            return r(null, { srcStat: u, destStat: t });
          });
        });
      }
      function checkPaths(e, t, r) {
        checkStats(e, t, (n, u) => {
          if (n) return r(n);
          const { srcStat: i, destStat: o } = u;
          if (o.ino && o.ino === i.ino) {
            return r(new Error('Source and destination must not be the same.'));
          }
          if (i.isDirectory() && isSrcSubdir(e, t)) {
            return r(new Error(`Cannot copy '${e}' to a subdirectory of itself, '${t}'.`));
          }
          return r(null, o);
        });
      }
      e.exports = copy;
    },
    ,
    ,
    function(e) {
      'use strict';
      e.exports = function diff(e) {
        var t = arguments.length;
        var r = 0;
        while (++r < t) {
          e = diffArray(e, arguments[r]);
        }
        return e;
      };
      function diffArray(e, t) {
        if (!Array.isArray(t)) {
          return e.slice();
        }
        var r = t.length;
        var n = e.length;
        var u = -1;
        var i = [];
        while (++u < n) {
          var o = e[u];
          var a = false;
          for (var s = 0; s < r; s++) {
            var c = t[s];
            if (o === c) {
              a = true;
              break;
            }
          }
          if (a === false) {
            i.push(o);
          }
        }
        return i;
      }
    },
    ,
    ,
    ,
    ,
    function(e, t, r) {
      var n = r(352);
      var u = function() {
        return [{ type: n.RANGE, from: 48, to: 57 }];
      };
      var i = function() {
        return [
          { type: n.CHAR, value: 95 },
          { type: n.RANGE, from: 97, to: 122 },
          { type: n.RANGE, from: 65, to: 90 },
        ].concat(u());
      };
      var o = function() {
        return [
          { type: n.CHAR, value: 9 },
          { type: n.CHAR, value: 10 },
          { type: n.CHAR, value: 11 },
          { type: n.CHAR, value: 12 },
          { type: n.CHAR, value: 13 },
          { type: n.CHAR, value: 32 },
          { type: n.CHAR, value: 160 },
          { type: n.CHAR, value: 5760 },
          { type: n.CHAR, value: 6158 },
          { type: n.CHAR, value: 8192 },
          { type: n.CHAR, value: 8193 },
          { type: n.CHAR, value: 8194 },
          { type: n.CHAR, value: 8195 },
          { type: n.CHAR, value: 8196 },
          { type: n.CHAR, value: 8197 },
          { type: n.CHAR, value: 8198 },
          { type: n.CHAR, value: 8199 },
          { type: n.CHAR, value: 8200 },
          { type: n.CHAR, value: 8201 },
          { type: n.CHAR, value: 8202 },
          { type: n.CHAR, value: 8232 },
          { type: n.CHAR, value: 8233 },
          { type: n.CHAR, value: 8239 },
          { type: n.CHAR, value: 8287 },
          { type: n.CHAR, value: 12288 },
          { type: n.CHAR, value: 65279 },
        ];
      };
      var a = function() {
        return [
          { type: n.CHAR, value: 10 },
          { type: n.CHAR, value: 13 },
          { type: n.CHAR, value: 8232 },
          { type: n.CHAR, value: 8233 },
        ];
      };
      t.words = function() {
        return { type: n.SET, set: i(), not: false };
      };
      t.notWords = function() {
        return { type: n.SET, set: i(), not: true };
      };
      t.ints = function() {
        return { type: n.SET, set: u(), not: false };
      };
      t.notInts = function() {
        return { type: n.SET, set: u(), not: true };
      };
      t.whitespace = function() {
        return { type: n.SET, set: o(), not: false };
      };
      t.notWhitespace = function() {
        return { type: n.SET, set: o(), not: true };
      };
      t.anyChar = function() {
        return { type: n.SET, set: a(), not: true };
      };
    },
    function(e, t, r) {
      'use strict';
      var n = r(18);
      e.exports = function extend(e) {
        if (!n(e)) {
          e = {};
        }
        var t = arguments.length;
        for (var r = 1; r < t; r++) {
          var u = arguments[r];
          if (n(u)) {
            assign(e, u);
          }
        }
        return e;
      };
      function assign(e, t) {
        for (var r in t) {
          if (hasOwn(t, r)) {
            e[r] = t[r];
          }
        }
      }
      function hasOwn(e, t) {
        return Object.prototype.hasOwnProperty.call(e, t);
      }
    },
    ,
    ,
    function(e) {
      function getValue(e, t) {
        return e == null ? undefined : e[t];
      }
      e.exports = getValue;
    },
    function(e, t) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      class JsonFileError extends Error {
        constructor(e, t, r) {
          let n = t ? `${e}\n└─ Cause: ${t.name}: ${t.message}` : e;
          super(n);
          this.name = this.constructor.name;
          this.cause = t;
          this.code = r;
          this.isJsonFileError = true;
        }
      }
      t.default = JsonFileError;
    },
    ,
    function(e, t, r) {
      'use strict';
      const n = r(729);
      const u = r(622);
      const i = r(158);
      const o = r(983);
      const a = r(917).pathExists;
      function copy(e, t, r, s) {
        if (typeof r === 'function' && !s) {
          s = r;
          r = {};
        } else if (typeof r === 'function' || r instanceof RegExp) {
          r = { filter: r };
        }
        s = s || function() {};
        r = r || {};
        if (r.preserveTimestamps && process.arch === 'ia32') {
          console.warn(
            `fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;\n\n    see https://github.com/jprichardson/node-fs-extra/issues/269`
          );
        }
        const c = process.cwd();
        const f = u.resolve(c, e);
        const l = u.resolve(c, t);
        if (f === l) return s(new Error('Source and destination must not be the same.'));
        n.lstat(e, (n, c) => {
          if (n) return s(n);
          let f = null;
          if (c.isDirectory()) {
            const e = t.split(u.sep);
            e.pop();
            f = e.join(u.sep);
          } else {
            f = u.dirname(t);
          }
          a(f, (n, u) => {
            if (n) return s(n);
            if (u) return i(e, t, r, s);
            o.mkdirs(f, n => {
              if (n) return s(n);
              i(e, t, r, s);
            });
          });
        });
      }
      e.exports = copy;
    },
    function(e, t, r) {
      var n = r(549);
      var u = Object.prototype;
      var i = u.hasOwnProperty;
      function hashHas(e) {
        var t = this.__data__;
        return n ? t[e] !== undefined : i.call(t, e);
      }
      e.exports = hashHas;
    },
    ,
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n = r(207);
      var u = r(626);
      var i = r(837);
      var o = r(844);
      var a = 1024 * 64;
      var s = {};
      e.exports = function(e, t) {
        if (!Array.isArray(e)) {
          return makeRe(e, t);
        }
        return makeRe(e.join('|'), t);
      };
      function makeRe(e, t) {
        if (e instanceof RegExp) {
          return e;
        }
        if (typeof e !== 'string') {
          throw new TypeError('expected a string');
        }
        if (e.length > a) {
          throw new Error('expected pattern to be less than ' + a + ' characters');
        }
        var r = e;
        if (!t || (t && t.cache !== false)) {
          r = createKey(e, t);
          if (s.hasOwnProperty(r)) {
            return s[r];
          }
        }
        var u = i({}, t);
        if (u.contains === true) {
          if (u.negate === true) {
            u.strictNegate = false;
          } else {
            u.strict = false;
          }
        }
        if (u.strict === false) {
          u.strictOpen = false;
          u.strictClose = false;
        }
        var c = u.strictOpen !== false ? '^' : '';
        var f = u.strictClose !== false ? '$' : '';
        var l = u.flags || '';
        var p;
        if (u.nocase === true && !/i/.test(l)) {
          l += 'i';
        }
        try {
          if (u.negate || typeof u.strictNegate === 'boolean') {
            e = o.create(e, u);
          }
          var h = c + '(?:' + e + ')' + f;
          p = new RegExp(h, l);
          if (u.safe === true && n(p) === false) {
            throw new Error('potentially unsafe regular expression: ' + p.source);
          }
        } catch (n) {
          if (u.strictErrors === true || u.safe === true) {
            n.key = r;
            n.pattern = e;
            n.originalOptions = t;
            n.createdOptions = u;
            throw n;
          }
          try {
            p = new RegExp('^' + e.replace(/(\W)/g, '\\$1') + '$');
          } catch (e) {
            p = /.^/;
          }
        }
        if (u.cache !== false) {
          memoize(p, r, e, u);
        }
        return p;
      }
      function memoize(e, t, r, n) {
        u(e, 'cached', true);
        u(e, 'pattern', r);
        u(e, 'options', n);
        u(e, 'key', t);
        s[t] = e;
      }
      function createKey(e, t) {
        if (!t) return e;
        var r = e;
        for (var n in t) {
          if (t.hasOwnProperty(n)) {
            r += ';' + n + '=' + String(t[n]);
          }
        }
        return r;
      }
      e.exports.makeRe = makeRe;
    },
    ,
    ,
    function(e, t, r) {
      var n = r(940);
      var u = n.types;
      e.exports = function(e, t) {
        if (!t) t = {};
        var r = t.limit === undefined ? 25 : t.limit;
        if (isRegExp(e)) e = e.source;
        else if (typeof e !== 'string') e = String(e);
        try {
          e = n(e);
        } catch (e) {
          return false;
        }
        var i = 0;
        return (function walk(e, t) {
          if (e.type === u.REPETITION) {
            t++;
            i++;
            if (t > 1) return false;
            if (i > r) return false;
          }
          if (e.options) {
            for (var n = 0, o = e.options.length; n < o; n++) {
              var a = walk({ stack: e.options[n] }, t);
              if (!a) return false;
            }
          }
          var s = e.stack || (e.value && e.value.stack);
          if (!s) return true;
          for (var n = 0; n < s.length; n++) {
            var a = walk(s[n], t);
            if (!a) return false;
          }
          return true;
        })(e, 0);
      };
      function isRegExp(e) {
        return {}.toString.call(e) === '[object RegExp]';
      }
    },
    ,
    ,
    ,
    function(e, t, r) {
      var n = r(897),
        u = r(116),
        i = r(342),
        o = r(540),
        a = r(1);
      function baseSet(e, t, r, s) {
        if (!o(e)) {
          return e;
        }
        t = u(t, e);
        var c = -1,
          f = t.length,
          l = f - 1,
          p = e;
        while (p != null && ++c < f) {
          var h = a(t[c]),
            d = r;
          if (c != l) {
            var y = p[h];
            d = s ? s(y, h, p) : undefined;
            if (d === undefined) {
              d = o(y) ? y : i(t[c + 1]) ? [] : {};
            }
          }
          n(p, h, d);
          p = p[h];
        }
        return e;
      }
      e.exports = baseSet;
    },
    ,
    ,
    ,
    function(e, t, r) {
      t.alphasort = alphasort;
      t.alphasorti = alphasorti;
      t.setopts = setopts;
      t.ownProp = ownProp;
      t.makeAbs = makeAbs;
      t.finish = finish;
      t.mark = mark;
      t.isIgnored = isIgnored;
      t.childrenIgnored = childrenIgnored;
      function ownProp(e, t) {
        return Object.prototype.hasOwnProperty.call(e, t);
      }
      var n = r(622);
      var u = r(904);
      var i = r(912);
      var o = u.Minimatch;
      function alphasorti(e, t) {
        return e.toLowerCase().localeCompare(t.toLowerCase());
      }
      function alphasort(e, t) {
        return e.localeCompare(t);
      }
      function setupIgnores(e, t) {
        e.ignore = t.ignore || [];
        if (!Array.isArray(e.ignore)) e.ignore = [e.ignore];
        if (e.ignore.length) {
          e.ignore = e.ignore.map(ignoreMap);
        }
      }
      function ignoreMap(e) {
        var t = null;
        if (e.slice(-3) === '/**') {
          var r = e.replace(/(\/\*\*)+$/, '');
          t = new o(r, { dot: true });
        }
        return { matcher: new o(e, { dot: true }), gmatcher: t };
      }
      function setopts(e, t, r) {
        if (!r) r = {};
        if (r.matchBase && -1 === t.indexOf('/')) {
          if (r.noglobstar) {
            throw new Error('base matching requires globstar');
          }
          t = '**/' + t;
        }
        e.silent = !!r.silent;
        e.pattern = t;
        e.strict = r.strict !== false;
        e.realpath = !!r.realpath;
        e.realpathCache = r.realpathCache || Object.create(null);
        e.follow = !!r.follow;
        e.dot = !!r.dot;
        e.mark = !!r.mark;
        e.nodir = !!r.nodir;
        if (e.nodir) e.mark = true;
        e.sync = !!r.sync;
        e.nounique = !!r.nounique;
        e.nonull = !!r.nonull;
        e.nosort = !!r.nosort;
        e.nocase = !!r.nocase;
        e.stat = !!r.stat;
        e.noprocess = !!r.noprocess;
        e.absolute = !!r.absolute;
        e.maxLength = r.maxLength || Infinity;
        e.cache = r.cache || Object.create(null);
        e.statCache = r.statCache || Object.create(null);
        e.symlinks = r.symlinks || Object.create(null);
        setupIgnores(e, r);
        e.changedCwd = false;
        var u = process.cwd();
        if (!ownProp(r, 'cwd')) e.cwd = u;
        else {
          e.cwd = n.resolve(r.cwd);
          e.changedCwd = e.cwd !== u;
        }
        e.root = r.root || n.resolve(e.cwd, '/');
        e.root = n.resolve(e.root);
        if (process.platform === 'win32') e.root = e.root.replace(/\\/g, '/');
        e.cwdAbs = i(e.cwd) ? e.cwd : makeAbs(e, e.cwd);
        if (process.platform === 'win32') e.cwdAbs = e.cwdAbs.replace(/\\/g, '/');
        e.nomount = !!r.nomount;
        r.nonegate = true;
        r.nocomment = true;
        e.minimatch = new o(t, r);
        e.options = e.minimatch.options;
      }
      function finish(e) {
        var t = e.nounique;
        var r = t ? [] : Object.create(null);
        for (var n = 0, u = e.matches.length; n < u; n++) {
          var i = e.matches[n];
          if (!i || Object.keys(i).length === 0) {
            if (e.nonull) {
              var o = e.minimatch.globSet[n];
              if (t) r.push(o);
              else r[o] = true;
            }
          } else {
            var a = Object.keys(i);
            if (t) r.push.apply(r, a);
            else
              a.forEach(function(e) {
                r[e] = true;
              });
          }
        }
        if (!t) r = Object.keys(r);
        if (!e.nosort) r = r.sort(e.nocase ? alphasorti : alphasort);
        if (e.mark) {
          for (var n = 0; n < r.length; n++) {
            r[n] = e._mark(r[n]);
          }
          if (e.nodir) {
            r = r.filter(function(t) {
              var r = !/\/$/.test(t);
              var n = e.cache[t] || e.cache[makeAbs(e, t)];
              if (r && n) r = n !== 'DIR' && !Array.isArray(n);
              return r;
            });
          }
        }
        if (e.ignore.length)
          r = r.filter(function(t) {
            return !isIgnored(e, t);
          });
        e.found = r;
      }
      function mark(e, t) {
        var r = makeAbs(e, t);
        var n = e.cache[r];
        var u = t;
        if (n) {
          var i = n === 'DIR' || Array.isArray(n);
          var o = t.slice(-1) === '/';
          if (i && !o) u += '/';
          else if (!i && o) u = u.slice(0, -1);
          if (u !== t) {
            var a = makeAbs(e, u);
            e.statCache[a] = e.statCache[r];
            e.cache[a] = e.cache[r];
          }
        }
        return u;
      }
      function makeAbs(e, t) {
        var r = t;
        if (t.charAt(0) === '/') {
          r = n.join(e.root, t);
        } else if (i(t) || t === '') {
          r = t;
        } else if (e.changedCwd) {
          r = n.resolve(e.cwd, t);
        } else {
          r = n.resolve(t);
        }
        if (process.platform === 'win32') r = r.replace(/\\/g, '/');
        return r;
      }
      function isIgnored(e, t) {
        if (!e.ignore.length) return false;
        return e.ignore.some(function(e) {
          return e.matcher.match(t) || !!(e.gmatcher && e.gmatcher.match(t));
        });
      }
      function childrenIgnored(e, t) {
        if (!e.ignore.length) return false;
        return e.ignore.some(function(e) {
          return !!(e.gmatcher && e.gmatcher.match(t));
        });
      }
    },
    ,
    function(e, t, r) {
      'use strict';
      const n = r(323).fromCallback;
      const u = r(729);
      const i = r(158);
      const o = r(622);
      const a = r(363).remove;
      const s = r(983).mkdirs;
      function move(e, t, r, n) {
        if (typeof r === 'function') {
          n = r;
          r = {};
        }
        const i = r.overwrite || r.clobber || false;
        isSrcSubdir(e, t, (r, u) => {
          if (r) return n(r);
          if (u) return n(new Error(`Cannot move '${e}' to a subdirectory of itself, '${t}'.`));
          s(o.dirname(t), e => {
            if (e) return n(e);
            doRename();
          });
        });
        function doRename() {
          if (o.resolve(e) === o.resolve(t)) {
            u.access(e, n);
          } else if (i) {
            u.rename(e, t, u => {
              if (!u) return n();
              if (u.code === 'ENOTEMPTY' || u.code === 'EEXIST') {
                a(t, u => {
                  if (u) return n(u);
                  r.overwrite = false;
                  move(e, t, r, n);
                });
                return;
              }
              if (u.code === 'EPERM') {
                setTimeout(() => {
                  a(t, u => {
                    if (u) return n(u);
                    r.overwrite = false;
                    move(e, t, r, n);
                  });
                }, 200);
                return;
              }
              if (u.code !== 'EXDEV') return n(u);
              moveAcrossDevice(e, t, i, n);
            });
          } else {
            u.link(e, t, r => {
              if (r) {
                if (
                  r.code === 'EXDEV' ||
                  r.code === 'EISDIR' ||
                  r.code === 'EPERM' ||
                  r.code === 'ENOTSUP'
                ) {
                  return moveAcrossDevice(e, t, i, n);
                }
                return n(r);
              }
              return u.unlink(e, n);
            });
          }
        }
      }
      function moveAcrossDevice(e, t, r, n) {
        u.stat(e, (u, i) => {
          if (u) return n(u);
          if (i.isDirectory()) {
            moveDirAcrossDevice(e, t, r, n);
          } else {
            moveFileAcrossDevice(e, t, r, n);
          }
        });
      }
      function moveFileAcrossDevice(e, t, r, n) {
        const i = r ? 'w' : 'wx';
        const o = u.createReadStream(e);
        const a = u.createWriteStream(t, { flags: i });
        o.on('error', i => {
          o.destroy();
          a.destroy();
          a.removeListener('close', onClose);
          u.unlink(t, () => {
            if (i.code === 'EISDIR' || i.code === 'EPERM') {
              moveDirAcrossDevice(e, t, r, n);
            } else {
              n(i);
            }
          });
        });
        a.on('error', e => {
          o.destroy();
          a.destroy();
          a.removeListener('close', onClose);
          n(e);
        });
        a.once('close', onClose);
        o.pipe(a);
        function onClose() {
          u.unlink(e, n);
        }
      }
      function moveDirAcrossDevice(e, t, r, n) {
        const u = { overwrite: false };
        if (r) {
          a(t, e => {
            if (e) return n(e);
            startNcp();
          });
        } else {
          startNcp();
        }
        function startNcp() {
          i(e, t, u, t => {
            if (t) return n(t);
            a(e, n);
          });
        }
      }
      function isSrcSubdir(e, t, r) {
        u.stat(e, (n, u) => {
          if (n) return r(n);
          if (u.isDirectory()) {
            const n = t.split(o.dirname(e) + o.sep)[1];
            if (n) {
              const u = n.split(o.sep)[0];
              if (u) return r(null, e !== t && t.indexOf(e) > -1 && u === o.basename(e));
              return r(null, false);
            }
            return r(null, false);
          }
          return r(null, false);
        });
      }
      e.exports = { move: n(move) };
    },
    ,
    function(e, t, r) {
      var n = r(580);
      function mapCacheHas(e) {
        return n(this, e).has(e);
      }
      e.exports = mapCacheHas;
    },
    ,
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n = r(60);
      e.exports = function defineProperty(e, t, r) {
        if (typeof e !== 'object' && typeof e !== 'function') {
          throw new TypeError('expected an object or function.');
        }
        if (typeof t !== 'string') {
          throw new TypeError('expected `prop` to be a string.');
        }
        if (n(r) && ('set' in r || 'get' in r)) {
          return Object.defineProperty(e, t, r);
        }
        return Object.defineProperty(e, t, {
          configurable: true,
          enumerable: false,
          writable: true,
          value: r,
        });
      };
    },
    ,
    ,
    ,
    function(e) {
      e.exports = function(e, r) {
        var n = [];
        for (var u = 0; u < e.length; u++) {
          var i = r(e[u], u);
          if (t(i)) n.push.apply(n, i);
          else n.push(i);
        }
        return n;
      };
      var t =
        Array.isArray ||
        function(e) {
          return Object.prototype.toString.call(e) === '[object Array]';
        };
    },
    function(e) {
      e.exports = function(e) {
        return e != null && (isBuffer(e) || isSlowBuffer(e) || !!e._isBuffer);
      };
      function isBuffer(e) {
        return (
          !!e.constructor &&
          typeof e.constructor.isBuffer === 'function' &&
          e.constructor.isBuffer(e)
        );
      }
      function isSlowBuffer(e) {
        return (
          typeof e.readFloatLE === 'function' &&
          typeof e.slice === 'function' &&
          isBuffer(e.slice(0, 0))
        );
      }
    },
    function(e) {
      (function(t, r, n) {
        if (true) {
          e.exports = n();
          e.exports['default'] = n();
        } else {
        }
      })('slugify', this, function() {
        var e = JSON.parse(
          '{"$":"dollar","%":"percent","&":"and","<":"less",">":"greater","|":"or","¢":"cent","£":"pound","¤":"currency","¥":"yen","©":"(c)","ª":"a","®":"(r)","º":"o","À":"A","Á":"A","Â":"A","Ã":"A","Ä":"A","Å":"A","Æ":"AE","Ç":"C","È":"E","É":"E","Ê":"E","Ë":"E","Ì":"I","Í":"I","Î":"I","Ï":"I","Ð":"D","Ñ":"N","Ò":"O","Ó":"O","Ô":"O","Õ":"O","Ö":"O","Ø":"O","Ù":"U","Ú":"U","Û":"U","Ü":"U","Ý":"Y","Þ":"TH","ß":"ss","à":"a","á":"a","â":"a","ã":"a","ä":"a","å":"a","æ":"ae","ç":"c","è":"e","é":"e","ê":"e","ë":"e","ì":"i","í":"i","î":"i","ï":"i","ð":"d","ñ":"n","ò":"o","ó":"o","ô":"o","õ":"o","ö":"o","ø":"o","ù":"u","ú":"u","û":"u","ü":"u","ý":"y","þ":"th","ÿ":"y","Ā":"A","ā":"a","Ă":"A","ă":"a","Ą":"A","ą":"a","Ć":"C","ć":"c","Č":"C","č":"c","Ď":"D","ď":"d","Đ":"DJ","đ":"dj","Ē":"E","ē":"e","Ė":"E","ė":"e","Ę":"e","ę":"e","Ě":"E","ě":"e","Ğ":"G","ğ":"g","Ģ":"G","ģ":"g","Ĩ":"I","ĩ":"i","Ī":"i","ī":"i","Į":"I","į":"i","İ":"I","ı":"i","Ķ":"k","ķ":"k","Ļ":"L","ļ":"l","Ľ":"L","ľ":"l","Ł":"L","ł":"l","Ń":"N","ń":"n","Ņ":"N","ņ":"n","Ň":"N","ň":"n","Ő":"O","ő":"o","Œ":"OE","œ":"oe","Ŕ":"R","ŕ":"r","Ř":"R","ř":"r","Ś":"S","ś":"s","Ş":"S","ş":"s","Š":"S","š":"s","Ţ":"T","ţ":"t","Ť":"T","ť":"t","Ũ":"U","ũ":"u","Ū":"u","ū":"u","Ů":"U","ů":"u","Ű":"U","ű":"u","Ų":"U","ų":"u","Ź":"Z","ź":"z","Ż":"Z","ż":"z","Ž":"Z","ž":"z","ƒ":"f","Ơ":"O","ơ":"o","Ư":"U","ư":"u","ǈ":"LJ","ǉ":"lj","ǋ":"NJ","ǌ":"nj","Ș":"S","ș":"s","Ț":"T","ț":"t","˚":"o","Ά":"A","Έ":"E","Ή":"H","Ί":"I","Ό":"O","Ύ":"Y","Ώ":"W","ΐ":"i","Α":"A","Β":"B","Γ":"G","Δ":"D","Ε":"E","Ζ":"Z","Η":"H","Θ":"8","Ι":"I","Κ":"K","Λ":"L","Μ":"M","Ν":"N","Ξ":"3","Ο":"O","Π":"P","Ρ":"R","Σ":"S","Τ":"T","Υ":"Y","Φ":"F","Χ":"X","Ψ":"PS","Ω":"W","Ϊ":"I","Ϋ":"Y","ά":"a","έ":"e","ή":"h","ί":"i","ΰ":"y","α":"a","β":"b","γ":"g","δ":"d","ε":"e","ζ":"z","η":"h","θ":"8","ι":"i","κ":"k","λ":"l","μ":"m","ν":"n","ξ":"3","ο":"o","π":"p","ρ":"r","ς":"s","σ":"s","τ":"t","υ":"y","φ":"f","χ":"x","ψ":"ps","ω":"w","ϊ":"i","ϋ":"y","ό":"o","ύ":"y","ώ":"w","Ё":"Yo","Ђ":"DJ","Є":"Ye","І":"I","Ї":"Yi","Ј":"J","Љ":"LJ","Њ":"NJ","Ћ":"C","Џ":"DZ","А":"A","Б":"B","В":"V","Г":"G","Д":"D","Е":"E","Ж":"Zh","З":"Z","И":"I","Й":"J","К":"K","Л":"L","М":"M","Н":"N","О":"O","П":"P","Р":"R","С":"S","Т":"T","У":"U","Ф":"F","Х":"H","Ц":"C","Ч":"Ch","Ш":"Sh","Щ":"Sh","Ъ":"U","Ы":"Y","Ь":"","Э":"E","Ю":"Yu","Я":"Ya","а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ж":"zh","з":"z","и":"i","й":"j","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"h","ц":"c","ч":"ch","ш":"sh","щ":"sh","ъ":"u","ы":"y","ь":"","э":"e","ю":"yu","я":"ya","ё":"yo","ђ":"dj","є":"ye","і":"i","ї":"yi","ј":"j","љ":"lj","њ":"nj","ћ":"c","џ":"dz","Ґ":"G","ґ":"g","฿":"baht","ა":"a","ბ":"b","გ":"g","დ":"d","ე":"e","ვ":"v","ზ":"z","თ":"t","ი":"i","კ":"k","ლ":"l","მ":"m","ნ":"n","ო":"o","პ":"p","ჟ":"zh","რ":"r","ს":"s","ტ":"t","უ":"u","ფ":"f","ქ":"k","ღ":"gh","ყ":"q","შ":"sh","ჩ":"ch","ც":"ts","ძ":"dz","წ":"ts","ჭ":"ch","ხ":"kh","ჯ":"j","ჰ":"h","ẞ":"SS","Ạ":"A","ạ":"a","Ả":"A","ả":"a","Ấ":"A","ấ":"a","Ầ":"A","ầ":"a","Ẩ":"A","ẩ":"a","Ẫ":"A","ẫ":"a","Ậ":"A","ậ":"a","Ắ":"A","ắ":"a","Ằ":"A","ằ":"a","Ẳ":"A","ẳ":"a","Ẵ":"A","ẵ":"a","Ặ":"A","ặ":"a","Ẹ":"E","ẹ":"e","Ẻ":"E","ẻ":"e","Ẽ":"E","ẽ":"e","Ế":"E","ế":"e","Ề":"E","ề":"e","Ể":"E","ể":"e","Ễ":"E","ễ":"e","Ệ":"E","ệ":"e","Ỉ":"I","ỉ":"i","Ị":"I","ị":"i","Ọ":"O","ọ":"o","Ỏ":"O","ỏ":"o","Ố":"O","ố":"o","Ồ":"O","ồ":"o","Ổ":"O","ổ":"o","Ỗ":"O","ỗ":"o","Ộ":"O","ộ":"o","Ớ":"O","ớ":"o","Ờ":"O","ờ":"o","Ở":"O","ở":"o","Ỡ":"O","ỡ":"o","Ợ":"O","ợ":"o","Ụ":"U","ụ":"u","Ủ":"U","ủ":"u","Ứ":"U","ứ":"u","Ừ":"U","ừ":"u","Ử":"U","ử":"u","Ữ":"U","ữ":"u","Ự":"U","ự":"u","Ỳ":"Y","ỳ":"y","Ỵ":"Y","ỵ":"y","Ỷ":"Y","ỷ":"y","Ỹ":"Y","ỹ":"y","‘":"\'","’":"\'","“":"\\"","”":"\\"","†":"+","•":"*","…":"...","₠":"ecu","₢":"cruzeiro","₣":"french franc","₤":"lira","₥":"mill","₦":"naira","₧":"peseta","₨":"rupee","₩":"won","₪":"new shequel","₫":"dong","€":"euro","₭":"kip","₮":"tugrik","₯":"drachma","₰":"penny","₱":"peso","₲":"guarani","₳":"austral","₴":"hryvnia","₵":"cedi","₹":"indian rupee","₽":"russian ruble","₿":"bitcoin","℠":"sm","™":"tm","∂":"d","∆":"delta","∑":"sum","∞":"infinity","♥":"love","元":"yuan","円":"yen","﷼":"rial"}'
        );
        function replace(t, r) {
          if (typeof t !== 'string') {
            throw new Error('slugify: string argument expected');
          }
          r = typeof r === 'string' ? { replacement: r } : r || {};
          var n = t
            .split('')
            .reduce(function(t, n) {
              return t + (e[n] || n).replace(r.remove || /[^\w\s$*_+~.()'"!\-:@]/g, '');
            }, '')
            .trim()
            .replace(/[-\s]+/g, r.replacement || '-');
          return r.lower ? n.toLowerCase() : n;
        }
        replace.extend = function(t) {
          for (var r in t) {
            e[r] = t[r];
          }
        };
        return replace;
      });
    },
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    function(e) {
      var t = Object.prototype.toString;
      e.exports = function kindOf(e) {
        if (e === void 0) return 'undefined';
        if (e === null) return 'null';
        var r = typeof e;
        if (r === 'boolean') return 'boolean';
        if (r === 'string') return 'string';
        if (r === 'number') return 'number';
        if (r === 'symbol') return 'symbol';
        if (r === 'function') {
          return isGeneratorFn(e) ? 'generatorfunction' : 'function';
        }
        if (isArray(e)) return 'array';
        if (isBuffer(e)) return 'buffer';
        if (isArguments(e)) return 'arguments';
        if (isDate(e)) return 'date';
        if (isError(e)) return 'error';
        if (isRegexp(e)) return 'regexp';
        switch (ctorName(e)) {
          case 'Symbol':
            return 'symbol';
          case 'Promise':
            return 'promise';
          case 'WeakMap':
            return 'weakmap';
          case 'WeakSet':
            return 'weakset';
          case 'Map':
            return 'map';
          case 'Set':
            return 'set';
          case 'Int8Array':
            return 'int8array';
          case 'Uint8Array':
            return 'uint8array';
          case 'Uint8ClampedArray':
            return 'uint8clampedarray';
          case 'Int16Array':
            return 'int16array';
          case 'Uint16Array':
            return 'uint16array';
          case 'Int32Array':
            return 'int32array';
          case 'Uint32Array':
            return 'uint32array';
          case 'Float32Array':
            return 'float32array';
          case 'Float64Array':
            return 'float64array';
        }
        if (isGeneratorObj(e)) {
          return 'generator';
        }
        r = t.call(e);
        switch (r) {
          case '[object Object]':
            return 'object';
          case '[object Map Iterator]':
            return 'mapiterator';
          case '[object Set Iterator]':
            return 'setiterator';
          case '[object String Iterator]':
            return 'stringiterator';
          case '[object Array Iterator]':
            return 'arrayiterator';
        }
        return r
          .slice(8, -1)
          .toLowerCase()
          .replace(/\s/g, '');
      };
      function ctorName(e) {
        return e.constructor ? e.constructor.name : null;
      }
      function isArray(e) {
        if (Array.isArray) return Array.isArray(e);
        return e instanceof Array;
      }
      function isError(e) {
        return (
          e instanceof Error ||
          (typeof e.message === 'string' &&
            e.constructor &&
            typeof e.constructor.stackTraceLimit === 'number')
        );
      }
      function isDate(e) {
        if (e instanceof Date) return true;
        return (
          typeof e.toDateString === 'function' &&
          typeof e.getDate === 'function' &&
          typeof e.setDate === 'function'
        );
      }
      function isRegexp(e) {
        if (e instanceof RegExp) return true;
        return (
          typeof e.flags === 'string' &&
          typeof e.ignoreCase === 'boolean' &&
          typeof e.multiline === 'boolean' &&
          typeof e.global === 'boolean'
        );
      }
      function isGeneratorFn(e, t) {
        return ctorName(e) === 'GeneratorFunction';
      }
      function isGeneratorObj(e) {
        return (
          typeof e.throw === 'function' &&
          typeof e.return === 'function' &&
          typeof e.next === 'function'
        );
      }
      function isArguments(e) {
        try {
          if (typeof e.length === 'number' && typeof e.callee === 'function') {
            return true;
          }
        } catch (e) {
          if (e.message.indexOf('callee') !== -1) {
            return true;
          }
        }
        return false;
      }
      function isBuffer(e) {
        if (e.constructor && typeof e.constructor.isBuffer === 'function') {
          return e.constructor.isBuffer(e);
        }
        return false;
      }
    },
    ,
    function(e, t, r) {
      var n = r(37).SourceMapGenerator;
      var u = r(702);
      var i = /(\r?\n)/;
      var o = 10;
      var a = '$$$isSourceNode$$$';
      function SourceNode(e, t, r, n, u) {
        this.children = [];
        this.sourceContents = {};
        this.line = e == null ? null : e;
        this.column = t == null ? null : t;
        this.source = r == null ? null : r;
        this.name = u == null ? null : u;
        this[a] = true;
        if (n != null) this.add(n);
      }
      SourceNode.fromStringWithSourceMap = function SourceNode_fromStringWithSourceMap(e, t, r) {
        var n = new SourceNode();
        var o = e.split(i);
        var a = 0;
        var s = function() {
          var e = getNextLine();
          var t = getNextLine() || '';
          return e + t;
          function getNextLine() {
            return a < o.length ? o[a++] : undefined;
          }
        };
        var c = 1,
          f = 0;
        var l = null;
        t.eachMapping(function(e) {
          if (l !== null) {
            if (c < e.generatedLine) {
              addMappingWithCode(l, s());
              c++;
              f = 0;
            } else {
              var t = o[a];
              var r = t.substr(0, e.generatedColumn - f);
              o[a] = t.substr(e.generatedColumn - f);
              f = e.generatedColumn;
              addMappingWithCode(l, r);
              l = e;
              return;
            }
          }
          while (c < e.generatedLine) {
            n.add(s());
            c++;
          }
          if (f < e.generatedColumn) {
            var t = o[a];
            n.add(t.substr(0, e.generatedColumn));
            o[a] = t.substr(e.generatedColumn);
            f = e.generatedColumn;
          }
          l = e;
        }, this);
        if (a < o.length) {
          if (l) {
            addMappingWithCode(l, s());
          }
          n.add(o.splice(a).join(''));
        }
        t.sources.forEach(function(e) {
          var i = t.sourceContentFor(e);
          if (i != null) {
            if (r != null) {
              e = u.join(r, e);
            }
            n.setSourceContent(e, i);
          }
        });
        return n;
        function addMappingWithCode(e, t) {
          if (e === null || e.source === undefined) {
            n.add(t);
          } else {
            var i = r ? u.join(r, e.source) : e.source;
            n.add(new SourceNode(e.originalLine, e.originalColumn, i, t, e.name));
          }
        }
      };
      SourceNode.prototype.add = function SourceNode_add(e) {
        if (Array.isArray(e)) {
          e.forEach(function(e) {
            this.add(e);
          }, this);
        } else if (e[a] || typeof e === 'string') {
          if (e) {
            this.children.push(e);
          }
        } else {
          throw new TypeError(
            'Expected a SourceNode, string, or an array of SourceNodes and strings. Got ' + e
          );
        }
        return this;
      };
      SourceNode.prototype.prepend = function SourceNode_prepend(e) {
        if (Array.isArray(e)) {
          for (var t = e.length - 1; t >= 0; t--) {
            this.prepend(e[t]);
          }
        } else if (e[a] || typeof e === 'string') {
          this.children.unshift(e);
        } else {
          throw new TypeError(
            'Expected a SourceNode, string, or an array of SourceNodes and strings. Got ' + e
          );
        }
        return this;
      };
      SourceNode.prototype.walk = function SourceNode_walk(e) {
        var t;
        for (var r = 0, n = this.children.length; r < n; r++) {
          t = this.children[r];
          if (t[a]) {
            t.walk(e);
          } else {
            if (t !== '') {
              e(t, { source: this.source, line: this.line, column: this.column, name: this.name });
            }
          }
        }
      };
      SourceNode.prototype.join = function SourceNode_join(e) {
        var t;
        var r;
        var n = this.children.length;
        if (n > 0) {
          t = [];
          for (r = 0; r < n - 1; r++) {
            t.push(this.children[r]);
            t.push(e);
          }
          t.push(this.children[r]);
          this.children = t;
        }
        return this;
      };
      SourceNode.prototype.replaceRight = function SourceNode_replaceRight(e, t) {
        var r = this.children[this.children.length - 1];
        if (r[a]) {
          r.replaceRight(e, t);
        } else if (typeof r === 'string') {
          this.children[this.children.length - 1] = r.replace(e, t);
        } else {
          this.children.push(''.replace(e, t));
        }
        return this;
      };
      SourceNode.prototype.setSourceContent = function SourceNode_setSourceContent(e, t) {
        this.sourceContents[u.toSetString(e)] = t;
      };
      SourceNode.prototype.walkSourceContents = function SourceNode_walkSourceContents(e) {
        for (var t = 0, r = this.children.length; t < r; t++) {
          if (this.children[t][a]) {
            this.children[t].walkSourceContents(e);
          }
        }
        var n = Object.keys(this.sourceContents);
        for (var t = 0, r = n.length; t < r; t++) {
          e(u.fromSetString(n[t]), this.sourceContents[n[t]]);
        }
      };
      SourceNode.prototype.toString = function SourceNode_toString() {
        var e = '';
        this.walk(function(t) {
          e += t;
        });
        return e;
      };
      SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(e) {
        var t = { code: '', line: 1, column: 0 };
        var r = new n(e);
        var u = false;
        var i = null;
        var a = null;
        var s = null;
        var c = null;
        this.walk(function(e, n) {
          t.code += e;
          if (n.source !== null && n.line !== null && n.column !== null) {
            if (i !== n.source || a !== n.line || s !== n.column || c !== n.name) {
              r.addMapping({
                source: n.source,
                original: { line: n.line, column: n.column },
                generated: { line: t.line, column: t.column },
                name: n.name,
              });
            }
            i = n.source;
            a = n.line;
            s = n.column;
            c = n.name;
            u = true;
          } else if (u) {
            r.addMapping({ generated: { line: t.line, column: t.column } });
            i = null;
            u = false;
          }
          for (var f = 0, l = e.length; f < l; f++) {
            if (e.charCodeAt(f) === o) {
              t.line++;
              t.column = 0;
              if (f + 1 === l) {
                i = null;
                u = false;
              } else if (u) {
                r.addMapping({
                  source: n.source,
                  original: { line: n.line, column: n.column },
                  generated: { line: t.line, column: t.column },
                  name: n.name,
                });
              }
            } else {
              t.column++;
            }
          }
        });
        this.walkSourceContents(function(e, t) {
          r.setSourceContent(e, t);
        });
        return { code: t.code, map: r };
      };
      t.SourceNode = SourceNode;
    },
    ,
    function(e, t, r) {
      'use strict';
      var n = r(58);
      var u = r(593);
      var i = r(333);
      var o = r(65);
      var a = r(414);
      var s = r(992);
      var c = r(680);
      var f = r(436);
      var l = r(270);
      function namespace(e) {
        function Cache(t) {
          if (e) {
            this[e] = {};
          }
          if (t) {
            this.set(t);
          }
        }
        u(Cache.prototype);
        Cache.prototype.set = function(t, r) {
          if (Array.isArray(t) && arguments.length === 2) {
            t = o(t);
          }
          if (n(t) || Array.isArray(t)) {
            this.visit('set', t);
          } else {
            l(e ? this[e] : this, t, r);
            this.emit('set', t, r);
          }
          return this;
        };
        Cache.prototype.union = function(t, r) {
          if (Array.isArray(t) && arguments.length === 2) {
            t = o(t);
          }
          var n = e ? this[e] : this;
          a(n, t, arrayify(r));
          this.emit('union', r);
          return this;
        };
        Cache.prototype.get = function(t) {
          t = o(arguments);
          var r = e ? this[e] : this;
          var n = c(r, t);
          this.emit('get', t, n);
          return n;
        };
        Cache.prototype.has = function(t) {
          t = o(arguments);
          var r = e ? this[e] : this;
          var n = c(r, t);
          var u = typeof n !== 'undefined';
          this.emit('has', t, u);
          return u;
        };
        Cache.prototype.del = function(t) {
          if (Array.isArray(t)) {
            this.visit('del', t);
          } else {
            s(e ? this[e] : this, t);
            this.emit('del', t);
          }
          return this;
        };
        Cache.prototype.clear = function() {
          if (e) {
            this[e] = {};
          }
        };
        Cache.prototype.visit = function(e, t) {
          i(this, e, t);
          return this;
        };
        return Cache;
      }
      function arrayify(e) {
        return e ? (Array.isArray(e) ? e : [e]) : [];
      }
      e.exports = namespace();
      e.exports.namespace = namespace;
    },
    function(e, t, r) {
      var n = r(352);
      t.wordBoundary = function() {
        return { type: n.POSITION, value: 'b' };
      };
      t.nonWordBoundary = function() {
        return { type: n.POSITION, value: 'B' };
      };
      t.begin = function() {
        return { type: n.POSITION, value: '^' };
      };
      t.end = function() {
        return { type: n.POSITION, value: '$' };
      };
    },
    ,
    function(e, t, r) {
      'use strict';
      var n = r(755);
      e.exports = function isExtendable(e) {
        return n(e) || typeof e === 'function' || Array.isArray(e);
      };
    },
    function(e, t, r) {
      'use strict';
      var n = r(58);
      var u = r(671);
      var i = r(38);
      var o;
      function Node(e, t, r) {
        if (typeof t !== 'string') {
          r = t;
          t = null;
        }
        u(this, 'parent', r);
        u(this, 'isNode', true);
        u(this, 'expect', null);
        if (typeof t !== 'string' && n(e)) {
          lazyKeys();
          var i = Object.keys(e);
          for (var a = 0; a < i.length; a++) {
            var s = i[a];
            if (o.indexOf(s) === -1) {
              this[s] = e[s];
            }
          }
        } else {
          this.type = t;
          this.val = e;
        }
      }
      Node.isNode = function(e) {
        return i.isNode(e);
      };
      Node.prototype.define = function(e, t) {
        u(this, e, t);
        return this;
      };
      Node.prototype.isEmpty = function(e) {
        return i.isEmpty(this, e);
      };
      Node.prototype.push = function(e) {
        assert(Node.isNode(e), 'expected node to be an instance of Node');
        u(e, 'parent', this);
        this.nodes = this.nodes || [];
        return this.nodes.push(e);
      };
      Node.prototype.unshift = function(e) {
        assert(Node.isNode(e), 'expected node to be an instance of Node');
        u(e, 'parent', this);
        this.nodes = this.nodes || [];
        return this.nodes.unshift(e);
      };
      Node.prototype.pop = function() {
        return this.nodes && this.nodes.pop();
      };
      Node.prototype.shift = function() {
        return this.nodes && this.nodes.shift();
      };
      Node.prototype.remove = function(e) {
        assert(Node.isNode(e), 'expected node to be an instance of Node');
        this.nodes = this.nodes || [];
        var t = e.index;
        if (t !== -1) {
          e.index = -1;
          return this.nodes.splice(t, 1);
        }
        return null;
      };
      Node.prototype.find = function(e) {
        return i.findNode(this.nodes, e);
      };
      Node.prototype.isType = function(e) {
        return i.isType(this, e);
      };
      Node.prototype.hasType = function(e) {
        return i.hasType(this, e);
      };
      Object.defineProperty(Node.prototype, 'siblings', {
        set: function() {
          throw new Error('node.siblings is a getter and cannot be defined');
        },
        get: function() {
          return this.parent ? this.parent.nodes : null;
        },
      });
      Object.defineProperty(Node.prototype, 'index', {
        set: function(e) {
          u(this, 'idx', e);
        },
        get: function() {
          if (!Array.isArray(this.siblings)) {
            return -1;
          }
          var e = this.idx !== -1 ? this.siblings[this.idx] : null;
          if (e !== this) {
            this.idx = this.siblings.indexOf(this);
          }
          return this.idx;
        },
      });
      Object.defineProperty(Node.prototype, 'prev', {
        set: function() {
          throw new Error('node.prev is a getter and cannot be defined');
        },
        get: function() {
          if (Array.isArray(this.siblings)) {
            return this.siblings[this.index - 1] || this.parent.prev;
          }
          return null;
        },
      });
      Object.defineProperty(Node.prototype, 'next', {
        set: function() {
          throw new Error('node.next is a getter and cannot be defined');
        },
        get: function() {
          if (Array.isArray(this.siblings)) {
            return this.siblings[this.index + 1] || this.parent.next;
          }
          return null;
        },
      });
      Object.defineProperty(Node.prototype, 'first', {
        get: function() {
          return this.nodes ? this.nodes[0] : null;
        },
      });
      Object.defineProperty(Node.prototype, 'last', {
        get: function() {
          return this.nodes ? i.last(this.nodes) : null;
        },
      });
      Object.defineProperty(Node.prototype, 'scope', {
        get: function() {
          if (this.isScope !== true) {
            return this.parent ? this.parent.scope : this;
          }
          return this;
        },
      });
      function lazyKeys() {
        if (!o) {
          o = Object.getOwnPropertyNames(Node.prototype);
        }
      }
      function assert(e, t) {
        if (!e) throw new Error(t);
      }
      t = e.exports = Node;
    },
    ,
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(323).fromCallback;
      e.exports = { copy: n(r(183)) };
    },
    ,
    ,
    ,
    ,
    ,
    ,
    function(e) {
      e.exports = function(e, t) {
        if (!t) t = {};
        var r = { bools: {}, strings: {}, unknownFn: null };
        if (typeof t['unknown'] === 'function') {
          r.unknownFn = t['unknown'];
        }
        if (typeof t['boolean'] === 'boolean' && t['boolean']) {
          r.allBools = true;
        } else {
          []
            .concat(t['boolean'])
            .filter(Boolean)
            .forEach(function(e) {
              r.bools[e] = true;
            });
        }
        var n = {};
        Object.keys(t.alias || {}).forEach(function(e) {
          n[e] = [].concat(t.alias[e]);
          n[e].forEach(function(t) {
            n[t] = [e].concat(
              n[e].filter(function(e) {
                return t !== e;
              })
            );
          });
        });
        []
          .concat(t.string)
          .filter(Boolean)
          .forEach(function(e) {
            r.strings[e] = true;
            if (n[e]) {
              r.strings[n[e]] = true;
            }
          });
        var u = t['default'] || {};
        var i = { _: [] };
        Object.keys(r.bools).forEach(function(e) {
          setArg(e, u[e] === undefined ? false : u[e]);
        });
        var o = [];
        if (e.indexOf('--') !== -1) {
          o = e.slice(e.indexOf('--') + 1);
          e = e.slice(0, e.indexOf('--'));
        }
        function argDefined(e, t) {
          return (r.allBools && /^--[^=]+$/.test(t)) || r.strings[e] || r.bools[e] || n[e];
        }
        function setArg(e, t, u) {
          if (u && r.unknownFn && !argDefined(e, u)) {
            if (r.unknownFn(u) === false) return;
          }
          var o = !r.strings[e] && isNumber(t) ? Number(t) : t;
          setKey(i, e.split('.'), o);
          (n[e] || []).forEach(function(e) {
            setKey(i, e.split('.'), o);
          });
        }
        function setKey(e, t, n) {
          var u = e;
          t.slice(0, -1).forEach(function(e) {
            if (u[e] === undefined) u[e] = {};
            u = u[e];
          });
          var i = t[t.length - 1];
          if (u[i] === undefined || r.bools[i] || typeof u[i] === 'boolean') {
            u[i] = n;
          } else if (Array.isArray(u[i])) {
            u[i].push(n);
          } else {
            u[i] = [u[i], n];
          }
        }
        function aliasIsBoolean(e) {
          return n[e].some(function(e) {
            return r.bools[e];
          });
        }
        for (var a = 0; a < e.length; a++) {
          var s = e[a];
          if (/^--.+=/.test(s)) {
            var c = s.match(/^--([^=]+)=([\s\S]*)$/);
            var f = c[1];
            var l = c[2];
            if (r.bools[f]) {
              l = l !== 'false';
            }
            setArg(f, l, s);
          } else if (/^--no-.+/.test(s)) {
            var f = s.match(/^--no-(.+)/)[1];
            setArg(f, false, s);
          } else if (/^--.+/.test(s)) {
            var f = s.match(/^--(.+)/)[1];
            var p = e[a + 1];
            if (
              p !== undefined &&
              !/^-/.test(p) &&
              !r.bools[f] &&
              !r.allBools &&
              (n[f] ? !aliasIsBoolean(f) : true)
            ) {
              setArg(f, p, s);
              a++;
            } else if (/^(true|false)$/.test(p)) {
              setArg(f, p === 'true', s);
              a++;
            } else {
              setArg(f, r.strings[f] ? '' : true, s);
            }
          } else if (/^-[^-]+/.test(s)) {
            var h = s.slice(1, -1).split('');
            var d = false;
            for (var y = 0; y < h.length; y++) {
              var p = s.slice(y + 2);
              if (p === '-') {
                setArg(h[y], p, s);
                continue;
              }
              if (/[A-Za-z]/.test(h[y]) && /=/.test(p)) {
                setArg(h[y], p.split('=')[1], s);
                d = true;
                break;
              }
              if (/[A-Za-z]/.test(h[y]) && /-?\d+(\.\d*)?(e-?\d+)?$/.test(p)) {
                setArg(h[y], p, s);
                d = true;
                break;
              }
              if (h[y + 1] && h[y + 1].match(/\W/)) {
                setArg(h[y], s.slice(y + 2), s);
                d = true;
                break;
              } else {
                setArg(h[y], r.strings[h[y]] ? '' : true, s);
              }
            }
            var f = s.slice(-1)[0];
            if (!d && f !== '-') {
              if (
                e[a + 1] &&
                !/^(-|--)[^-]/.test(e[a + 1]) &&
                !r.bools[f] &&
                (n[f] ? !aliasIsBoolean(f) : true)
              ) {
                setArg(f, e[a + 1], s);
                a++;
              } else if (e[a + 1] && /true|false/.test(e[a + 1])) {
                setArg(f, e[a + 1] === 'true', s);
                a++;
              } else {
                setArg(f, r.strings[f] ? '' : true, s);
              }
            }
          } else {
            if (!r.unknownFn || r.unknownFn(s) !== false) {
              i._.push(r.strings['_'] || !isNumber(s) ? s : Number(s));
            }
            if (t.stopEarly) {
              i._.push.apply(i._, e.slice(a + 1));
              break;
            }
          }
        }
        Object.keys(u).forEach(function(e) {
          if (!hasKey(i, e.split('.'))) {
            setKey(i, e.split('.'), u[e]);
            (n[e] || []).forEach(function(t) {
              setKey(i, t.split('.'), u[e]);
            });
          }
        });
        if (t['--']) {
          i['--'] = new Array();
          o.forEach(function(e) {
            i['--'].push(e);
          });
        } else {
          o.forEach(function(e) {
            i._.push(e);
          });
        }
        return i;
      };
      function hasKey(e, t) {
        var r = e;
        t.slice(0, -1).forEach(function(e) {
          r = r[e] || {};
        });
        var n = t[t.length - 1];
        return n in r;
      }
      function isNumber(e) {
        if (typeof e === 'number') return true;
        if (/^0x[0-9a-f]+$/i.test(e)) return true;
        return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/.test(e);
      }
    },
    function(e) {
      function arrayMap(e, t) {
        var r = -1,
          n = e == null ? 0 : e.length,
          u = Array(n);
        while (++r < n) {
          u[r] = t(e[r], r, e);
        }
        return u;
      }
      e.exports = arrayMap;
    },
    ,
    ,
    ,
    function(e, t, r) {
      var n = r(228);
      var u = r(605);
      e.exports = expandTop;
      var i = '\0SLASH' + Math.random() + '\0';
      var o = '\0OPEN' + Math.random() + '\0';
      var a = '\0CLOSE' + Math.random() + '\0';
      var s = '\0COMMA' + Math.random() + '\0';
      var c = '\0PERIOD' + Math.random() + '\0';
      function numeric(e) {
        return parseInt(e, 10) == e ? parseInt(e, 10) : e.charCodeAt(0);
      }
      function escapeBraces(e) {
        return e
          .split('\\\\')
          .join(i)
          .split('\\{')
          .join(o)
          .split('\\}')
          .join(a)
          .split('\\,')
          .join(s)
          .split('\\.')
          .join(c);
      }
      function unescapeBraces(e) {
        return e
          .split(i)
          .join('\\')
          .split(o)
          .join('{')
          .split(a)
          .join('}')
          .split(s)
          .join(',')
          .split(c)
          .join('.');
      }
      function parseCommaParts(e) {
        if (!e) return [''];
        var t = [];
        var r = u('{', '}', e);
        if (!r) return e.split(',');
        var n = r.pre;
        var i = r.body;
        var o = r.post;
        var a = n.split(',');
        a[a.length - 1] += '{' + i + '}';
        var s = parseCommaParts(o);
        if (o.length) {
          a[a.length - 1] += s.shift();
          a.push.apply(a, s);
        }
        t.push.apply(t, a);
        return t;
      }
      function expandTop(e) {
        if (!e) return [];
        if (e.substr(0, 2) === '{}') {
          e = '\\{\\}' + e.substr(2);
        }
        return expand(escapeBraces(e), true).map(unescapeBraces);
      }
      function identity(e) {
        return e;
      }
      function embrace(e) {
        return '{' + e + '}';
      }
      function isPadded(e) {
        return /^-?0\d/.test(e);
      }
      function lte(e, t) {
        return e <= t;
      }
      function gte(e, t) {
        return e >= t;
      }
      function expand(e, t) {
        var r = [];
        var i = u('{', '}', e);
        if (!i || /\$$/.test(i.pre)) return [e];
        var o = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(i.body);
        var s = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(i.body);
        var c = o || s;
        var f = i.body.indexOf(',') >= 0;
        if (!c && !f) {
          if (i.post.match(/,.*\}/)) {
            e = i.pre + '{' + i.body + a + i.post;
            return expand(e);
          }
          return [e];
        }
        var l;
        if (c) {
          l = i.body.split(/\.\./);
        } else {
          l = parseCommaParts(i.body);
          if (l.length === 1) {
            l = expand(l[0], false).map(embrace);
            if (l.length === 1) {
              var p = i.post.length ? expand(i.post, false) : [''];
              return p.map(function(e) {
                return i.pre + l[0] + e;
              });
            }
          }
        }
        var h = i.pre;
        var p = i.post.length ? expand(i.post, false) : [''];
        var d;
        if (c) {
          var y = numeric(l[0]);
          var v = numeric(l[1]);
          var D = Math.max(l[0].length, l[1].length);
          var m = l.length == 3 ? Math.abs(numeric(l[2])) : 1;
          var A = lte;
          var g = v < y;
          if (g) {
            m *= -1;
            A = gte;
          }
          var E = l.some(isPadded);
          d = [];
          for (var C = y; A(C, v); C += m) {
            var F;
            if (s) {
              F = String.fromCharCode(C);
              if (F === '\\') F = '';
            } else {
              F = String(C);
              if (E) {
                var b = D - F.length;
                if (b > 0) {
                  var S = new Array(b + 1).join('0');
                  if (C < 0) F = '-' + S + F.slice(1);
                  else F = S + F;
                }
              }
            }
            d.push(F);
          }
        } else {
          d = n(l, function(e) {
            return expand(e, false);
          });
        }
        for (var w = 0; w < d.length; w++) {
          for (var B = 0; B < p.length; B++) {
            var x = h + d[w] + p[B];
            if (!t || c || x) r.push(x);
          }
        }
        return r;
      }
    },
    function(e, t, r) {
      const n = r(323).fromCallback;
      e.exports = { copy: n(r(198)) };
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n = r(906);
      var u = r(192);
      var i = r(755);
      var o = r(18);
      e.exports = function(e, t, r) {
        if (!o(e)) {
          return e;
        }
        if (Array.isArray(t)) {
          t = [].concat.apply([], t).join('.');
        }
        if (typeof t !== 'string') {
          return e;
        }
        var a = n(t, { sep: '.', brackets: true });
        var s = a.length;
        var c = -1;
        var f = e;
        while (++c < s) {
          var l = a[c];
          if (c !== s - 1) {
            if (!o(f[l])) {
              f[l] = {};
            }
            f = f[l];
            continue;
          }
          if (i(f[l]) && i(r)) {
            f[l] = u({}, f[l], r);
          } else {
            f[l] = r;
          }
        }
        return e;
      };
    },
    function(e, t, r) {
      var n = r(229);
      var u = Object.prototype.toString;
      e.exports = function kindOf(e) {
        if (typeof e === 'undefined') {
          return 'undefined';
        }
        if (e === null) {
          return 'null';
        }
        if (e === true || e === false || e instanceof Boolean) {
          return 'boolean';
        }
        if (typeof e === 'string' || e instanceof String) {
          return 'string';
        }
        if (typeof e === 'number' || e instanceof Number) {
          return 'number';
        }
        if (typeof e === 'function' || e instanceof Function) {
          return 'function';
        }
        if (typeof Array.isArray !== 'undefined' && Array.isArray(e)) {
          return 'array';
        }
        if (e instanceof RegExp) {
          return 'regexp';
        }
        if (e instanceof Date) {
          return 'date';
        }
        var t = u.call(e);
        if (t === '[object RegExp]') {
          return 'regexp';
        }
        if (t === '[object Date]') {
          return 'date';
        }
        if (t === '[object Arguments]') {
          return 'arguments';
        }
        if (t === '[object Error]') {
          return 'error';
        }
        if (t === '[object Promise]') {
          return 'promise';
        }
        if (n(e)) {
          return 'buffer';
        }
        if (t === '[object Set]') {
          return 'set';
        }
        if (t === '[object WeakSet]') {
          return 'weakset';
        }
        if (t === '[object Map]') {
          return 'map';
        }
        if (t === '[object WeakMap]') {
          return 'weakmap';
        }
        if (t === '[object Symbol]') {
          return 'symbol';
        }
        if (t === '[object Int8Array]') {
          return 'int8array';
        }
        if (t === '[object Uint8Array]') {
          return 'uint8array';
        }
        if (t === '[object Uint8ClampedArray]') {
          return 'uint8clampedarray';
        }
        if (t === '[object Int16Array]') {
          return 'int16array';
        }
        if (t === '[object Uint16Array]') {
          return 'uint16array';
        }
        if (t === '[object Int32Array]') {
          return 'int32array';
        }
        if (t === '[object Uint32Array]') {
          return 'uint32array';
        }
        if (t === '[object Float32Array]') {
          return 'float32array';
        }
        if (t === '[object Float64Array]') {
          return 'float64array';
        }
        return 'object';
      };
    },
    ,
    ,
    ,
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n =
        (this && this.__awaiter) ||
        function(e, t, r, n) {
          function adopt(e) {
            return e instanceof r
              ? e
              : new r(function(t) {
                  t(e);
                });
          }
          return new (r || (r = Promise))(function(r, u) {
            function fulfilled(e) {
              try {
                step(n.next(e));
              } catch (e) {
                u(e);
              }
            }
            function rejected(e) {
              try {
                step(n['throw'](e));
              } catch (e) {
                u(e);
              }
            }
            function step(e) {
              e.done ? r(e.value) : adopt(e.value).then(fulfilled, rejected);
            }
            step((n = n.apply(e, t || [])).next());
          });
        };
      var u =
        (this && this.__importDefault) ||
        function(e) {
          return e && e.__esModule ? e : { default: e };
        };
      Object.defineProperty(t, '__esModule', { value: true });
      const i = u(r(313));
      const o = r(129);
      const a = u(r(369));
      function shouldUseYarn() {
        try {
          o.execSync('yarnpkg --version', { stdio: 'ignore' });
          return true;
        } catch (e) {
          return false;
        }
      }
      function shouldUpdate() {
        return n(this, void 0, void 0, function*() {
          const e = () => r(134);
          const t = a.default(e()).catch(() => null);
          try {
            const r = yield t;
            if (r && r.latest) {
              const t = shouldUseYarn();
              const r = e();
              console.log();
              console.log(i.default.yellow.bold(`A new version of \`${r.name}\` is available`));
              console.log(
                'You can update by running: ' +
                  i.default.cyan(t ? `yarn global add ${r.name}` : `npm i -g ${r.name}`)
              );
              console.log();
            }
          } catch (e) {}
        });
      }
      t.default = shouldUpdate;
    },
    ,
    ,
    ,
    function(e) {
      e.exports = require('module');
    },
    ,
    function(e, t, r) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      t.codeFrameColumns = codeFrameColumns;
      t.default = _default;
      function _highlight() {
        const e = _interopRequireWildcard(r(149));
        _highlight = function() {
          return e;
        };
        return e;
      }
      function _interopRequireWildcard(e) {
        if (e && e.__esModule) {
          return e;
        } else {
          var t = {};
          if (e != null) {
            for (var r in e) {
              if (Object.prototype.hasOwnProperty.call(e, r)) {
                var n =
                  Object.defineProperty && Object.getOwnPropertyDescriptor
                    ? Object.getOwnPropertyDescriptor(e, r)
                    : {};
                if (n.get || n.set) {
                  Object.defineProperty(t, r, n);
                } else {
                  t[r] = e[r];
                }
              }
            }
          }
          t.default = e;
          return t;
        }
      }
      let n = false;
      function getDefs(e) {
        return { gutter: e.grey, marker: e.red.bold, message: e.red.bold };
      }
      const u = /\r\n|[\n\r\u2028\u2029]/;
      function getMarkerLines(e, t, r) {
        const n = Object.assign({ column: 0, line: -1 }, e.start);
        const u = Object.assign({}, n, e.end);
        const { linesAbove: i = 2, linesBelow: o = 3 } = r || {};
        const a = n.line;
        const s = n.column;
        const c = u.line;
        const f = u.column;
        let l = Math.max(a - (i + 1), 0);
        let p = Math.min(t.length, c + o);
        if (a === -1) {
          l = 0;
        }
        if (c === -1) {
          p = t.length;
        }
        const h = c - a;
        const d = {};
        if (h) {
          for (let e = 0; e <= h; e++) {
            const r = e + a;
            if (!s) {
              d[r] = true;
            } else if (e === 0) {
              const e = t[r - 1].length;
              d[r] = [s, e - s];
            } else if (e === h) {
              d[r] = [0, f];
            } else {
              const n = t[r - e].length;
              d[r] = [0, n];
            }
          }
        } else {
          if (s === f) {
            if (s) {
              d[a] = [s, 0];
            } else {
              d[a] = true;
            }
          } else {
            d[a] = [s, f - s];
          }
        }
        return { start: l, end: p, markerLines: d };
      }
      function codeFrameColumns(e, t, r = {}) {
        const n = (r.highlightCode || r.forceColor) && (0, _highlight().shouldHighlight)(r);
        const i = (0, _highlight().getChalk)(r);
        const o = getDefs(i);
        const a = (e, t) => {
          return n ? e(t) : t;
        };
        if (n) e = (0, _highlight().default)(e, r);
        const s = e.split(u);
        const { start: c, end: f, markerLines: l } = getMarkerLines(t, s, r);
        const p = t.start && typeof t.start.column === 'number';
        const h = String(f).length;
        let d = s
          .slice(c, f)
          .map((e, t) => {
            const n = c + 1 + t;
            const u = ` ${n}`.slice(-h);
            const i = ` ${u} | `;
            const s = l[n];
            const f = !l[n + 1];
            if (s) {
              let t = '';
              if (Array.isArray(s)) {
                const n = e.slice(0, Math.max(s[0] - 1, 0)).replace(/[^\t]/g, ' ');
                const u = s[1] || 1;
                t = ['\n ', a(o.gutter, i.replace(/\d/g, ' ')), n, a(o.marker, '^').repeat(u)].join(
                  ''
                );
                if (f && r.message) {
                  t += ' ' + a(o.message, r.message);
                }
              }
              return [a(o.marker, '>'), a(o.gutter, i), e, t].join('');
            } else {
              return ` ${a(o.gutter, i)}${e}`;
            }
          })
          .join('\n');
        if (r.message && !p) {
          d = `${' '.repeat(h + 1)}${r.message}\n${d}`;
        }
        if (n) {
          return i.reset(d);
        } else {
          return d;
        }
      }
      function _default(e, t, r, u = {}) {
        if (!n) {
          n = true;
          const e =
            'Passing lineNumber and colNumber is deprecated to @babel/code-frame. Please use `codeFrameColumns`.';
          if (process.emitWarning) {
            process.emitWarning(e, 'DeprecationWarning');
          } else {
            const t = new Error(e);
            t.name = 'DeprecationWarning';
            console.warn(new Error(e));
          }
        }
        r = Math.max(r, 0);
        const i = { start: { column: r, line: t } };
        return codeFrameColumns(e, i, u);
      }
    },
    function(e, t, r) {
      'use strict';
      e = r.nmd(e);
      const n = r(83);
      const u = (e, t) =>
        function() {
          const r = e.apply(n, arguments);
          return `[${r + t}m`;
        };
      const i = (e, t) =>
        function() {
          const r = e.apply(n, arguments);
          return `[${38 + t};5;${r}m`;
        };
      const o = (e, t) =>
        function() {
          const r = e.apply(n, arguments);
          return `[${38 + t};2;${r[0]};${r[1]};${r[2]}m`;
        };
      function assembleStyles() {
        const e = new Map();
        const t = {
          modifier: {
            reset: [0, 0],
            bold: [1, 22],
            dim: [2, 22],
            italic: [3, 23],
            underline: [4, 24],
            inverse: [7, 27],
            hidden: [8, 28],
            strikethrough: [9, 29],
          },
          color: {
            black: [30, 39],
            red: [31, 39],
            green: [32, 39],
            yellow: [33, 39],
            blue: [34, 39],
            magenta: [35, 39],
            cyan: [36, 39],
            white: [37, 39],
            gray: [90, 39],
            redBright: [91, 39],
            greenBright: [92, 39],
            yellowBright: [93, 39],
            blueBright: [94, 39],
            magentaBright: [95, 39],
            cyanBright: [96, 39],
            whiteBright: [97, 39],
          },
          bgColor: {
            bgBlack: [40, 49],
            bgRed: [41, 49],
            bgGreen: [42, 49],
            bgYellow: [43, 49],
            bgBlue: [44, 49],
            bgMagenta: [45, 49],
            bgCyan: [46, 49],
            bgWhite: [47, 49],
            bgBlackBright: [100, 49],
            bgRedBright: [101, 49],
            bgGreenBright: [102, 49],
            bgYellowBright: [103, 49],
            bgBlueBright: [104, 49],
            bgMagentaBright: [105, 49],
            bgCyanBright: [106, 49],
            bgWhiteBright: [107, 49],
          },
        };
        t.color.grey = t.color.gray;
        for (const r of Object.keys(t)) {
          const n = t[r];
          for (const r of Object.keys(n)) {
            const u = n[r];
            t[r] = { open: `[${u[0]}m`, close: `[${u[1]}m` };
            n[r] = t[r];
            e.set(u[0], u[1]);
          }
          Object.defineProperty(t, r, { value: n, enumerable: false });
          Object.defineProperty(t, 'codes', { value: e, enumerable: false });
        }
        const r = e => e;
        const a = (e, t, r) => [e, t, r];
        t.color.close = '[39m';
        t.bgColor.close = '[49m';
        t.color.ansi = { ansi: u(r, 0) };
        t.color.ansi256 = { ansi256: i(r, 0) };
        t.color.ansi16m = { rgb: o(a, 0) };
        t.bgColor.ansi = { ansi: u(r, 10) };
        t.bgColor.ansi256 = { ansi256: i(r, 10) };
        t.bgColor.ansi16m = { rgb: o(a, 10) };
        for (let e of Object.keys(n)) {
          if (typeof n[e] !== 'object') {
            continue;
          }
          const r = n[e];
          if (e === 'ansi16') {
            e = 'ansi';
          }
          if ('ansi16' in r) {
            t.color.ansi[e] = u(r.ansi16, 0);
            t.bgColor.ansi[e] = u(r.ansi16, 10);
          }
          if ('ansi256' in r) {
            t.color.ansi256[e] = i(r.ansi256, 0);
            t.bgColor.ansi256[e] = i(r.ansi256, 10);
          }
          if ('rgb' in r) {
            t.color.ansi16m[e] = o(r.rgb, 0);
            t.bgColor.ansi16m[e] = o(r.rgb, 10);
          }
        }
        return t;
      }
      Object.defineProperty(e, 'exports', { enumerable: true, get: assembleStyles });
    },
    function(e, t, r) {
      'use strict';
      var n = r(647);
      var u = r(669);
      var i = r(796);
      var o = r(785);
      var a = r(893)('snapdragon:parser');
      var s = r(562);
      var c = r(324);
      function Parser(e) {
        a('initializing', __filename);
        this.options = c.extend({ source: 'string' }, e);
        this.init(this.options);
        n(this);
      }
      Parser.prototype = {
        constructor: Parser,
        init: function(e) {
          this.orig = '';
          this.input = '';
          this.parsed = '';
          this.column = 1;
          this.line = 1;
          this.regex = new i();
          this.errors = this.errors || [];
          this.parsers = this.parsers || {};
          this.types = this.types || [];
          this.sets = this.sets || {};
          this.fns = this.fns || [];
          this.currentType = 'root';
          var t = this.position();
          this.bos = t({ type: 'bos', val: '' });
          this.ast = { type: 'root', errors: this.errors, nodes: [this.bos] };
          o(this.bos, 'parent', this.ast);
          this.nodes = [this.ast];
          this.count = 0;
          this.setCount = 0;
          this.stack = [];
        },
        error: function(e, t) {
          var r = t.position || { start: { column: 0, line: 0 } };
          var n = r.start.line;
          var u = r.start.column;
          var i = this.options.source;
          var o = i + ' <line:' + n + ' column:' + u + '>: ' + e;
          var a = new Error(o);
          a.source = i;
          a.reason = e;
          a.pos = r;
          if (this.options.silent) {
            this.errors.push(a);
          } else {
            throw a;
          }
        },
        define: function(e, t) {
          o(this, e, t);
          return this;
        },
        position: function() {
          var e = { line: this.line, column: this.column };
          var t = this;
          return function(r) {
            o(r, 'position', new s(e, t));
            return r;
          };
        },
        set: function(e, t) {
          if (this.types.indexOf(e) === -1) {
            this.types.push(e);
          }
          this.parsers[e] = t.bind(this);
          return this;
        },
        get: function(e) {
          return this.parsers[e];
        },
        push: function(e, t) {
          this.sets[e] = this.sets[e] || [];
          this.count++;
          this.stack.push(t);
          return this.sets[e].push(t);
        },
        pop: function(e) {
          this.sets[e] = this.sets[e] || [];
          this.count--;
          this.stack.pop();
          return this.sets[e].pop();
        },
        isInside: function(e) {
          this.sets[e] = this.sets[e] || [];
          return this.sets[e].length > 0;
        },
        isType: function(e, t) {
          return e && e.type === t;
        },
        prev: function(e) {
          return this.stack.length > 0 ? c.last(this.stack, e) : c.last(this.nodes, e);
        },
        consume: function(e) {
          this.input = this.input.substr(e);
        },
        updatePosition: function(e, t) {
          var r = e.match(/\n/g);
          if (r) this.line += r.length;
          var n = e.lastIndexOf('\n');
          this.column = ~n ? t - n : this.column + t;
          this.parsed += e;
          this.consume(t);
        },
        match: function(e) {
          var t = e.exec(this.input);
          if (t) {
            this.updatePosition(t[0], t[0].length);
            return t;
          }
        },
        capture: function(e, t) {
          if (typeof t === 'function') {
            return this.set.apply(this, arguments);
          }
          this.regex.set(e, t);
          this.set(
            e,
            function() {
              var r = this.parsed;
              var n = this.position();
              var u = this.match(t);
              if (!u || !u[0]) return;
              var i = this.prev();
              var a = n({ type: e, val: u[0], parsed: r, rest: this.input });
              if (u[1]) {
                a.inner = u[1];
              }
              o(a, 'inside', this.stack.length > 0);
              o(a, 'parent', i);
              i.nodes.push(a);
            }.bind(this)
          );
          return this;
        },
        capturePair: function(e, t, r, n) {
          this.sets[e] = this.sets[e] || [];
          this.set(e + '.open', function() {
            var r = this.parsed;
            var u = this.position();
            var i = this.match(t);
            if (!i || !i[0]) return;
            var a = i[0];
            this.setCount++;
            this.specialChars = true;
            var s = u({ type: e + '.open', val: a, rest: this.input });
            if (typeof i[1] !== 'undefined') {
              s.inner = i[1];
            }
            var c = this.prev();
            var f = u({ type: e, nodes: [s] });
            o(f, 'rest', this.input);
            o(f, 'parsed', r);
            o(f, 'prefix', i[1]);
            o(f, 'parent', c);
            o(s, 'parent', f);
            if (typeof n === 'function') {
              n.call(this, s, f);
            }
            this.push(e, f);
            c.nodes.push(f);
          });
          this.set(e + '.close', function() {
            var t = this.position();
            var n = this.match(r);
            if (!n || !n[0]) return;
            var u = this.pop(e);
            var i = t({ type: e + '.close', rest: this.input, suffix: n[1], val: n[0] });
            if (!this.isType(u, e)) {
              if (this.options.strict) {
                throw new Error('missing opening "' + e + '"');
              }
              this.setCount--;
              i.escaped = true;
              return i;
            }
            if (i.suffix === '\\') {
              u.escaped = true;
              i.escaped = true;
            }
            u.nodes.push(i);
            o(i, 'parent', u);
          });
          return this;
        },
        eos: function() {
          var e = this.position();
          if (this.input) return;
          var t = this.prev();
          while (t.type !== 'root' && !t.visited) {
            if (this.options.strict === true) {
              throw new SyntaxError('invalid syntax:' + u.inspect(t, null, 2));
            }
            if (!hasDelims(t)) {
              t.parent.escaped = true;
              t.escaped = true;
            }
            visit(t, function(e) {
              if (!hasDelims(e.parent)) {
                e.parent.escaped = true;
                e.escaped = true;
              }
            });
            t = t.parent;
          }
          var r = e({ type: 'eos', val: this.append || '' });
          o(r, 'parent', this.ast);
          return r;
        },
        next: function() {
          var e = this.parsed;
          var t = this.types.length;
          var r = -1;
          var n;
          while (++r < t) {
            if ((n = this.parsers[this.types[r]].call(this))) {
              o(n, 'rest', this.input);
              o(n, 'parsed', e);
              this.last = n;
              return n;
            }
          }
        },
        parse: function(e) {
          if (typeof e !== 'string') {
            throw new TypeError('expected a string');
          }
          this.init(this.options);
          this.orig = e;
          this.input = e;
          var t = this;
          function parse() {
            e = t.input;
            var r = t.next();
            if (r) {
              var n = t.prev();
              if (n) {
                o(r, 'parent', n);
                if (n.nodes) {
                  n.nodes.push(r);
                }
              }
              if (t.sets.hasOwnProperty(n.type)) {
                t.currentType = n.type;
              }
            }
            if (t.input && e === t.input) {
              throw new Error('no parsers registered for: "' + t.input.slice(0, 5) + '"');
            }
          }
          while (this.input) parse();
          if (this.stack.length && this.options.strict) {
            var r = this.stack.pop();
            throw this.error('missing opening ' + r.type + ': "' + this.orig + '"');
          }
          var n = this.eos();
          var u = this.prev();
          if (u.type !== 'eos') {
            this.ast.nodes.push(n);
          }
          return this.ast;
        },
      };
      function visit(e, t) {
        if (!e.visited) {
          o(e, 'visited', true);
          return e.nodes ? mapVisit(e.nodes, t) : t(e);
        }
        return e;
      }
      function mapVisit(e, t) {
        var r = e.length;
        var n = -1;
        while (++n < r) {
          visit(e[n], t);
        }
      }
      function hasOpen(e) {
        return e.nodes && e.nodes[0].type === e.type + '.open';
      }
      function hasClose(e) {
        return e.nodes && c.last(e.nodes).type === e.type + '.close';
      }
      function hasDelims(e) {
        return hasOpen(e) && hasClose(e);
      }
      e.exports = Parser;
    },
    ,
    ,
    ,
    ,
    ,
    ,
    function(e) {
      function pascalcase(e) {
        if (typeof e !== 'string') {
          throw new TypeError('expected a string.');
        }
        e = e.replace(/([A-Z])/g, ' $1');
        if (e.length === 1) {
          return e.toUpperCase();
        }
        e = e.replace(/^[\W_]+|[\W_]+$/g, '').toLowerCase();
        e = e.charAt(0).toUpperCase() + e.slice(1);
        return e.replace(/[\W_]+(\w|$)/g, function(e, t) {
          return t.toUpperCase();
        });
      }
      e.exports = pascalcase;
    },
    ,
    function(e) {
      var t = 1e3;
      var r = t * 60;
      var n = r * 60;
      var u = n * 24;
      var i = u * 365.25;
      e.exports = function(e, t) {
        t = t || {};
        var r = typeof e;
        if (r === 'string' && e.length > 0) {
          return parse(e);
        } else if (r === 'number' && isNaN(e) === false) {
          return t.long ? fmtLong(e) : fmtShort(e);
        }
        throw new Error(
          'val is not a non-empty string or a valid number. val=' + JSON.stringify(e)
        );
      };
      function parse(e) {
        e = String(e);
        if (e.length > 100) {
          return;
        }
        var o = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(
          e
        );
        if (!o) {
          return;
        }
        var a = parseFloat(o[1]);
        var s = (o[2] || 'ms').toLowerCase();
        switch (s) {
          case 'years':
          case 'year':
          case 'yrs':
          case 'yr':
          case 'y':
            return a * i;
          case 'days':
          case 'day':
          case 'd':
            return a * u;
          case 'hours':
          case 'hour':
          case 'hrs':
          case 'hr':
          case 'h':
            return a * n;
          case 'minutes':
          case 'minute':
          case 'mins':
          case 'min':
          case 'm':
            return a * r;
          case 'seconds':
          case 'second':
          case 'secs':
          case 'sec':
          case 's':
            return a * t;
          case 'milliseconds':
          case 'millisecond':
          case 'msecs':
          case 'msec':
          case 'ms':
            return a;
          default:
            return undefined;
        }
      }
      function fmtShort(e) {
        if (e >= u) {
          return Math.round(e / u) + 'd';
        }
        if (e >= n) {
          return Math.round(e / n) + 'h';
        }
        if (e >= r) {
          return Math.round(e / r) + 'm';
        }
        if (e >= t) {
          return Math.round(e / t) + 's';
        }
        return e + 'ms';
      }
      function fmtLong(e) {
        return (
          plural(e, u, 'day') ||
          plural(e, n, 'hour') ||
          plural(e, r, 'minute') ||
          plural(e, t, 'second') ||
          e + ' ms'
        );
      }
      function plural(e, t, r) {
        if (e < t) {
          return;
        }
        if (e < t * 1.5) {
          return Math.floor(e / t) + ' ' + r;
        }
        return Math.ceil(e / t) + ' ' + r + 's';
      }
    },
    ,
    ,
    ,
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n = r(719);
      var u = { get: 'function', set: 'function', configurable: 'boolean', enumerable: 'boolean' };
      function isAccessorDescriptor(e, t) {
        if (typeof t === 'string') {
          var r = Object.getOwnPropertyDescriptor(e, t);
          return typeof r !== 'undefined';
        }
        if (n(e) !== 'object') {
          return false;
        }
        if (has(e, 'value') || has(e, 'writable')) {
          return false;
        }
        if (!has(e, 'get') || typeof e.get !== 'function') {
          return false;
        }
        if (has(e, 'set') && typeof e[i] !== 'function' && typeof e[i] !== 'undefined') {
          return false;
        }
        for (var i in e) {
          if (!u.hasOwnProperty(i)) {
            continue;
          }
          if (n(e[i]) === u[i]) {
            continue;
          }
          if (typeof e[i] !== 'undefined') {
            return false;
          }
        }
        return true;
      }
      function has(e, t) {
        return {}.hasOwnProperty.call(e, t);
      }
      e.exports = isAccessorDescriptor;
    },
    ,
    ,
    function(e) {
      function listCacheClear() {
        this.__data__ = [];
        this.size = 0;
      }
      e.exports = listCacheClear;
    },
    ,
    function(e, t, r) {
      'use strict';
      const n = r(747);
      const u = r(622);
      const i = r(887);
      const o = r(823);
      const a = () => u.join(o, i());
      e.exports.file = t => {
        t = { extension: '', ...t };
        if (t.name) {
          if (t.extension) {
            throw new Error('The `name` and `extension` options are mutually exclusive');
          }
          return u.join(e.exports.directory(), t.name);
        }
        return a() + '.' + t.extension.replace(/^\./, '');
      };
      e.exports.directory = () => {
        const e = a();
        n.mkdirSync(e);
        return e;
      };
      Object.defineProperty(e.exports, 'root', {
        get() {
          return o;
        },
      });
    },
    ,
    ,
    ,
    function(e, t, r) {
      var n = r(48),
        u = r(410),
        i = r(808);
      var o = '[object Null]',
        a = '[object Undefined]';
      var s = n ? n.toStringTag : undefined;
      function baseGetTag(e) {
        if (e == null) {
          return e === undefined ? a : o;
        }
        return s && s in Object(e) ? u(e) : i(e);
      }
      e.exports = baseGetTag;
    },
    function(e, t, r) {
      var n = r(170),
        u = r(348);
      var i = n(u, 'Map');
      e.exports = i;
    },
    function(e, t, r) {
      'use strict';
      const n = r(766);
      const u = r(285);
      const i = r(933).stdout;
      const o = r(341);
      const a =
        process.platform === 'win32' && !(process.env.TERM || '').toLowerCase().startsWith('xterm');
      const s = ['ansi', 'ansi', 'ansi256', 'ansi16m'];
      const c = new Set(['gray']);
      const f = Object.create(null);
      function applyOptions(e, t) {
        t = t || {};
        const r = i ? i.level : 0;
        e.level = t.level === undefined ? r : t.level;
        e.enabled = 'enabled' in t ? t.enabled : e.level > 0;
      }
      function Chalk(e) {
        if (!this || !(this instanceof Chalk) || this.template) {
          const t = {};
          applyOptions(t, e);
          t.template = function() {
            const e = [].slice.call(arguments);
            return chalkTag.apply(null, [t.template].concat(e));
          };
          Object.setPrototypeOf(t, Chalk.prototype);
          Object.setPrototypeOf(t.template, t);
          t.template.constructor = Chalk;
          return t.template;
        }
        applyOptions(this, e);
      }
      if (a) {
        u.blue.open = '[94m';
      }
      for (const e of Object.keys(u)) {
        u[e].closeRe = new RegExp(n(u[e].close), 'g');
        f[e] = {
          get() {
            const t = u[e];
            return build.call(this, this._styles ? this._styles.concat(t) : [t], this._empty, e);
          },
        };
      }
      f.visible = {
        get() {
          return build.call(this, this._styles || [], true, 'visible');
        },
      };
      u.color.closeRe = new RegExp(n(u.color.close), 'g');
      for (const e of Object.keys(u.color.ansi)) {
        if (c.has(e)) {
          continue;
        }
        f[e] = {
          get() {
            const t = this.level;
            return function() {
              const r = u.color[s[t]][e].apply(null, arguments);
              const n = { open: r, close: u.color.close, closeRe: u.color.closeRe };
              return build.call(this, this._styles ? this._styles.concat(n) : [n], this._empty, e);
            };
          },
        };
      }
      u.bgColor.closeRe = new RegExp(n(u.bgColor.close), 'g');
      for (const e of Object.keys(u.bgColor.ansi)) {
        if (c.has(e)) {
          continue;
        }
        const t = 'bg' + e[0].toUpperCase() + e.slice(1);
        f[t] = {
          get() {
            const t = this.level;
            return function() {
              const r = u.bgColor[s[t]][e].apply(null, arguments);
              const n = { open: r, close: u.bgColor.close, closeRe: u.bgColor.closeRe };
              return build.call(this, this._styles ? this._styles.concat(n) : [n], this._empty, e);
            };
          },
        };
      }
      const l = Object.defineProperties(() => {}, f);
      function build(e, t, r) {
        const n = function() {
          return applyStyle.apply(n, arguments);
        };
        n._styles = e;
        n._empty = t;
        const u = this;
        Object.defineProperty(n, 'level', {
          enumerable: true,
          get() {
            return u.level;
          },
          set(e) {
            u.level = e;
          },
        });
        Object.defineProperty(n, 'enabled', {
          enumerable: true,
          get() {
            return u.enabled;
          },
          set(e) {
            u.enabled = e;
          },
        });
        n.hasGrey = this.hasGrey || r === 'gray' || r === 'grey';
        n.__proto__ = l;
        return n;
      }
      function applyStyle() {
        const e = arguments;
        const t = e.length;
        let r = String(arguments[0]);
        if (t === 0) {
          return '';
        }
        if (t > 1) {
          for (let n = 1; n < t; n++) {
            r += ' ' + e[n];
          }
        }
        if (!this.enabled || this.level <= 0 || !r) {
          return this._empty ? '' : r;
        }
        const n = u.dim.open;
        if (a && this.hasGrey) {
          u.dim.open = '';
        }
        for (const e of this._styles.slice().reverse()) {
          r = e.open + r.replace(e.closeRe, e.open) + e.close;
          r = r.replace(/\r?\n/g, `${e.close}$&${e.open}`);
        }
        u.dim.open = n;
        return r;
      }
      function chalkTag(e, t) {
        if (!Array.isArray(t)) {
          return [].slice.call(arguments, 1).join(' ');
        }
        const r = [].slice.call(arguments, 2);
        const n = [t.raw[0]];
        for (let e = 1; e < t.length; e++) {
          n.push(String(r[e - 1]).replace(/[{}\\]/g, '\\$&'));
          n.push(String(t.raw[e]));
        }
        return o(e, n.join(''));
      }
      Object.defineProperties(Chalk.prototype, f);
      e.exports = Chalk();
      e.exports.supportsColor = i;
      e.exports.default = e.exports;
    },
    ,
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n = r(754);
      var u = r(424);
      var i = r(893)('expand-brackets');
      var o = r(192);
      var a = r(440);
      var s = r(204);
      function brackets(e, t) {
        i('initializing from <%s>', __filename);
        var r = brackets.create(e, t);
        return r.output;
      }
      brackets.match = function(e, t, r) {
        e = [].concat(e);
        var n = o({}, r);
        var u = brackets.matcher(t, n);
        var i = e.length;
        var a = -1;
        var s = [];
        while (++a < i) {
          var c = e[a];
          if (u(c)) {
            s.push(c);
          }
        }
        if (s.length === 0) {
          if (n.failglob === true) {
            throw new Error('no matches found for "' + t + '"');
          }
          if (n.nonull === true || n.nullglob === true) {
            return [t.split('\\').join('')];
          }
        }
        return s;
      };
      brackets.isMatch = function(e, t, r) {
        return brackets.matcher(t, r)(e);
      };
      brackets.matcher = function(e, t) {
        var r = brackets.makeRe(e, t);
        return function(e) {
          return r.test(e);
        };
      };
      brackets.makeRe = function(e, t) {
        var r = brackets.create(e, t);
        var n = o({ strictErrors: false }, t);
        return s(r.output, n);
      };
      brackets.create = function(e, t) {
        var r = (t && t.snapdragon) || new a(t);
        n(r);
        u(r);
        var i = r.parse(e, t);
        i.input = e;
        var o = r.compile(i, t);
        o.input = e;
        return o;
      };
      brackets.compilers = n;
      brackets.parsers = u;
      e.exports = brackets;
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(323).fromCallback;
      const u = r(622);
      const i = r(729);
      const o = r(983);
      const a = r(917).pathExists;
      function createLink(e, t, r) {
        function makeLink(e, t) {
          i.link(e, t, e => {
            if (e) return r(e);
            r(null);
          });
        }
        a(t, (n, s) => {
          if (n) return r(n);
          if (s) return r(null);
          i.lstat(e, (n, i) => {
            if (n) {
              n.message = n.message.replace('lstat', 'ensureLink');
              return r(n);
            }
            const s = u.dirname(t);
            a(s, (n, u) => {
              if (n) return r(n);
              if (u) return makeLink(e, t);
              o.mkdirs(s, n => {
                if (n) return r(n);
                makeLink(e, t);
              });
            });
          });
        });
      }
      function createLinkSync(e, t, r) {
        const n = i.existsSync(t);
        if (n) return undefined;
        try {
          i.lstatSync(e);
        } catch (e) {
          e.message = e.message.replace('lstat', 'ensureLink');
          throw e;
        }
        const a = u.dirname(t);
        const s = i.existsSync(a);
        if (s) return i.linkSync(e, t);
        o.mkdirsSync(a);
        return i.linkSync(e, t);
      }
      e.exports = { createLink: n(createLink), createLinkSync: createLinkSync };
    },
    ,
    function(e, t) {
      'use strict';
      t.fromCallback = function(e) {
        return Object.defineProperty(
          function() {
            if (typeof arguments[arguments.length - 1] === 'function') e.apply(this, arguments);
            else {
              return new Promise((t, r) => {
                arguments[arguments.length] = (e, n) => {
                  if (e) return r(e);
                  t(n);
                };
                arguments.length++;
                e.apply(this, arguments);
              });
            }
          },
          'name',
          { value: e.name }
        );
      };
      t.fromPromise = function(e) {
        return Object.defineProperty(
          function() {
            const t = arguments[arguments.length - 1];
            if (typeof t !== 'function') return e.apply(this, arguments);
            else e.apply(this, arguments).then(e => t(null, e), t);
          },
          'name',
          { value: e.name }
        );
      };
    },
    function(e, t, r) {
      'use strict';
      t.extend = r(192);
      t.SourceMap = r(54);
      t.sourceMapResolve = r(162);
      t.unixify = function(e) {
        return e.split(/\\+/).join('/');
      };
      t.isString = function(e) {
        return e && typeof e === 'string';
      };
      t.arrayify = function(e) {
        if (typeof e === 'string') return [e];
        return e ? (Array.isArray(e) ? e : [e]) : [];
      };
      t.last = function(e, t) {
        return e[e.length - (t || 1)];
      };
    },
    function(e, t, r) {
      var n = r(704);
      function get(e, t, r) {
        var u = e == null ? undefined : n(e, t);
        return u === undefined ? r : u;
      }
      e.exports = get;
    },
    function(e, t, r) {
      'use strict';
      const n = r(729);
      const u = r(622);
      const i = r(357);
      const o = process.platform === 'win32';
      function defaults(e) {
        const t = ['unlink', 'chmod', 'stat', 'lstat', 'rmdir', 'readdir'];
        t.forEach(t => {
          e[t] = e[t] || n[t];
          t = t + 'Sync';
          e[t] = e[t] || n[t];
        });
        e.maxBusyTries = e.maxBusyTries || 3;
      }
      function rimraf(e, t, r) {
        let n = 0;
        if (typeof t === 'function') {
          r = t;
          t = {};
        }
        i(e, 'rimraf: missing path');
        i.equal(typeof e, 'string', 'rimraf: path should be a string');
        i.equal(typeof r, 'function', 'rimraf: callback function required');
        i(t, 'rimraf: invalid options argument provided');
        i.equal(typeof t, 'object', 'rimraf: options should be object');
        defaults(t);
        rimraf_(e, t, function CB(u) {
          if (u) {
            if (
              (u.code === 'EBUSY' || u.code === 'ENOTEMPTY' || u.code === 'EPERM') &&
              n < t.maxBusyTries
            ) {
              n++;
              let r = n * 100;
              return setTimeout(() => rimraf_(e, t, CB), r);
            }
            if (u.code === 'ENOENT') u = null;
          }
          r(u);
        });
      }
      function rimraf_(e, t, r) {
        i(e);
        i(t);
        i(typeof r === 'function');
        t.lstat(e, (n, u) => {
          if (n && n.code === 'ENOENT') {
            return r(null);
          }
          if (n && n.code === 'EPERM' && o) {
            return fixWinEPERM(e, t, n, r);
          }
          if (u && u.isDirectory()) {
            return rmdir(e, t, n, r);
          }
          t.unlink(e, n => {
            if (n) {
              if (n.code === 'ENOENT') {
                return r(null);
              }
              if (n.code === 'EPERM') {
                return o ? fixWinEPERM(e, t, n, r) : rmdir(e, t, n, r);
              }
              if (n.code === 'EISDIR') {
                return rmdir(e, t, n, r);
              }
            }
            return r(n);
          });
        });
      }
      function fixWinEPERM(e, t, r, n) {
        i(e);
        i(t);
        i(typeof n === 'function');
        if (r) {
          i(r instanceof Error);
        }
        t.chmod(e, 438, u => {
          if (u) {
            n(u.code === 'ENOENT' ? null : r);
          } else {
            t.stat(e, (u, i) => {
              if (u) {
                n(u.code === 'ENOENT' ? null : r);
              } else if (i.isDirectory()) {
                rmdir(e, t, r, n);
              } else {
                t.unlink(e, n);
              }
            });
          }
        });
      }
      function fixWinEPERMSync(e, t, r) {
        let n;
        i(e);
        i(t);
        if (r) {
          i(r instanceof Error);
        }
        try {
          t.chmodSync(e, 438);
        } catch (e) {
          if (e.code === 'ENOENT') {
            return;
          } else {
            throw r;
          }
        }
        try {
          n = t.statSync(e);
        } catch (e) {
          if (e.code === 'ENOENT') {
            return;
          } else {
            throw r;
          }
        }
        if (n.isDirectory()) {
          rmdirSync(e, t, r);
        } else {
          t.unlinkSync(e);
        }
      }
      function rmdir(e, t, r, n) {
        i(e);
        i(t);
        if (r) {
          i(r instanceof Error);
        }
        i(typeof n === 'function');
        t.rmdir(e, u => {
          if (u && (u.code === 'ENOTEMPTY' || u.code === 'EEXIST' || u.code === 'EPERM')) {
            rmkids(e, t, n);
          } else if (u && u.code === 'ENOTDIR') {
            n(r);
          } else {
            n(u);
          }
        });
      }
      function rmkids(e, t, r) {
        i(e);
        i(t);
        i(typeof r === 'function');
        t.readdir(e, (n, i) => {
          if (n) return r(n);
          let o = i.length;
          let a;
          if (o === 0) return t.rmdir(e, r);
          i.forEach(n => {
            rimraf(u.join(e, n), t, n => {
              if (a) {
                return;
              }
              if (n) return r((a = n));
              if (--o === 0) {
                t.rmdir(e, r);
              }
            });
          });
        });
      }
      function rimrafSync(e, t) {
        let r;
        t = t || {};
        defaults(t);
        i(e, 'rimraf: missing path');
        i.equal(typeof e, 'string', 'rimraf: path should be a string');
        i(t, 'rimraf: missing options');
        i.equal(typeof t, 'object', 'rimraf: options should be object');
        try {
          r = t.lstatSync(e);
        } catch (r) {
          if (r.code === 'ENOENT') {
            return;
          }
          if (r.code === 'EPERM' && o) {
            fixWinEPERMSync(e, t, r);
          }
        }
        try {
          if (r && r.isDirectory()) {
            rmdirSync(e, t, null);
          } else {
            t.unlinkSync(e);
          }
        } catch (r) {
          if (r.code === 'ENOENT') {
            return;
          } else if (r.code === 'EPERM') {
            return o ? fixWinEPERMSync(e, t, r) : rmdirSync(e, t, r);
          } else if (r.code !== 'EISDIR') {
            throw r;
          }
          rmdirSync(e, t, r);
        }
      }
      function rmdirSync(e, t, r) {
        i(e);
        i(t);
        if (r) {
          i(r instanceof Error);
        }
        try {
          t.rmdirSync(e);
        } catch (n) {
          if (n.code === 'ENOTDIR') {
            throw r;
          } else if (n.code === 'ENOTEMPTY' || n.code === 'EEXIST' || n.code === 'EPERM') {
            rmkidsSync(e, t);
          } else if (n.code !== 'ENOENT') {
            throw n;
          }
        }
      }
      function rmkidsSync(e, t) {
        i(e);
        i(t);
        t.readdirSync(e).forEach(r => rimrafSync(u.join(e, r), t));
        const r = o ? 100 : 1;
        let n = 0;
        do {
          let u = true;
          try {
            const i = t.rmdirSync(e, t);
            u = false;
            return i;
          } finally {
            if (++n < r && u) continue;
          }
        } while (true);
      }
      e.exports = rimraf;
      rimraf.sync = rimrafSync;
    },
    function(e, t, r) {
      'use strict';
      var n = r(591);
      var u = r(625);
      e.exports = function(e) {
        var t = e.compiler.compilers;
        var r = e.options;
        e.use(n.compilers);
        var i = t.escape;
        var o = t.qmark;
        var a = t.slash;
        var s = t.star;
        var c = t.text;
        var f = t.plus;
        var l = t.dot;
        if (r.extglob === false || r.noext === true) {
          e.compiler.use(escapeExtglobs);
        } else {
          e.use(u.compilers);
        }
        e.use(function() {
          this.options.star =
            this.options.star ||
            function() {
              return '[^\\\\/]*?';
            };
        });
        e.compiler
          .set('dot', l)
          .set('escape', i)
          .set('plus', f)
          .set('slash', a)
          .set('qmark', o)
          .set('star', s)
          .set('text', c);
      };
      function escapeExtglobs(e) {
        e.set('paren', function(e) {
          var t = '';
          visit(e, function(e) {
            if (e.val) t += (/^\W/.test(e.val) ? '\\' : '') + e.val;
          });
          return this.emit(t, e);
        });
        function visit(e, t) {
          return e.nodes ? mapVisit(e.nodes, t) : t(e);
        }
        function mapVisit(e, t) {
          var r = e.length;
          var n = -1;
          while (++n < r) {
            visit(e[n], t);
          }
        }
      }
    },
    ,
    ,
    ,
    function(e) {
      var t = Object.prototype.toString;
      e.exports = function kindOf(e) {
        var r = typeof e;
        if (r === 'undefined') {
          return 'undefined';
        }
        if (e === null) {
          return 'null';
        }
        if (e === true || e === false || e instanceof Boolean) {
          return 'boolean';
        }
        if (r === 'string' || e instanceof String) {
          return 'string';
        }
        if (r === 'number' || e instanceof Number) {
          return 'number';
        }
        if (r === 'function' || e instanceof Function) {
          if (
            typeof e.constructor.name !== 'undefined' &&
            e.constructor.name.slice(0, 9) === 'Generator'
          ) {
            return 'generatorfunction';
          }
          return 'function';
        }
        if (typeof Array.isArray !== 'undefined' && Array.isArray(e)) {
          return 'array';
        }
        if (e instanceof RegExp) {
          return 'regexp';
        }
        if (e instanceof Date) {
          return 'date';
        }
        r = t.call(e);
        if (r === '[object RegExp]') {
          return 'regexp';
        }
        if (r === '[object Date]') {
          return 'date';
        }
        if (r === '[object Arguments]') {
          return 'arguments';
        }
        if (r === '[object Error]') {
          return 'error';
        }
        if (r === '[object Promise]') {
          return 'promise';
        }
        if (isBuffer(e)) {
          return 'buffer';
        }
        if (r === '[object Set]') {
          return 'set';
        }
        if (r === '[object WeakSet]') {
          return 'weakset';
        }
        if (r === '[object Map]') {
          return 'map';
        }
        if (r === '[object WeakMap]') {
          return 'weakmap';
        }
        if (r === '[object Symbol]') {
          return 'symbol';
        }
        if (r === '[object Map Iterator]') {
          return 'mapiterator';
        }
        if (r === '[object Set Iterator]') {
          return 'setiterator';
        }
        if (r === '[object String Iterator]') {
          return 'stringiterator';
        }
        if (r === '[object Array Iterator]') {
          return 'arrayiterator';
        }
        if (r === '[object Int8Array]') {
          return 'int8array';
        }
        if (r === '[object Uint8Array]') {
          return 'uint8array';
        }
        if (r === '[object Uint8ClampedArray]') {
          return 'uint8clampedarray';
        }
        if (r === '[object Int16Array]') {
          return 'int16array';
        }
        if (r === '[object Uint16Array]') {
          return 'uint16array';
        }
        if (r === '[object Int32Array]') {
          return 'int32array';
        }
        if (r === '[object Uint32Array]') {
          return 'uint32array';
        }
        if (r === '[object Float32Array]') {
          return 'float32array';
        }
        if (r === '[object Float64Array]') {
          return 'float64array';
        }
        return 'object';
      };
      function isBuffer(e) {
        return (
          e.constructor && typeof e.constructor.isBuffer === 'function' && e.constructor.isBuffer(e)
        );
      }
    },
    ,
    function(e, t, r) {
      'use strict';
      var n = r(787);
      var u = r(63);
      e.exports = function(e, t, r) {
        var i;
        if (typeof r === 'string' && t in e) {
          var o = [].slice.call(arguments, 2);
          i = e[t].apply(e, o);
        } else if (Array.isArray(r)) {
          i = u.apply(null, arguments);
        } else {
          i = n.apply(null, arguments);
        }
        if (typeof i !== 'undefined') {
          return i;
        }
        return e;
      };
    },
    ,
    ,
    ,
    function(e) {
      var t = typeof global == 'object' && global && global.Object === Object && global;
      e.exports = t;
    },
    ,
    ,
    ,
    function(e) {
      'use strict';
      const t = /(?:\\(u[a-f\d]{4}|x[a-f\d]{2}|.))|(?:\{(~)?(\w+(?:\([^)]*\))?(?:\.\w+(?:\([^)]*\))?)*)(?:[ \t]|(?=\r?\n)))|(\})|((?:.|[\r\n\f])+?)/gi;
      const r = /(?:^|\.)(\w+)(?:\(([^)]*)\))?/g;
      const n = /^(['"])((?:\\.|(?!\1)[^\\])*)\1$/;
      const u = /\\(u[a-f\d]{4}|x[a-f\d]{2}|.)|([^\\])/gi;
      const i = new Map([
        ['n', '\n'],
        ['r', '\r'],
        ['t', '\t'],
        ['b', '\b'],
        ['f', '\f'],
        ['v', '\v'],
        ['0', '\0'],
        ['\\', '\\'],
        ['e', ''],
        ['a', ''],
      ]);
      function unescape(e) {
        if ((e[0] === 'u' && e.length === 5) || (e[0] === 'x' && e.length === 3)) {
          return String.fromCharCode(parseInt(e.slice(1), 16));
        }
        return i.get(e) || e;
      }
      function parseArguments(e, t) {
        const r = [];
        const i = t.trim().split(/\s*,\s*/g);
        let o;
        for (const t of i) {
          if (!isNaN(t)) {
            r.push(Number(t));
          } else if ((o = t.match(n))) {
            r.push(o[2].replace(u, (e, t, r) => (t ? unescape(t) : r)));
          } else {
            throw new Error(`Invalid Chalk template style argument: ${t} (in style '${e}')`);
          }
        }
        return r;
      }
      function parseStyle(e) {
        r.lastIndex = 0;
        const t = [];
        let n;
        while ((n = r.exec(e)) !== null) {
          const e = n[1];
          if (n[2]) {
            const r = parseArguments(e, n[2]);
            t.push([e].concat(r));
          } else {
            t.push([e]);
          }
        }
        return t;
      }
      function buildStyle(e, t) {
        const r = {};
        for (const e of t) {
          for (const t of e.styles) {
            r[t[0]] = e.inverse ? null : t.slice(1);
          }
        }
        let n = e;
        for (const e of Object.keys(r)) {
          if (Array.isArray(r[e])) {
            if (!(e in n)) {
              throw new Error(`Unknown Chalk style: ${e}`);
            }
            if (r[e].length > 0) {
              n = n[e].apply(n, r[e]);
            } else {
              n = n[e];
            }
          }
        }
        return n;
      }
      e.exports = (e, r) => {
        const n = [];
        const u = [];
        let i = [];
        r.replace(t, (t, r, o, a, s, c) => {
          if (r) {
            i.push(unescape(r));
          } else if (a) {
            const t = i.join('');
            i = [];
            u.push(n.length === 0 ? t : buildStyle(e, n)(t));
            n.push({ inverse: o, styles: parseStyle(a) });
          } else if (s) {
            if (n.length === 0) {
              throw new Error('Found extraneous } in Chalk template literal');
            }
            u.push(buildStyle(e, n)(i.join('')));
            i = [];
            n.pop();
          } else {
            i.push(c);
          }
        });
        u.push(i.join(''));
        if (n.length > 0) {
          const e = `Chalk template literal is missing ${n.length} closing bracket${n.length === 1
            ? ''
            : 's'} (\`}\`)`;
          throw new Error(e);
        }
        return u.join('');
      };
    },
    function(e) {
      var t = 9007199254740991;
      var r = /^(?:0|[1-9]\d*)$/;
      function isIndex(e, n) {
        var u = typeof e;
        n = n == null ? t : n;
        return (
          !!n && (u == 'number' || (u != 'symbol' && r.test(e))) && (e > -1 && e % 1 == 0 && e < n)
        );
      }
      e.exports = isIndex;
    },
    ,
    ,
    ,
    function(e, t, r) {
      var n = r(174);
      var u = Object.create(null);
      var i = r(538);
      e.exports = n(inflight);
      function inflight(e, t) {
        if (u[e]) {
          u[e].push(t);
          return null;
        } else {
          u[e] = [t];
          return makeres(e);
        }
      }
      function makeres(e) {
        return i(function RES() {
          var t = u[e];
          var r = t.length;
          var n = slice(arguments);
          try {
            for (var i = 0; i < r; i++) {
              t[i].apply(null, n);
            }
          } finally {
            if (t.length > r) {
              t.splice(0, r);
              process.nextTick(function() {
                RES.apply(null, n);
              });
            } else {
              delete u[e];
            }
          }
        });
      }
      function slice(e) {
        var t = e.length;
        var r = [];
        for (var n = 0; n < t; n++) r[n] = e[n];
        return r;
      }
    },
    ,
    function(e, t, r) {
      var n = r(337);
      var u = typeof self == 'object' && self && self.Object === Object && self;
      var i = n || u || Function('return this')();
      e.exports = i;
    },
    ,
    ,
    function(e, t, r) {
      var n = r(56);
      var u = (function() {
        var e = /[^.]+$/.exec((n && n.keys && n.keys.IE_PROTO) || '');
        return e ? 'Symbol(src)_1.' + e : '';
      })();
      function isMasked(e) {
        return !!u && u in e;
      }
      e.exports = isMasked;
    },
    function(e) {
      e.exports = {
        ROOT: 0,
        GROUP: 1,
        POSITION: 2,
        SET: 3,
        RANGE: 4,
        REPETITION: 5,
        REFERENCE: 6,
        CHAR: 7,
      };
    },
    ,
    ,
    ,
    ,
    function(e) {
      e.exports = require('assert');
    },
    function(e, t, r) {
      'use strict';
      var n = r(204);
      var u = r(156);
      var i = r(192);
      var o = r(926);
      var a = r(919);
      var s = r(514);
      var c = r(49);
      var f = 1024 * 64;
      var l = {};
      function braces(e, t) {
        var r = c.createKey(String(e), t);
        var n = [];
        var i = t && t.cache === false;
        if (!i && l.hasOwnProperty(r)) {
          return l[r];
        }
        if (Array.isArray(e)) {
          for (var o = 0; o < e.length; o++) {
            n.push.apply(n, braces.create(e[o], t));
          }
        } else {
          n = braces.create(e, t);
        }
        if (t && t.nodupes === true) {
          n = u(n);
        }
        if (!i) {
          l[r] = n;
        }
        return n;
      }
      braces.expand = function(e, t) {
        return braces.create(e, i({}, t, { expand: true }));
      };
      braces.optimize = function(e, t) {
        return braces.create(e, t);
      };
      braces.create = function(e, t) {
        if (typeof e !== 'string') {
          throw new TypeError('expected a string');
        }
        var r = (t && t.maxLength) || f;
        if (e.length >= r) {
          throw new Error('expected pattern to be less than ' + r + ' characters');
        }
        function create() {
          if (e === '' || e.length < 3) {
            return [e];
          }
          if (c.isEmptySets(e)) {
            return [];
          }
          if (c.isQuotedString(e)) {
            return [e.slice(1, -1)];
          }
          var r = new s(t);
          var n = !t || t.expand !== true ? r.optimize(e, t) : r.expand(e, t);
          var i = n.output;
          if (t && t.noempty === true) {
            i = i.filter(Boolean);
          }
          if (t && t.nodupes === true) {
            i = u(i);
          }
          Object.defineProperty(i, 'result', { enumerable: false, value: n });
          return i;
        }
        return memoize('create', e, t, create);
      };
      braces.makeRe = function(e, t) {
        if (typeof e !== 'string') {
          throw new TypeError('expected a string');
        }
        var r = (t && t.maxLength) || f;
        if (e.length >= r) {
          throw new Error('expected pattern to be less than ' + r + ' characters');
        }
        function makeRe() {
          var r = braces(e, t);
          var u = i({ strictErrors: false }, t);
          return n(r, u);
        }
        return memoize('makeRe', e, t, makeRe);
      };
      braces.parse = function(e, t) {
        var r = new s(t);
        return r.parse(e, t);
      };
      braces.compile = function(e, t) {
        var r = new s(t);
        return r.compile(e, t);
      };
      braces.clearCache = function() {
        l = braces.cache = {};
      };
      function memoize(e, t, r, n) {
        var u = c.createKey(e + ':' + t, r);
        var i = r && r.cache === false;
        if (i) {
          braces.clearCache();
          return n(t, r);
        }
        if (l.hasOwnProperty(u)) {
          return l[u];
        }
        var o = n(t, r);
        l[u] = o;
        return o;
      }
      braces.Braces = s;
      braces.compilers = o;
      braces.parsers = a;
      braces.cache = l;
      e.exports = braces;
    },
    ,
    function(e) {
      'use strict';
      var t = '';
      var r;
      e.exports = repeat;
      function repeat(e, n) {
        if (typeof e !== 'string') {
          throw new TypeError('expected a string');
        }
        if (n === 1) return e;
        if (n === 2) return e + e;
        var u = e.length * n;
        if (r !== e || typeof r === 'undefined') {
          r = e;
          t = '';
        } else if (t.length >= u) {
          return t.substr(0, u);
        }
        while (u > t.length && n > 1) {
          if (n & 1) {
            t += e;
          }
          n >>= 1;
          e += e;
        }
        t += e;
        t = t.substr(0, u);
        return t;
      }
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(323).fromCallback;
      const u = r(326);
      e.exports = { remove: n(u), removeSync: u.sync };
    },
    ,
    ,
    ,
    ,
    ,
    function(e, t, r) {
      const { URL: n } = r(835);
      const { join: u } = r(622);
      const i = r(747);
      const { promisify: o } = r(669);
      const { tmpdir: a } = r(87);
      const s = r(523);
      const c = o(i.writeFile);
      const f = o(i.mkdir);
      const l = o(i.readFile);
      const p = (e, t) => e.localeCompare(t, 'en-US', { numeric: true });
      const h = e => encodeURIComponent(e).replace(/^%40/, '@');
      const d = async (e, t) => {
        const r = a();
        const n = u(r, 'update-check');
        if (!i.existsSync(n)) {
          await f(n);
        }
        let o = `${e.name}-${t}.json`;
        if (e.scope) {
          o = `${e.scope}-${o}`;
        }
        return u(n, o);
      };
      const y = async (e, t, r) => {
        if (i.existsSync(e)) {
          const n = await l(e, 'utf8');
          const { lastUpdate: u, latest: i } = JSON.parse(n);
          const o = u + r;
          if (o > t) {
            return { shouldCheck: false, latest: i };
          }
        }
        return { shouldCheck: true, latest: null };
      };
      const v = async (e, t, r) => {
        const n = JSON.stringify({ latest: t, lastUpdate: r });
        await c(e, n, 'utf8');
      };
      const D = (e, t) =>
        new Promise((n, u) => {
          const i = {
            host: e.hostname,
            path: e.pathname,
            port: e.port,
            headers: {
              accept: 'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*',
            },
            timeout: 2e3,
          };
          if (t) {
            i.headers.authorization = `${t.type} ${t.token}`;
          }
          const { get: o } = r(e.protocol === 'https:' ? 34 : 944);
          o(i, e => {
            const { statusCode: t } = e;
            if (t !== 200) {
              const r = new Error(`Request failed with code ${t}`);
              r.code = t;
              u(r);
              e.resume();
              return;
            }
            let r = '';
            e.setEncoding('utf8');
            e.on('data', e => {
              r += e;
            });
            e.on('end', () => {
              try {
                const e = JSON.parse(r);
                n(e);
              } catch (e) {
                u(e);
              }
            });
          })
            .on('error', u)
            .on('timeout', u);
        });
      const m = async ({ full: e, scope: t }, u) => {
        const i = s(t);
        const o = new n(e, i);
        let a = null;
        try {
          a = await D(o);
        } catch (e) {
          if (e.code && String(e.code).startsWith(4)) {
            const e = r(685);
            const t = e(i, { recursive: true });
            a = await D(o, t);
          } else {
            throw e;
          }
        }
        const c = a['dist-tags'][u];
        if (!c) {
          throw new Error(`Distribution tag ${u} is not available`);
        }
        return c;
      };
      const A = { interval: 36e5, distTag: 'latest' };
      const g = e => {
        const t = { full: h(e) };
        if (e.includes('/')) {
          const r = e.split('/');
          t.scope = r[0];
          t.name = r[1];
        } else {
          t.scope = null;
          t.name = e;
        }
        return t;
      };
      e.exports = async (e, t) => {
        if (typeof e !== 'object') {
          throw new Error('The first parameter should be your package.json file content');
        }
        const r = g(e.name);
        const n = Date.now();
        const { distTag: u, interval: i } = Object.assign({}, A, t);
        const o = await d(r, u);
        let a = null;
        let s = true;
        ({ shouldCheck: s, latest: a } = await y(o, n, i));
        if (s) {
          a = await m(r, u);
          await v(o, a, n);
        }
        const c = p(e.version, a);
        if (c === -1) {
          return { latest: a, fromCache: !s };
        }
        return null;
      };
    },
    ,
    ,
    ,
    function(e) {
      e.exports = require('crypto');
    },
    ,
    function(e, t, r) {
      'use strict';
      var n = r(755);
      e.exports = function isExtendable(e) {
        return n(e) || typeof e === 'function' || Array.isArray(e);
      };
    },
    ,
    ,
    ,
    ,
    function(e, t, r) {
      var n = r(622);
      var u = process.platform === 'win32';
      var i = r(747);
      var o = process.env.NODE_DEBUG && /fs/.test(process.env.NODE_DEBUG);
      function rethrow() {
        var e;
        if (o) {
          var t = new Error();
          e = debugCallback;
        } else e = missingCallback;
        return e;
        function debugCallback(e) {
          if (e) {
            t.message = e.message;
            e = t;
            missingCallback(e);
          }
        }
        function missingCallback(e) {
          if (e) {
            if (process.throwDeprecation) throw e;
            else if (!process.noDeprecation) {
              var t = 'fs: missing callback ' + (e.stack || e.message);
              if (process.traceDeprecation) console.trace(t);
              else console.error(t);
            }
          }
        }
      }
      function maybeCallback(e) {
        return typeof e === 'function' ? e : rethrow();
      }
      var a = n.normalize;
      if (u) {
        var s = /(.*?)(?:[\/\\]+|$)/g;
      } else {
        var s = /(.*?)(?:[\/]+|$)/g;
      }
      if (u) {
        var c = /^(?:[a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/][^\\\/]+)?[\\\/]*/;
      } else {
        var c = /^[\/]*/;
      }
      t.realpathSync = function realpathSync(e, t) {
        e = n.resolve(e);
        if (t && Object.prototype.hasOwnProperty.call(t, e)) {
          return t[e];
        }
        var r = e,
          o = {},
          a = {};
        var f;
        var l;
        var p;
        var h;
        start();
        function start() {
          var t = c.exec(e);
          f = t[0].length;
          l = t[0];
          p = t[0];
          h = '';
          if (u && !a[p]) {
            i.lstatSync(p);
            a[p] = true;
          }
        }
        while (f < e.length) {
          s.lastIndex = f;
          var d = s.exec(e);
          h = l;
          l += d[0];
          p = h + d[1];
          f = s.lastIndex;
          if (a[p] || (t && t[p] === p)) {
            continue;
          }
          var y;
          if (t && Object.prototype.hasOwnProperty.call(t, p)) {
            y = t[p];
          } else {
            var v = i.lstatSync(p);
            if (!v.isSymbolicLink()) {
              a[p] = true;
              if (t) t[p] = p;
              continue;
            }
            var D = null;
            if (!u) {
              var m = v.dev.toString(32) + ':' + v.ino.toString(32);
              if (o.hasOwnProperty(m)) {
                D = o[m];
              }
            }
            if (D === null) {
              i.statSync(p);
              D = i.readlinkSync(p);
            }
            y = n.resolve(h, D);
            if (t) t[p] = y;
            if (!u) o[m] = D;
          }
          e = n.resolve(y, e.slice(f));
          start();
        }
        if (t) t[r] = e;
        return e;
      };
      t.realpath = function realpath(e, t, r) {
        if (typeof r !== 'function') {
          r = maybeCallback(t);
          t = null;
        }
        e = n.resolve(e);
        if (t && Object.prototype.hasOwnProperty.call(t, e)) {
          return process.nextTick(r.bind(null, null, t[e]));
        }
        var o = e,
          a = {},
          f = {};
        var l;
        var p;
        var h;
        var d;
        start();
        function start() {
          var t = c.exec(e);
          l = t[0].length;
          p = t[0];
          h = t[0];
          d = '';
          if (u && !f[h]) {
            i.lstat(h, function(e) {
              if (e) return r(e);
              f[h] = true;
              LOOP();
            });
          } else {
            process.nextTick(LOOP);
          }
        }
        function LOOP() {
          if (l >= e.length) {
            if (t) t[o] = e;
            return r(null, e);
          }
          s.lastIndex = l;
          var n = s.exec(e);
          d = p;
          p += n[0];
          h = d + n[1];
          l = s.lastIndex;
          if (f[h] || (t && t[h] === h)) {
            return process.nextTick(LOOP);
          }
          if (t && Object.prototype.hasOwnProperty.call(t, h)) {
            return gotResolvedLink(t[h]);
          }
          return i.lstat(h, gotStat);
        }
        function gotStat(e, n) {
          if (e) return r(e);
          if (!n.isSymbolicLink()) {
            f[h] = true;
            if (t) t[h] = h;
            return process.nextTick(LOOP);
          }
          if (!u) {
            var o = n.dev.toString(32) + ':' + n.ino.toString(32);
            if (a.hasOwnProperty(o)) {
              return gotTarget(null, a[o], h);
            }
          }
          i.stat(h, function(e) {
            if (e) return r(e);
            i.readlink(h, function(e, t) {
              if (!u) a[o] = t;
              gotTarget(e, t);
            });
          });
        }
        function gotTarget(e, u, i) {
          if (e) return r(e);
          var o = n.resolve(d, u);
          if (t) t[i] = o;
          gotResolvedLink(o);
        }
        function gotResolvedLink(t) {
          e = n.resolve(t, e.slice(l));
          start();
        }
      };
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n = r(765);
      var u = r(76);
      var i = r(785);
      function copy(e, t, r) {
        if (!isObject(e)) {
          throw new TypeError('expected receiving object to be an object.');
        }
        if (!isObject(t)) {
          throw new TypeError('expected providing object to be an object.');
        }
        var n = nativeKeys(t);
        var o = Object.keys(t);
        var a = n.length;
        r = arrayify(r);
        while (a--) {
          var s = n[a];
          if (has(o, s)) {
            i(e, s, t[s]);
          } else if (!(s in e) && !has(r, s)) {
            u(e, t, s);
          }
        }
      }
      function isObject(e) {
        return n(e) === 'object' || typeof e === 'function';
      }
      function has(e, t) {
        t = arrayify(t);
        var r = t.length;
        if (isObject(e)) {
          for (var n in e) {
            if (t.indexOf(n) > -1) {
              return true;
            }
          }
          var u = nativeKeys(e);
          return has(u, t);
        }
        if (Array.isArray(e)) {
          var i = e;
          while (r--) {
            if (i.indexOf(t[r]) > -1) {
              return true;
            }
          }
          return false;
        }
        throw new TypeError('expected an array or object.');
      }
      function arrayify(e) {
        return e ? (Array.isArray(e) ? e : [e]) : [];
      }
      function hasConstructor(e) {
        return isObject(e) && typeof e.constructor !== 'undefined';
      }
      function nativeKeys(e) {
        if (!hasConstructor(e)) return [];
        return Object.getOwnPropertyNames(e);
      }
      e.exports = copy;
      e.exports.has = has;
    },
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    function(e) {
      'use strict';
      const t = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
      const r = (e, t) => {
        let r = e;
        if (typeof t === 'string') {
          r = e.toLocaleString(t);
        } else if (t === true) {
          r = e.toLocaleString();
        }
        return r;
      };
      e.exports = (e, n) => {
        if (!Number.isFinite(e)) {
          throw new TypeError(`Expected a finite number, got ${typeof e}: ${e}`);
        }
        n = Object.assign({}, n);
        if (n.signed && e === 0) {
          return ' 0 B';
        }
        const u = e < 0;
        const i = u ? '-' : n.signed ? '+' : '';
        if (u) {
          e = -e;
        }
        if (e < 1) {
          const t = r(e, n.locale);
          return i + t + ' B';
        }
        const o = Math.min(Math.floor(Math.log10(e) / 3), t.length - 1);
        e = Number((e / Math.pow(1e3, o)).toPrecision(3));
        const a = r(e, n.locale);
        const s = t[o];
        return i + a + ' ' + s;
      };
    },
    function(e, t, r) {
      'use strict';
      e.exports = writeFile;
      e.exports.sync = writeFileSync;
      e.exports._getTmpname = getTmpname;
      e.exports._cleanupOnExit = cleanupOnExit;
      var n = r(729);
      var u = r(970);
      var i = r(145);
      var o = r(622);
      var a = {};
      var s = (function getId() {
        try {
          var e = r(39);
          return e.threadId;
        } catch (e) {
          return 0;
        }
      })();
      var c = 0;
      function getTmpname(e) {
        return (
          e +
          '.' +
          u(__filename)
            .hash(String(process.pid))
            .hash(String(s))
            .hash(String(++c))
            .result()
        );
      }
      function cleanupOnExit(e) {
        return function() {
          try {
            n.unlinkSync(typeof e === 'function' ? e() : e);
          } catch (e) {}
        };
      }
      function writeFile(e, t, r, u) {
        if (r) {
          if (r instanceof Function) {
            u = r;
            r = {};
          } else if (typeof r === 'string') {
            r = { encoding: r };
          }
        } else {
          r = {};
        }
        var s = r.Promise || global.Promise;
        var c;
        var f;
        var l;
        var p = i(cleanupOnExit(() => l));
        var h = o.resolve(e);
        new s(function serializeSameFile(e) {
          if (!a[h]) a[h] = [];
          a[h].push(e);
          if (a[h].length === 1) e();
        })
          .then(function getRealPath() {
            return new s(function(t) {
              n.realpath(e, function(r, n) {
                c = n || e;
                l = getTmpname(c);
                t();
              });
            });
          })
          .then(function stat() {
            return new s(function stat(e) {
              if (r.mode && r.chown) e();
              else {
                n.stat(c, function(t, n) {
                  if (t || !n) e();
                  else {
                    r = Object.assign({}, r);
                    if (r.mode == null) {
                      r.mode = n.mode;
                    }
                    if (r.chown == null && process.getuid) {
                      r.chown = { uid: n.uid, gid: n.gid };
                    }
                    e();
                  }
                });
              }
            });
          })
          .then(function thenWriteFile() {
            return new s(function(e, t) {
              n.open(l, 'w', r.mode, function(r, n) {
                f = n;
                if (r) t(r);
                else e();
              });
            });
          })
          .then(function write() {
            return new s(function(e, u) {
              if (Buffer.isBuffer(t)) {
                n.write(f, t, 0, t.length, 0, function(t) {
                  if (t) u(t);
                  else e();
                });
              } else if (t != null) {
                n.write(f, String(t), 0, String(r.encoding || 'utf8'), function(t) {
                  if (t) u(t);
                  else e();
                });
              } else e();
            });
          })
          .then(function syncAndClose() {
            return new s(function(e, t) {
              if (r.fsync !== false) {
                n.fsync(f, function(r) {
                  if (r) n.close(f, () => t(r));
                  else n.close(f, e);
                });
              } else {
                n.close(f, e);
              }
            });
          })
          .then(function chown() {
            f = null;
            if (r.chown) {
              return new s(function(e, t) {
                n.chown(l, r.chown.uid, r.chown.gid, function(r) {
                  if (r) t(r);
                  else e();
                });
              });
            }
          })
          .then(function chmod() {
            if (r.mode) {
              return new s(function(e, t) {
                n.chmod(l, r.mode, function(r) {
                  if (r) t(r);
                  else e();
                });
              });
            }
          })
          .then(function rename() {
            return new s(function(e, t) {
              n.rename(l, c, function(r) {
                if (r) t(r);
                else e();
              });
            });
          })
          .then(
            function success() {
              p();
              u();
            },
            function fail(e) {
              return new s(e => {
                return f ? n.close(f, e) : e();
              }).then(() => {
                p();
                n.unlink(l, function() {
                  u(e);
                });
              });
            }
          )
          .then(function checkQueue() {
            a[h].shift();
            if (a[h].length > 0) {
              a[h][0]();
            } else delete a[h];
          });
      }
      function writeFileSync(e, t, r) {
        if (typeof r === 'string') r = { encoding: r };
        else if (!r) r = {};
        try {
          e = n.realpathSync(e);
        } catch (e) {}
        var u = getTmpname(e);
        if (!r.mode || !r.chown) {
          try {
            var o = n.statSync(e);
            r = Object.assign({}, r);
            if (!r.mode) {
              r.mode = o.mode;
            }
            if (!r.chown && process.getuid) {
              r.chown = { uid: o.uid, gid: o.gid };
            }
          } catch (e) {}
        }
        var a;
        var s = cleanupOnExit(u);
        var c = i(s);
        try {
          a = n.openSync(u, 'w', r.mode);
          if (Buffer.isBuffer(t)) {
            n.writeSync(a, t, 0, t.length, 0);
          } else if (t != null) {
            n.writeSync(a, String(t), 0, String(r.encoding || 'utf8'));
          }
          if (r.fsync !== false) {
            n.fsyncSync(a);
          }
          n.closeSync(a);
          if (r.chown) n.chownSync(u, r.chown.uid, r.chown.gid);
          if (r.mode) n.chmodSync(u, r.mode);
          n.renameSync(u, e);
          c();
        } catch (e) {
          if (a) n.closeSync(a);
          c();
          s();
          throw e;
        }
      }
    },
    function(e, t, r) {
      var n = r(404);
      var u = 5;
      var i = 1 << u;
      var o = i - 1;
      var a = i;
      function toVLQSigned(e) {
        return e < 0 ? (-e << 1) + 1 : (e << 1) + 0;
      }
      function fromVLQSigned(e) {
        var t = (e & 1) === 1;
        var r = e >> 1;
        return t ? -r : r;
      }
      t.encode = function base64VLQ_encode(e) {
        var t = '';
        var r;
        var i = toVLQSigned(e);
        do {
          r = i & o;
          i >>>= u;
          if (i > 0) {
            r |= a;
          }
          t += n.encode(r);
        } while (i > 0);
        return t;
      };
      t.decode = function base64VLQ_decode(e, t, r) {
        var i = e.length;
        var s = 0;
        var c = 0;
        var f, l;
        do {
          if (t >= i) {
            throw new Error('Expected more digits in base 64 VLQ value.');
          }
          l = n.decode(e.charCodeAt(t++));
          if (l === -1) {
            throw new Error('Invalid base64 digit: ' + e.charAt(t - 1));
          }
          f = !!(l & a);
          l &= o;
          s = s + (l << c);
          c += u;
        } while (f);
        r.value = fromVLQSigned(s);
        r.rest = t;
      };
    },
    function(e, t, r) {
      var n = r(107);
      function listCacheHas(e) {
        return n(this.__data__, e) > -1;
      }
      e.exports = listCacheHas;
    },
    ,
    function(e, t, r) {
      'use strict';
      const n = r(323).fromCallback;
      const u = r(729);
      const i = r(622);
      const o = r(467);
      const a = r(780).pathExists;
      function outputFile(e, t, r, n) {
        if (typeof r === 'function') {
          n = r;
          r = 'utf8';
        }
        const s = i.dirname(e);
        a(s, (i, a) => {
          if (i) return n(i);
          if (a) return u.writeFile(e, t, r, n);
          o.mkdirs(s, i => {
            if (i) return n(i);
            u.writeFile(e, t, r, n);
          });
        });
      }
      function outputFileSync(e, ...t) {
        const r = i.dirname(e);
        if (u.existsSync(r)) {
          return u.writeFileSync(e, ...t);
        }
        o.mkdirsSync(r);
        u.writeFileSync(e, ...t);
      }
      e.exports = { outputFile: n(outputFile), outputFileSync: outputFileSync };
    },
    ,
    ,
    ,
    ,
    function(e, t) {
      var r = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');
      t.encode = function(e) {
        if (0 <= e && e < r.length) {
          return r[e];
        }
        throw new TypeError('Must be between 0 and 63: ' + e);
      };
      t.decode = function(e) {
        var t = 65;
        var r = 90;
        var n = 97;
        var u = 122;
        var i = 48;
        var o = 57;
        var a = 43;
        var s = 47;
        var c = 26;
        var f = 52;
        if (t <= e && e <= r) {
          return e - t;
        }
        if (n <= e && e <= u) {
          return e - n + c;
        }
        if (i <= e && e <= o) {
          return e - i + f;
        }
        if (e == a) {
          return 62;
        }
        if (e == s) {
          return 63;
        }
        return -1;
      };
    },
    function(e, t, r) {
      var n = r(622);
      ('use strict');
      function urix(e) {
        if (n.sep === '\\') {
          return e.replace(/\\/g, '/').replace(/^[a-z]:\/?/i, '/');
        }
        return e;
      }
      e.exports = urix;
    },
    function(e, t, r) {
      'use strict';
      var n = r(248);
      var u = r(14);
      e.exports =
        Object.assign ||
        function(e) {
          if (e === null || typeof e === 'undefined') {
            throw new TypeError('Cannot convert undefined or null to object');
          }
          if (!isObject(e)) {
            e = {};
          }
          for (var t = 1; t < arguments.length; t++) {
            var r = arguments[t];
            if (isString(r)) {
              r = toObject(r);
            }
            if (isObject(r)) {
              assign(e, r);
              u(e, r);
            }
          }
          return e;
        };
      function assign(e, t) {
        for (var r in t) {
          if (hasOwn(t, r)) {
            e[r] = t[r];
          }
        }
      }
      function isString(e) {
        return e && typeof e === 'string';
      }
      function toObject(e) {
        var t = {};
        for (var r in e) {
          t[r] = e[r];
        }
        return t;
      }
      function isObject(e) {
        return (e && typeof e === 'object') || n(e);
      }
      function hasOwn(e, t) {
        return Object.prototype.hasOwnProperty.call(e, t);
      }
      function isEnum(e, t) {
        return Object.prototype.propertyIsEnumerable.call(e, t);
      }
    },
    function(e) {
      e.exports = require('buffer');
    },
    ,
    function(e, t, r) {
      'use strict';
      const n = r(323).fromCallback;
      const u = r(747);
      const i = r(622);
      const o = r(983);
      const a = r(363);
      const s = n(function emptyDir(e, t) {
        t = t || function() {};
        u.readdir(e, (r, n) => {
          if (r) return o.mkdirs(e, t);
          n = n.map(t => i.join(e, t));
          deleteItem();
          function deleteItem() {
            const e = n.pop();
            if (!e) return t();
            a.remove(e, e => {
              if (e) return t(e);
              deleteItem();
            });
          }
        });
      });
      function emptyDirSync(e) {
        let t;
        try {
          t = u.readdirSync(e);
        } catch (t) {
          return o.mkdirsSync(e);
        }
        t.forEach(t => {
          t = i.join(e, t);
          a.removeSync(t);
        });
      }
      e.exports = {
        emptyDirSync: emptyDirSync,
        emptydirSync: emptyDirSync,
        emptyDir: s,
        emptydir: s,
      };
    },
    function(e, t, r) {
      var n = r(48);
      var u = Object.prototype;
      var i = u.hasOwnProperty;
      var o = u.toString;
      var a = n ? n.toStringTag : undefined;
      function getRawTag(e) {
        var t = i.call(e, a),
          r = e[a];
        try {
          e[a] = undefined;
          var n = true;
        } catch (e) {}
        var u = o.call(e);
        if (n) {
          if (t) {
            e[a] = r;
          } else {
            delete e[a];
          }
        }
        return u;
      }
      e.exports = getRawTag;
    },
    function(e, t, r) {
      var n = r(702);
      var u = r(471);
      var i = r(991).ArraySet;
      var o = r(396);
      var a = r(707).quickSort;
      function SourceMapConsumer(e) {
        var t = e;
        if (typeof e === 'string') {
          t = JSON.parse(e.replace(/^\)\]\}'/, ''));
        }
        return t.sections != null ? new IndexedSourceMapConsumer(t) : new BasicSourceMapConsumer(t);
      }
      SourceMapConsumer.fromSourceMap = function(e) {
        return BasicSourceMapConsumer.fromSourceMap(e);
      };
      SourceMapConsumer.prototype._version = 3;
      SourceMapConsumer.prototype.__generatedMappings = null;
      Object.defineProperty(SourceMapConsumer.prototype, '_generatedMappings', {
        get: function() {
          if (!this.__generatedMappings) {
            this._parseMappings(this._mappings, this.sourceRoot);
          }
          return this.__generatedMappings;
        },
      });
      SourceMapConsumer.prototype.__originalMappings = null;
      Object.defineProperty(SourceMapConsumer.prototype, '_originalMappings', {
        get: function() {
          if (!this.__originalMappings) {
            this._parseMappings(this._mappings, this.sourceRoot);
          }
          return this.__originalMappings;
        },
      });
      SourceMapConsumer.prototype._charIsMappingSeparator = function SourceMapConsumer_charIsMappingSeparator(
        e,
        t
      ) {
        var r = e.charAt(t);
        return r === ';' || r === ',';
      };
      SourceMapConsumer.prototype._parseMappings = function SourceMapConsumer_parseMappings(e, t) {
        throw new Error('Subclasses must implement _parseMappings');
      };
      SourceMapConsumer.GENERATED_ORDER = 1;
      SourceMapConsumer.ORIGINAL_ORDER = 2;
      SourceMapConsumer.GREATEST_LOWER_BOUND = 1;
      SourceMapConsumer.LEAST_UPPER_BOUND = 2;
      SourceMapConsumer.prototype.eachMapping = function SourceMapConsumer_eachMapping(e, t, r) {
        var u = t || null;
        var i = r || SourceMapConsumer.GENERATED_ORDER;
        var o;
        switch (i) {
          case SourceMapConsumer.GENERATED_ORDER:
            o = this._generatedMappings;
            break;
          case SourceMapConsumer.ORIGINAL_ORDER:
            o = this._originalMappings;
            break;
          default:
            throw new Error('Unknown order of iteration.');
        }
        var a = this.sourceRoot;
        o
          .map(function(e) {
            var t = e.source === null ? null : this._sources.at(e.source);
            if (t != null && a != null) {
              t = n.join(a, t);
            }
            return {
              source: t,
              generatedLine: e.generatedLine,
              generatedColumn: e.generatedColumn,
              originalLine: e.originalLine,
              originalColumn: e.originalColumn,
              name: e.name === null ? null : this._names.at(e.name),
            };
          }, this)
          .forEach(e, u);
      };
      SourceMapConsumer.prototype.allGeneratedPositionsFor = function SourceMapConsumer_allGeneratedPositionsFor(
        e
      ) {
        var t = n.getArg(e, 'line');
        var r = {
          source: n.getArg(e, 'source'),
          originalLine: t,
          originalColumn: n.getArg(e, 'column', 0),
        };
        if (this.sourceRoot != null) {
          r.source = n.relative(this.sourceRoot, r.source);
        }
        if (!this._sources.has(r.source)) {
          return [];
        }
        r.source = this._sources.indexOf(r.source);
        var i = [];
        var o = this._findMapping(
          r,
          this._originalMappings,
          'originalLine',
          'originalColumn',
          n.compareByOriginalPositions,
          u.LEAST_UPPER_BOUND
        );
        if (o >= 0) {
          var a = this._originalMappings[o];
          if (e.column === undefined) {
            var s = a.originalLine;
            while (a && a.originalLine === s) {
              i.push({
                line: n.getArg(a, 'generatedLine', null),
                column: n.getArg(a, 'generatedColumn', null),
                lastColumn: n.getArg(a, 'lastGeneratedColumn', null),
              });
              a = this._originalMappings[++o];
            }
          } else {
            var c = a.originalColumn;
            while (a && a.originalLine === t && a.originalColumn == c) {
              i.push({
                line: n.getArg(a, 'generatedLine', null),
                column: n.getArg(a, 'generatedColumn', null),
                lastColumn: n.getArg(a, 'lastGeneratedColumn', null),
              });
              a = this._originalMappings[++o];
            }
          }
        }
        return i;
      };
      t.SourceMapConsumer = SourceMapConsumer;
      function BasicSourceMapConsumer(e) {
        var t = e;
        if (typeof e === 'string') {
          t = JSON.parse(e.replace(/^\)\]\}'/, ''));
        }
        var r = n.getArg(t, 'version');
        var u = n.getArg(t, 'sources');
        var o = n.getArg(t, 'names', []);
        var a = n.getArg(t, 'sourceRoot', null);
        var s = n.getArg(t, 'sourcesContent', null);
        var c = n.getArg(t, 'mappings');
        var f = n.getArg(t, 'file', null);
        if (r != this._version) {
          throw new Error('Unsupported version: ' + r);
        }
        u = u
          .map(String)
          .map(n.normalize)
          .map(function(e) {
            return a && n.isAbsolute(a) && n.isAbsolute(e) ? n.relative(a, e) : e;
          });
        this._names = i.fromArray(o.map(String), true);
        this._sources = i.fromArray(u, true);
        this.sourceRoot = a;
        this.sourcesContent = s;
        this._mappings = c;
        this.file = f;
      }
      BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
      BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer;
      BasicSourceMapConsumer.fromSourceMap = function SourceMapConsumer_fromSourceMap(e) {
        var t = Object.create(BasicSourceMapConsumer.prototype);
        var r = (t._names = i.fromArray(e._names.toArray(), true));
        var u = (t._sources = i.fromArray(e._sources.toArray(), true));
        t.sourceRoot = e._sourceRoot;
        t.sourcesContent = e._generateSourcesContent(t._sources.toArray(), t.sourceRoot);
        t.file = e._file;
        var o = e._mappings.toArray().slice();
        var s = (t.__generatedMappings = []);
        var c = (t.__originalMappings = []);
        for (var f = 0, l = o.length; f < l; f++) {
          var p = o[f];
          var h = new Mapping();
          h.generatedLine = p.generatedLine;
          h.generatedColumn = p.generatedColumn;
          if (p.source) {
            h.source = u.indexOf(p.source);
            h.originalLine = p.originalLine;
            h.originalColumn = p.originalColumn;
            if (p.name) {
              h.name = r.indexOf(p.name);
            }
            c.push(h);
          }
          s.push(h);
        }
        a(t.__originalMappings, n.compareByOriginalPositions);
        return t;
      };
      BasicSourceMapConsumer.prototype._version = 3;
      Object.defineProperty(BasicSourceMapConsumer.prototype, 'sources', {
        get: function() {
          return this._sources.toArray().map(function(e) {
            return this.sourceRoot != null ? n.join(this.sourceRoot, e) : e;
          }, this);
        },
      });
      function Mapping() {
        this.generatedLine = 0;
        this.generatedColumn = 0;
        this.source = null;
        this.originalLine = null;
        this.originalColumn = null;
        this.name = null;
      }
      BasicSourceMapConsumer.prototype._parseMappings = function SourceMapConsumer_parseMappings(
        e,
        t
      ) {
        var r = 1;
        var u = 0;
        var i = 0;
        var s = 0;
        var c = 0;
        var f = 0;
        var l = e.length;
        var p = 0;
        var h = {};
        var d = {};
        var y = [];
        var v = [];
        var D, m, A, g, E;
        while (p < l) {
          if (e.charAt(p) === ';') {
            r++;
            p++;
            u = 0;
          } else if (e.charAt(p) === ',') {
            p++;
          } else {
            D = new Mapping();
            D.generatedLine = r;
            for (g = p; g < l; g++) {
              if (this._charIsMappingSeparator(e, g)) {
                break;
              }
            }
            m = e.slice(p, g);
            A = h[m];
            if (A) {
              p += m.length;
            } else {
              A = [];
              while (p < g) {
                o.decode(e, p, d);
                E = d.value;
                p = d.rest;
                A.push(E);
              }
              if (A.length === 2) {
                throw new Error('Found a source, but no line and column');
              }
              if (A.length === 3) {
                throw new Error('Found a source and line, but no column');
              }
              h[m] = A;
            }
            D.generatedColumn = u + A[0];
            u = D.generatedColumn;
            if (A.length > 1) {
              D.source = c + A[1];
              c += A[1];
              D.originalLine = i + A[2];
              i = D.originalLine;
              D.originalLine += 1;
              D.originalColumn = s + A[3];
              s = D.originalColumn;
              if (A.length > 4) {
                D.name = f + A[4];
                f += A[4];
              }
            }
            v.push(D);
            if (typeof D.originalLine === 'number') {
              y.push(D);
            }
          }
        }
        a(v, n.compareByGeneratedPositionsDeflated);
        this.__generatedMappings = v;
        a(y, n.compareByOriginalPositions);
        this.__originalMappings = y;
      };
      BasicSourceMapConsumer.prototype._findMapping = function SourceMapConsumer_findMapping(
        e,
        t,
        r,
        n,
        i,
        o
      ) {
        if (e[r] <= 0) {
          throw new TypeError('Line must be greater than or equal to 1, got ' + e[r]);
        }
        if (e[n] < 0) {
          throw new TypeError('Column must be greater than or equal to 0, got ' + e[n]);
        }
        return u.search(e, t, i, o);
      };
      BasicSourceMapConsumer.prototype.computeColumnSpans = function SourceMapConsumer_computeColumnSpans() {
        for (var e = 0; e < this._generatedMappings.length; ++e) {
          var t = this._generatedMappings[e];
          if (e + 1 < this._generatedMappings.length) {
            var r = this._generatedMappings[e + 1];
            if (t.generatedLine === r.generatedLine) {
              t.lastGeneratedColumn = r.generatedColumn - 1;
              continue;
            }
          }
          t.lastGeneratedColumn = Infinity;
        }
      };
      BasicSourceMapConsumer.prototype.originalPositionFor = function SourceMapConsumer_originalPositionFor(
        e
      ) {
        var t = { generatedLine: n.getArg(e, 'line'), generatedColumn: n.getArg(e, 'column') };
        var r = this._findMapping(
          t,
          this._generatedMappings,
          'generatedLine',
          'generatedColumn',
          n.compareByGeneratedPositionsDeflated,
          n.getArg(e, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
        );
        if (r >= 0) {
          var u = this._generatedMappings[r];
          if (u.generatedLine === t.generatedLine) {
            var i = n.getArg(u, 'source', null);
            if (i !== null) {
              i = this._sources.at(i);
              if (this.sourceRoot != null) {
                i = n.join(this.sourceRoot, i);
              }
            }
            var o = n.getArg(u, 'name', null);
            if (o !== null) {
              o = this._names.at(o);
            }
            return {
              source: i,
              line: n.getArg(u, 'originalLine', null),
              column: n.getArg(u, 'originalColumn', null),
              name: o,
            };
          }
        }
        return { source: null, line: null, column: null, name: null };
      };
      BasicSourceMapConsumer.prototype.hasContentsOfAllSources = function BasicSourceMapConsumer_hasContentsOfAllSources() {
        if (!this.sourcesContent) {
          return false;
        }
        return (
          this.sourcesContent.length >= this._sources.size() &&
          !this.sourcesContent.some(function(e) {
            return e == null;
          })
        );
      };
      BasicSourceMapConsumer.prototype.sourceContentFor = function SourceMapConsumer_sourceContentFor(
        e,
        t
      ) {
        if (!this.sourcesContent) {
          return null;
        }
        if (this.sourceRoot != null) {
          e = n.relative(this.sourceRoot, e);
        }
        if (this._sources.has(e)) {
          return this.sourcesContent[this._sources.indexOf(e)];
        }
        var r;
        if (this.sourceRoot != null && (r = n.urlParse(this.sourceRoot))) {
          var u = e.replace(/^file:\/\//, '');
          if (r.scheme == 'file' && this._sources.has(u)) {
            return this.sourcesContent[this._sources.indexOf(u)];
          }
          if ((!r.path || r.path == '/') && this._sources.has('/' + e)) {
            return this.sourcesContent[this._sources.indexOf('/' + e)];
          }
        }
        if (t) {
          return null;
        } else {
          throw new Error('"' + e + '" is not in the SourceMap.');
        }
      };
      BasicSourceMapConsumer.prototype.generatedPositionFor = function SourceMapConsumer_generatedPositionFor(
        e
      ) {
        var t = n.getArg(e, 'source');
        if (this.sourceRoot != null) {
          t = n.relative(this.sourceRoot, t);
        }
        if (!this._sources.has(t)) {
          return { line: null, column: null, lastColumn: null };
        }
        t = this._sources.indexOf(t);
        var r = {
          source: t,
          originalLine: n.getArg(e, 'line'),
          originalColumn: n.getArg(e, 'column'),
        };
        var u = this._findMapping(
          r,
          this._originalMappings,
          'originalLine',
          'originalColumn',
          n.compareByOriginalPositions,
          n.getArg(e, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
        );
        if (u >= 0) {
          var i = this._originalMappings[u];
          if (i.source === r.source) {
            return {
              line: n.getArg(i, 'generatedLine', null),
              column: n.getArg(i, 'generatedColumn', null),
              lastColumn: n.getArg(i, 'lastGeneratedColumn', null),
            };
          }
        }
        return { line: null, column: null, lastColumn: null };
      };
      t.BasicSourceMapConsumer = BasicSourceMapConsumer;
      function IndexedSourceMapConsumer(e) {
        var t = e;
        if (typeof e === 'string') {
          t = JSON.parse(e.replace(/^\)\]\}'/, ''));
        }
        var r = n.getArg(t, 'version');
        var u = n.getArg(t, 'sections');
        if (r != this._version) {
          throw new Error('Unsupported version: ' + r);
        }
        this._sources = new i();
        this._names = new i();
        var o = { line: -1, column: 0 };
        this._sections = u.map(function(e) {
          if (e.url) {
            throw new Error('Support for url field in sections not implemented.');
          }
          var t = n.getArg(e, 'offset');
          var r = n.getArg(t, 'line');
          var u = n.getArg(t, 'column');
          if (r < o.line || (r === o.line && u < o.column)) {
            throw new Error('Section offsets must be ordered and non-overlapping.');
          }
          o = t;
          return {
            generatedOffset: { generatedLine: r + 1, generatedColumn: u + 1 },
            consumer: new SourceMapConsumer(n.getArg(e, 'map')),
          };
        });
      }
      IndexedSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
      IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer;
      IndexedSourceMapConsumer.prototype._version = 3;
      Object.defineProperty(IndexedSourceMapConsumer.prototype, 'sources', {
        get: function() {
          var e = [];
          for (var t = 0; t < this._sections.length; t++) {
            for (var r = 0; r < this._sections[t].consumer.sources.length; r++) {
              e.push(this._sections[t].consumer.sources[r]);
            }
          }
          return e;
        },
      });
      IndexedSourceMapConsumer.prototype.originalPositionFor = function IndexedSourceMapConsumer_originalPositionFor(
        e
      ) {
        var t = { generatedLine: n.getArg(e, 'line'), generatedColumn: n.getArg(e, 'column') };
        var r = u.search(t, this._sections, function(e, t) {
          var r = e.generatedLine - t.generatedOffset.generatedLine;
          if (r) {
            return r;
          }
          return e.generatedColumn - t.generatedOffset.generatedColumn;
        });
        var i = this._sections[r];
        if (!i) {
          return { source: null, line: null, column: null, name: null };
        }
        return i.consumer.originalPositionFor({
          line: t.generatedLine - (i.generatedOffset.generatedLine - 1),
          column:
            t.generatedColumn -
            (i.generatedOffset.generatedLine === t.generatedLine
              ? i.generatedOffset.generatedColumn - 1
              : 0),
          bias: e.bias,
        });
      };
      IndexedSourceMapConsumer.prototype.hasContentsOfAllSources = function IndexedSourceMapConsumer_hasContentsOfAllSources() {
        return this._sections.every(function(e) {
          return e.consumer.hasContentsOfAllSources();
        });
      };
      IndexedSourceMapConsumer.prototype.sourceContentFor = function IndexedSourceMapConsumer_sourceContentFor(
        e,
        t
      ) {
        for (var r = 0; r < this._sections.length; r++) {
          var n = this._sections[r];
          var u = n.consumer.sourceContentFor(e, true);
          if (u) {
            return u;
          }
        }
        if (t) {
          return null;
        } else {
          throw new Error('"' + e + '" is not in the SourceMap.');
        }
      };
      IndexedSourceMapConsumer.prototype.generatedPositionFor = function IndexedSourceMapConsumer_generatedPositionFor(
        e
      ) {
        for (var t = 0; t < this._sections.length; t++) {
          var r = this._sections[t];
          if (r.consumer.sources.indexOf(n.getArg(e, 'source')) === -1) {
            continue;
          }
          var u = r.consumer.generatedPositionFor(e);
          if (u) {
            var i = {
              line: u.line + (r.generatedOffset.generatedLine - 1),
              column:
                u.column +
                (r.generatedOffset.generatedLine === u.line
                  ? r.generatedOffset.generatedColumn - 1
                  : 0),
            };
            return i;
          }
        }
        return { line: null, column: null };
      };
      IndexedSourceMapConsumer.prototype._parseMappings = function IndexedSourceMapConsumer_parseMappings(
        e,
        t
      ) {
        this.__generatedMappings = [];
        this.__originalMappings = [];
        for (var r = 0; r < this._sections.length; r++) {
          var u = this._sections[r];
          var i = u.consumer._generatedMappings;
          for (var o = 0; o < i.length; o++) {
            var s = i[o];
            var c = u.consumer._sources.at(s.source);
            if (u.consumer.sourceRoot !== null) {
              c = n.join(u.consumer.sourceRoot, c);
            }
            this._sources.add(c);
            c = this._sources.indexOf(c);
            var f = u.consumer._names.at(s.name);
            this._names.add(f);
            f = this._names.indexOf(f);
            var l = {
              source: c,
              generatedLine: s.generatedLine + (u.generatedOffset.generatedLine - 1),
              generatedColumn:
                s.generatedColumn +
                (u.generatedOffset.generatedLine === s.generatedLine
                  ? u.generatedOffset.generatedColumn - 1
                  : 0),
              originalLine: s.originalLine,
              originalColumn: s.originalColumn,
              name: f,
            };
            this.__generatedMappings.push(l);
            if (typeof l.originalLine === 'number') {
              this.__originalMappings.push(l);
            }
          }
        }
        a(this.__generatedMappings, n.compareByGeneratedPositionsDeflated);
        a(this.__originalMappings, n.compareByOriginalPositions);
      };
      t.IndexedSourceMapConsumer = IndexedSourceMapConsumer;
    },
    function(e, t, r) {
      var n = r(677),
        u = r(623),
        i = r(473),
        o = r(199),
        a = r(854);
      function Hash(e) {
        var t = -1,
          r = e == null ? 0 : e.length;
        this.clear();
        while (++t < r) {
          var n = e[t];
          this.set(n[0], n[1]);
        }
      }
      Hash.prototype.clear = n;
      Hash.prototype['delete'] = u;
      Hash.prototype.get = i;
      Hash.prototype.has = o;
      Hash.prototype.set = a;
      e.exports = Hash;
    },
    function(e) {
      e.exports = require('stream');
    },
    function(e, t, r) {
      'use strict';
      var n = r(18);
      var u = r(548);
      var i = r(680);
      var o = r(36);
      e.exports = function unionValue(e, t, r) {
        if (!n(e)) {
          throw new TypeError('union-value expects the first argument to be an object.');
        }
        if (typeof t !== 'string') {
          throw new TypeError('union-value expects `prop` to be a string.');
        }
        var a = arrayify(i(e, t));
        o(e, t, u(a, arrayify(r)));
        return e;
      };
      function arrayify(e) {
        if (e === null || typeof e === 'undefined') {
          return [];
        }
        if (Array.isArray(e)) {
          return e;
        }
        return [e];
      }
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n = r(618);
      e.exports = function isDataDescriptor(e, t) {
        var r = { configurable: 'boolean', enumerable: 'boolean', writable: 'boolean' };
        if (n(e) !== 'object') {
          return false;
        }
        if (typeof t === 'string') {
          var u = Object.getOwnPropertyDescriptor(e, t);
          return typeof u !== 'undefined';
        }
        if (!('value' in e) && !('writable' in e)) {
          return false;
        }
        for (var i in e) {
          if (i === 'value') continue;
          if (!r.hasOwnProperty(i)) {
            continue;
          }
          if (n(e[i]) === r[i]) {
            continue;
          }
          if (typeof e[i] !== 'undefined') {
            return false;
          }
        }
        return true;
      };
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(323).fromCallback;
      const u = r(113);
      u.outputJson = n(r(586));
      u.outputJsonSync = r(736);
      u.outputJSON = u.outputJson;
      u.outputJSONSync = u.outputJsonSync;
      u.writeJSON = u.writeJson;
      u.writeJSONSync = u.writeJsonSync;
      u.readJSON = u.readJson;
      u.readJSONSync = u.readJsonSync;
      e.exports = u;
    },
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n = r(50);
      var u = r(581);
      var i = '(\\[(?=.*\\])|\\])+';
      var o = n.createRegex(i);
      function parsers(e) {
        e.state = e.state || {};
        e.parser.sets.bracket = e.parser.sets.bracket || [];
        e.parser
          .capture('escape', function() {
            if (this.isInside('bracket')) return;
            var e = this.position();
            var t = this.match(/^\\(.)/);
            if (!t) return;
            return e({ type: 'escape', val: t[0] });
          })
          .capture('text', function() {
            if (this.isInside('bracket')) return;
            var e = this.position();
            var t = this.match(o);
            if (!t || !t[0]) return;
            return e({ type: 'text', val: t[0] });
          })
          .capture('posix', function() {
            var t = this.position();
            var r = this.match(/^\[:(.*?):\](?=.*\])/);
            if (!r) return;
            var n = this.isInside('bracket');
            if (n) {
              e.posix++;
            }
            return t({ type: 'posix', insideBracket: n, inner: r[1], val: r[0] });
          })
          .capture('bracket', function() {})
          .capture('bracket.open', function() {
            var e = this.parsed;
            var t = this.position();
            var r = this.match(/^\[(?=.*\])/);
            if (!r) return;
            var i = this.prev();
            var o = n.last(i.nodes);
            if (e.slice(-1) === '\\' && !this.isInside('bracket')) {
              o.val = o.val.slice(0, o.val.length - 1);
              return t({ type: 'escape', val: r[0] });
            }
            var a = t({ type: 'bracket.open', val: r[0] });
            if (o.type === 'bracket.open' || this.isInside('bracket')) {
              a.val = '\\' + a.val;
              a.type = 'bracket.inner';
              a.escaped = true;
              return a;
            }
            var s = t({ type: 'bracket', nodes: [a] });
            u(s, 'parent', i);
            u(a, 'parent', s);
            this.push('bracket', s);
            i.nodes.push(s);
          })
          .capture('bracket.inner', function() {
            if (!this.isInside('bracket')) return;
            var e = this.position();
            var t = this.match(o);
            if (!t || !t[0]) return;
            var r = this.input.charAt(0);
            var n = t[0];
            var u = e({ type: 'bracket.inner', val: n });
            if (n === '\\\\') {
              return u;
            }
            var i = n.charAt(0);
            var a = n.slice(-1);
            if (i === '!') {
              n = '^' + n.slice(1);
            }
            if (a === '\\' || (n === '^' && r === ']')) {
              n += this.input[0];
              this.consume(1);
            }
            u.val = n;
            return u;
          })
          .capture('bracket.close', function() {
            var e = this.parsed;
            var t = this.position();
            var r = this.match(/^\]/);
            if (!r) return;
            var i = this.prev();
            var o = n.last(i.nodes);
            if (e.slice(-1) === '\\' && !this.isInside('bracket')) {
              o.val = o.val.slice(0, o.val.length - 1);
              return t({ type: 'escape', val: r[0] });
            }
            var a = t({ type: 'bracket.close', rest: this.input, val: r[0] });
            if (o.type === 'bracket.open') {
              a.type = 'bracket.inner';
              a.escaped = true;
              return a;
            }
            var s = this.pop('bracket');
            if (!this.isType(s, 'bracket')) {
              if (this.options.strict) {
                throw new Error('missing opening "["');
              }
              a.type = 'bracket.inner';
              a.escaped = true;
              return a;
            }
            s.nodes.push(a);
            u(a, 'parent', s);
          });
      }
      e.exports = parsers;
      e.exports.TEXT_REGEX = i;
    },
    function(e, t, r) {
      'use strict';
      const n = r(622);
      function getRootPath(e) {
        e = n.normalize(n.resolve(e)).split(n.sep);
        if (e.length > 0) return e[0];
        return null;
      }
      const u = /[<>:"|?*]/;
      function invalidWin32Path(e) {
        const t = getRootPath(e);
        e = e.replace(t, '');
        return u.test(e);
      }
      e.exports = { getRootPath: getRootPath, invalidWin32Path: invalidWin32Path };
    },
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    function(e, t, r) {
      e.exports = globSync;
      globSync.GlobSync = GlobSync;
      var n = r(747);
      var u = r(589);
      var i = r(904);
      var o = i.Minimatch;
      var a = r(649).Glob;
      var s = r(669);
      var c = r(622);
      var f = r(357);
      var l = r(912);
      var p = r(215);
      var h = p.alphasort;
      var d = p.alphasorti;
      var y = p.setopts;
      var v = p.ownProp;
      var D = p.childrenIgnored;
      var m = p.isIgnored;
      function globSync(e, t) {
        if (typeof t === 'function' || arguments.length === 3)
          throw new TypeError(
            'callback provided to sync glob\n' +
              'See: https://github.com/isaacs/node-glob/issues/167'
          );
        return new GlobSync(e, t).found;
      }
      function GlobSync(e, t) {
        if (!e) throw new Error('must provide pattern');
        if (typeof t === 'function' || arguments.length === 3)
          throw new TypeError(
            'callback provided to sync glob\n' +
              'See: https://github.com/isaacs/node-glob/issues/167'
          );
        if (!(this instanceof GlobSync)) return new GlobSync(e, t);
        y(this, e, t);
        if (this.noprocess) return this;
        var r = this.minimatch.set.length;
        this.matches = new Array(r);
        for (var n = 0; n < r; n++) {
          this._process(this.minimatch.set[n], n, false);
        }
        this._finish();
      }
      GlobSync.prototype._finish = function() {
        f(this instanceof GlobSync);
        if (this.realpath) {
          var e = this;
          this.matches.forEach(function(t, r) {
            var n = (e.matches[r] = Object.create(null));
            for (var i in t) {
              try {
                i = e._makeAbs(i);
                var o = u.realpathSync(i, e.realpathCache);
                n[o] = true;
              } catch (t) {
                if (t.syscall === 'stat') n[e._makeAbs(i)] = true;
                else throw t;
              }
            }
          });
        }
        p.finish(this);
      };
      GlobSync.prototype._process = function(e, t, r) {
        f(this instanceof GlobSync);
        var n = 0;
        while (typeof e[n] === 'string') {
          n++;
        }
        var u;
        switch (n) {
          case e.length:
            this._processSimple(e.join('/'), t);
            return;
          case 0:
            u = null;
            break;
          default:
            u = e.slice(0, n).join('/');
            break;
        }
        var o = e.slice(n);
        var a;
        if (u === null) a = '.';
        else if (l(u) || l(e.join('/'))) {
          if (!u || !l(u)) u = '/' + u;
          a = u;
        } else a = u;
        var s = this._makeAbs(a);
        if (D(this, a)) return;
        var c = o[0] === i.GLOBSTAR;
        if (c) this._processGlobStar(u, a, s, o, t, r);
        else this._processReaddir(u, a, s, o, t, r);
      };
      GlobSync.prototype._processReaddir = function(e, t, r, n, u, i) {
        var o = this._readdir(r, i);
        if (!o) return;
        var a = n[0];
        var s = !!this.minimatch.negate;
        var f = a._glob;
        var l = this.dot || f.charAt(0) === '.';
        var p = [];
        for (var h = 0; h < o.length; h++) {
          var d = o[h];
          if (d.charAt(0) !== '.' || l) {
            var y;
            if (s && !e) {
              y = !d.match(a);
            } else {
              y = d.match(a);
            }
            if (y) p.push(d);
          }
        }
        var v = p.length;
        if (v === 0) return;
        if (n.length === 1 && !this.mark && !this.stat) {
          if (!this.matches[u]) this.matches[u] = Object.create(null);
          for (var h = 0; h < v; h++) {
            var d = p[h];
            if (e) {
              if (e.slice(-1) !== '/') d = e + '/' + d;
              else d = e + d;
            }
            if (d.charAt(0) === '/' && !this.nomount) {
              d = c.join(this.root, d);
            }
            this._emitMatch(u, d);
          }
          return;
        }
        n.shift();
        for (var h = 0; h < v; h++) {
          var d = p[h];
          var D;
          if (e) D = [e, d];
          else D = [d];
          this._process(D.concat(n), u, i);
        }
      };
      GlobSync.prototype._emitMatch = function(e, t) {
        if (m(this, t)) return;
        var r = this._makeAbs(t);
        if (this.mark) t = this._mark(t);
        if (this.absolute) {
          t = r;
        }
        if (this.matches[e][t]) return;
        if (this.nodir) {
          var n = this.cache[r];
          if (n === 'DIR' || Array.isArray(n)) return;
        }
        this.matches[e][t] = true;
        if (this.stat) this._stat(t);
      };
      GlobSync.prototype._readdirInGlobStar = function(e) {
        if (this.follow) return this._readdir(e, false);
        var t;
        var r;
        var u;
        try {
          r = n.lstatSync(e);
        } catch (e) {
          if (e.code === 'ENOENT') {
            return null;
          }
        }
        var i = r && r.isSymbolicLink();
        this.symlinks[e] = i;
        if (!i && r && !r.isDirectory()) this.cache[e] = 'FILE';
        else t = this._readdir(e, false);
        return t;
      };
      GlobSync.prototype._readdir = function(e, t) {
        var r;
        if (t && !v(this.symlinks, e)) return this._readdirInGlobStar(e);
        if (v(this.cache, e)) {
          var u = this.cache[e];
          if (!u || u === 'FILE') return null;
          if (Array.isArray(u)) return u;
        }
        try {
          return this._readdirEntries(e, n.readdirSync(e));
        } catch (t) {
          this._readdirError(e, t);
          return null;
        }
      };
      GlobSync.prototype._readdirEntries = function(e, t) {
        if (!this.mark && !this.stat) {
          for (var r = 0; r < t.length; r++) {
            var n = t[r];
            if (e === '/') n = e + n;
            else n = e + '/' + n;
            this.cache[n] = true;
          }
        }
        this.cache[e] = t;
        return t;
      };
      GlobSync.prototype._readdirError = function(e, t) {
        switch (t.code) {
          case 'ENOTSUP':
          case 'ENOTDIR':
            var r = this._makeAbs(e);
            this.cache[r] = 'FILE';
            if (r === this.cwdAbs) {
              var n = new Error(t.code + ' invalid cwd ' + this.cwd);
              n.path = this.cwd;
              n.code = t.code;
              throw n;
            }
            break;
          case 'ENOENT':
          case 'ELOOP':
          case 'ENAMETOOLONG':
          case 'UNKNOWN':
            this.cache[this._makeAbs(e)] = false;
            break;
          default:
            this.cache[this._makeAbs(e)] = false;
            if (this.strict) throw t;
            if (!this.silent) console.error('glob error', t);
            break;
        }
      };
      GlobSync.prototype._processGlobStar = function(e, t, r, n, u, i) {
        var o = this._readdir(r, i);
        if (!o) return;
        var a = n.slice(1);
        var s = e ? [e] : [];
        var c = s.concat(a);
        this._process(c, u, false);
        var f = o.length;
        var l = this.symlinks[r];
        if (l && i) return;
        for (var p = 0; p < f; p++) {
          var h = o[p];
          if (h.charAt(0) === '.' && !this.dot) continue;
          var d = s.concat(o[p], a);
          this._process(d, u, true);
          var y = s.concat(o[p], n);
          this._process(y, u, true);
        }
      };
      GlobSync.prototype._processSimple = function(e, t) {
        var r = this._stat(e);
        if (!this.matches[t]) this.matches[t] = Object.create(null);
        if (!r) return;
        if (e && l(e) && !this.nomount) {
          var n = /[\/\\]$/.test(e);
          if (e.charAt(0) === '/') {
            e = c.join(this.root, e);
          } else {
            e = c.resolve(this.root, e);
            if (n) e += '/';
          }
        }
        if (process.platform === 'win32') e = e.replace(/\\/g, '/');
        this._emitMatch(t, e);
      };
      GlobSync.prototype._stat = function(e) {
        var t = this._makeAbs(e);
        var r = e.slice(-1) === '/';
        if (e.length > this.maxLength) return false;
        if (!this.stat && v(this.cache, t)) {
          var u = this.cache[t];
          if (Array.isArray(u)) u = 'DIR';
          if (!r || u === 'DIR') return u;
          if (r && u === 'FILE') return false;
        }
        var i;
        var o = this.statCache[t];
        if (!o) {
          var a;
          try {
            a = n.lstatSync(t);
          } catch (e) {
            if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) {
              this.statCache[t] = false;
              return false;
            }
          }
          if (a && a.isSymbolicLink()) {
            try {
              o = n.statSync(t);
            } catch (e) {
              o = a;
            }
          } else {
            o = a;
          }
        }
        this.statCache[t] = o;
        var u = true;
        if (o) u = o.isDirectory() ? 'DIR' : 'FILE';
        this.cache[t] = this.cache[t] || u;
        if (r && u === 'FILE') return false;
        return u;
      };
      GlobSync.prototype._mark = function(e) {
        return p.mark(this, e);
      };
      GlobSync.prototype._makeAbs = function(e) {
        return p.makeAbs(this, e);
      };
    },
    function(e, t, r) {
      'use strict';
      var n = r(440);
      var u = r(224);
      var i = r(192);
      var o = r(790);
      var a = r(457);
      function Extglob(e) {
        this.options = i({ source: 'extglob' }, e);
        this.snapdragon = this.options.snapdragon || new n(this.options);
        this.snapdragon.patterns = this.snapdragon.patterns || {};
        this.compiler = this.snapdragon.compiler;
        this.parser = this.snapdragon.parser;
        o(this.snapdragon);
        a(this.snapdragon);
        u(this.snapdragon, 'parse', function(e, t) {
          var r = n.prototype.parse.apply(this, arguments);
          r.input = e;
          var i = this.parser.stack.pop();
          if (i && this.options.strict !== true) {
            var o = i.nodes[0];
            o.val = '\\' + o.val;
            var a = o.parent.nodes[1];
            if (a.type === 'star') {
              a.loose = true;
            }
          }
          u(r, 'parser', this.parser);
          return r;
        });
        u(this, 'parse', function(e, t) {
          return this.snapdragon.parse.apply(this.snapdragon, arguments);
        });
        u(this, 'compile', function(e, t) {
          return this.snapdragon.compile.apply(this.snapdragon, arguments);
        });
      }
      e.exports = Extglob;
    },
    ,
    function(e, t, r) {
      'use strict';
      var n = r(58);
      var u = r(776);
      var i = r(680);
      e.exports = function(e, t) {
        return u(n(e) && t ? i(e, t) : e);
      };
    },
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n = r(720);
      var u = r(785);
      var i = r(11);
      var o = r(286);
      var a = r(324);
      var s = {};
      var c = {};
      function Snapdragon(e) {
        n.call(this, null, e);
        this.options = a.extend({ source: 'string' }, this.options);
        this.compiler = new i(this.options);
        this.parser = new o(this.options);
        Object.defineProperty(this, 'compilers', {
          get: function() {
            return this.compiler.compilers;
          },
        });
        Object.defineProperty(this, 'parsers', {
          get: function() {
            return this.parser.parsers;
          },
        });
        Object.defineProperty(this, 'regex', {
          get: function() {
            return this.parser.regex;
          },
        });
      }
      n.extend(Snapdragon);
      Snapdragon.prototype.capture = function() {
        return this.parser.capture.apply(this.parser, arguments);
      };
      Snapdragon.prototype.use = function(e) {
        e.call(this, this);
        return this;
      };
      Snapdragon.prototype.parse = function(e, t) {
        this.options = a.extend({}, this.options, t);
        var r = this.parser.parse(e, this.options);
        u(r, 'parser', this.parser);
        return r;
      };
      Snapdragon.prototype.compile = function(e, t) {
        this.options = a.extend({}, this.options, t);
        var r = this.compiler.compile(e, this.options);
        u(r, 'compiler', this.compiler);
        return r;
      };
      e.exports = Snapdragon;
      e.exports.Compiler = i;
      e.exports.Parser = o;
    },
    function(e, t, r) {
      'use strict';
      const n = r(729);
      const u = r(622);
      const i = r(425).invalidWin32Path;
      const o = parseInt('0777', 8);
      function mkdirsSync(e, t, r) {
        if (!t || typeof t !== 'object') {
          t = { mode: t };
        }
        let a = t.mode;
        const s = t.fs || n;
        if (process.platform === 'win32' && i(e)) {
          const t = new Error(e + ' contains invalid WIN32 path characters.');
          t.code = 'EINVAL';
          throw t;
        }
        if (a === undefined) {
          a = o & ~process.umask();
        }
        if (!r) r = null;
        e = u.resolve(e);
        try {
          s.mkdirSync(e, a);
          r = r || e;
        } catch (n) {
          if (n.code === 'ENOENT') {
            if (u.dirname(e) === e) throw n;
            r = mkdirsSync(u.dirname(e), t, r);
            mkdirsSync(e, t, r);
          } else {
            let t;
            try {
              t = s.statSync(e);
            } catch (e) {
              throw n;
            }
            if (!t.isDirectory()) throw n;
          }
        }
        return r;
      }
      e.exports = mkdirsSync;
    },
    function(e, t, r) {
      'use strict';
      const n = r(729);
      function symlinkType(e, t, r) {
        r = typeof t === 'function' ? t : r;
        t = typeof t === 'function' ? false : t;
        if (t) return r(null, t);
        n.lstat(e, (e, n) => {
          if (e) return r(null, 'file');
          t = n && n.isDirectory() ? 'dir' : 'file';
          r(null, t);
        });
      }
      function symlinkTypeSync(e, t) {
        let r;
        if (t) return t;
        try {
          r = n.lstatSync(e);
        } catch (e) {
          return 'file';
        }
        return r && r.isDirectory() ? 'dir' : 'file';
      }
      e.exports = { symlinkType: symlinkType, symlinkTypeSync: symlinkTypeSync };
    },
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      t.isSpaceSeparator = isSpaceSeparator;
      t.isIdStartChar = isIdStartChar;
      t.isIdContinueChar = isIdContinueChar;
      t.isDigit = isDigit;
      t.isHexDigit = isHexDigit;
      var n = r(28);
      var u = _interopRequireWildcard(n);
      function _interopRequireWildcard(e) {
        if (e && e.__esModule) {
          return e;
        } else {
          var t = {};
          if (e != null) {
            for (var r in e) {
              if (Object.prototype.hasOwnProperty.call(e, r)) t[r] = e[r];
            }
          }
          t.default = e;
          return t;
        }
      }
      function isSpaceSeparator(e) {
        return u.Space_Separator.test(e);
      }
      function isIdStartChar(e) {
        return (
          (e >= 'a' && e <= 'z') ||
          (e >= 'A' && e <= 'Z') ||
          e === '$' ||
          e === '_' ||
          u.ID_Start.test(e)
        );
      }
      function isIdContinueChar(e) {
        return (
          (e >= 'a' && e <= 'z') ||
          (e >= 'A' && e <= 'Z') ||
          (e >= '0' && e <= '9') ||
          e === '$' ||
          e === '_' ||
          e === '‌' ||
          e === '‍' ||
          u.ID_Continue.test(e)
        );
      }
      function isDigit(e) {
        return /[0-9]/.test(e);
      }
      function isHexDigit(e) {
        return /[0-9A-Fa-f]/.test(e);
      }
    },
    ,
    function(e, t, r) {
      'use strict';
      var n = r(318);
      var u = r(224);
      var i = r(861);
      var o = '([!@*?+]?\\(|\\)|[*?.+\\\\]|\\[:?(?=.*\\])|:?\\])+';
      var a = i.createRegex(o);
      function parsers(e) {
        e.state = e.state || {};
        e.use(n.parsers);
        e.parser.sets.paren = e.parser.sets.paren || [];
        e.parser
          .capture('paren.open', function() {
            var e = this.parsed;
            var t = this.position();
            var r = this.match(/^([!@*?+])?\(/);
            if (!r) return;
            var n = this.prev();
            var i = r[1];
            var o = r[0];
            var a = t({ type: 'paren.open', parsed: e, val: o });
            var s = t({ type: 'paren', prefix: i, nodes: [a] });
            if (i === '!' && n.type === 'paren' && n.prefix === '!') {
              n.prefix = '@';
              s.prefix = '@';
            }
            u(s, 'rest', this.input);
            u(s, 'parsed', e);
            u(s, 'parent', n);
            u(a, 'parent', s);
            this.push('paren', s);
            n.nodes.push(s);
          })
          .capture('paren.close', function() {
            var e = this.parsed;
            var t = this.position();
            var r = this.match(/^\)/);
            if (!r) return;
            var n = this.pop('paren');
            var i = t({ type: 'paren.close', rest: this.input, parsed: e, val: r[0] });
            if (!this.isType(n, 'paren')) {
              if (this.options.strict) {
                throw new Error('missing opening paren: "("');
              }
              i.escaped = true;
              return i;
            }
            i.prefix = n.prefix;
            n.nodes.push(i);
            u(i, 'parent', n);
          })
          .capture('escape', function() {
            var e = this.position();
            var t = this.match(/^\\(.)/);
            if (!t) return;
            return e({ type: 'escape', val: t[0], ch: t[1] });
          })
          .capture('qmark', function() {
            var t = this.parsed;
            var r = this.position();
            var n = this.match(/^\?+(?!\()/);
            if (!n) return;
            e.state.metachar = true;
            return r({ type: 'qmark', rest: this.input, parsed: t, val: n[0] });
          })
          .capture('star', /^\*(?!\()/)
          .capture('plus', /^\+(?!\()/)
          .capture('dot', /^\./)
          .capture('text', a);
      }
      e.exports.TEXT_REGEX = o;
      e.exports = parsers;
    },
    ,
    ,
    ,
    ,
    function(e, t, r) {
      var n = r(48),
        u = r(262),
        i = r(922),
        o = r(959);
      var a = 1 / 0;
      var s = n ? n.prototype : undefined,
        c = s ? s.toString : undefined;
      function baseToString(e) {
        if (typeof e == 'string') {
          return e;
        }
        if (i(e)) {
          return u(e, baseToString) + '';
        }
        if (o(e)) {
          return c ? c.call(e) : '';
        }
        var t = e + '';
        return t == '0' && 1 / e == -a ? '-0' : t;
      }
      e.exports = baseToString;
    },
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(373);
      e.exports = e => {
        if (!Number.isFinite(e)) {
          throw new TypeError('Expected a finite number');
        }
        return n
          .randomBytes(Math.ceil(e / 2))
          .toString('hex')
          .slice(0, e);
      };
    },
    function(e, t, r) {
      'use strict';
      const n = r(323).fromCallback;
      const u = n(r(153));
      const i = r(441);
      e.exports = {
        mkdirs: u,
        mkdirsSync: i,
        mkdirp: u,
        mkdirpSync: i,
        ensureDir: u,
        ensureDirSync: i,
      };
    },
    ,
    function(e, t, r) {
      e.exports = new (r(64))();
    },
    ,
    function(e, t) {
      t.GREATEST_LOWER_BOUND = 1;
      t.LEAST_UPPER_BOUND = 2;
      function recursiveSearch(e, r, n, u, i, o) {
        var a = Math.floor((r - e) / 2) + e;
        var s = i(n, u[a], true);
        if (s === 0) {
          return a;
        } else if (s > 0) {
          if (r - a > 1) {
            return recursiveSearch(a, r, n, u, i, o);
          }
          if (o == t.LEAST_UPPER_BOUND) {
            return r < u.length ? r : -1;
          } else {
            return a;
          }
        } else {
          if (a - e > 1) {
            return recursiveSearch(e, a, n, u, i, o);
          }
          if (o == t.LEAST_UPPER_BOUND) {
            return a;
          } else {
            return e < 0 ? -1 : e;
          }
        }
      }
      t.search = function search(e, r, n, u) {
        if (r.length === 0) {
          return -1;
        }
        var i = recursiveSearch(-1, r.length, e, r, n, u || t.GREATEST_LOWER_BOUND);
        if (i < 0) {
          return -1;
        }
        while (i - 1 >= 0) {
          if (n(r[i], r[i - 1], true) !== 0) {
            break;
          }
          --i;
        }
        return i;
      };
    },
    ,
    function(e, t, r) {
      var n = r(549);
      var u = '__lodash_hash_undefined__';
      var i = Object.prototype;
      var o = i.hasOwnProperty;
      function hashGet(e) {
        var t = this.__data__;
        if (n) {
          var r = t[e];
          return r === u ? undefined : r;
        }
        return o.call(t, e) ? t[e] : undefined;
      }
      e.exports = hashGet;
    },
    ,
    function(e, t, r) {
      'use strict';
      var n = r(360);
      var u = r(870);
      var i = {};
      function toRegexRange(e, t, r) {
        if (u(e) === false) {
          throw new RangeError('toRegexRange: first argument is invalid.');
        }
        if (typeof t === 'undefined' || e === t) {
          return String(e);
        }
        if (u(t) === false) {
          throw new RangeError('toRegexRange: second argument is invalid.');
        }
        r = r || {};
        var n = String(r.relaxZeros);
        var o = String(r.shorthand);
        var a = String(r.capture);
        var s = e + ':' + t + '=' + n + o + a;
        if (i.hasOwnProperty(s)) {
          return i[s].result;
        }
        var c = Math.min(e, t);
        var f = Math.max(e, t);
        if (Math.abs(c - f) === 1) {
          var l = e + '|' + t;
          if (r.capture) {
            return '(' + l + ')';
          }
          return l;
        }
        var p = padding(e) || padding(t);
        var h = [];
        var d = [];
        var y = { min: e, max: t, a: c, b: f };
        if (p) {
          y.isPadded = p;
          y.maxLen = String(y.max).length;
        }
        if (c < 0) {
          var v = f < 0 ? Math.abs(f) : 1;
          var D = Math.abs(c);
          d = splitToPatterns(v, D, y, r);
          c = y.a = 0;
        }
        if (f >= 0) {
          h = splitToPatterns(c, f, y, r);
        }
        y.negatives = d;
        y.positives = h;
        y.result = siftPatterns(d, h, r);
        if (r.capture && h.length + d.length > 1) {
          y.result = '(' + y.result + ')';
        }
        i[s] = y;
        return y.result;
      }
      function siftPatterns(e, t, r) {
        var n = filterPatterns(e, t, '-', false, r) || [];
        var u = filterPatterns(t, e, '', false, r) || [];
        var i = filterPatterns(e, t, '-?', true, r) || [];
        var o = n.concat(i).concat(u);
        return o.join('|');
      }
      function splitToRanges(e, t) {
        e = Number(e);
        t = Number(t);
        var r = 1;
        var n = [t];
        var u = +countNines(e, r);
        while (e <= u && u <= t) {
          n = push(n, u);
          r += 1;
          u = +countNines(e, r);
        }
        var i = 1;
        u = countZeros(t + 1, i) - 1;
        while (e < u && u <= t) {
          n = push(n, u);
          i += 1;
          u = countZeros(t + 1, i) - 1;
        }
        n.sort(compare);
        return n;
      }
      function rangeToPattern(e, t, r) {
        if (e === t) {
          return { pattern: String(e), digits: [] };
        }
        var n = zip(String(e), String(t));
        var u = n.length,
          i = -1;
        var o = '';
        var a = 0;
        while (++i < u) {
          var s = n[i];
          var c = s[0];
          var f = s[1];
          if (c === f) {
            o += c;
          } else if (c !== '0' || f !== '9') {
            o += toCharacterClass(c, f);
          } else {
            a += 1;
          }
        }
        if (a) {
          o += r.shorthand ? '\\d' : '[0-9]';
        }
        return { pattern: o, digits: [a] };
      }
      function splitToPatterns(e, t, r, n) {
        var u = splitToRanges(e, t);
        var i = u.length;
        var o = -1;
        var a = [];
        var s = e;
        var c;
        while (++o < i) {
          var f = u[o];
          var l = rangeToPattern(s, f, n);
          var p = '';
          if (!r.isPadded && c && c.pattern === l.pattern) {
            if (c.digits.length > 1) {
              c.digits.pop();
            }
            c.digits.push(l.digits[0]);
            c.string = c.pattern + toQuantifier(c.digits);
            s = f + 1;
            continue;
          }
          if (r.isPadded) {
            p = padZeros(f, r);
          }
          l.string = p + l.pattern + toQuantifier(l.digits);
          a.push(l);
          s = f + 1;
          c = l;
        }
        return a;
      }
      function filterPatterns(e, t, r, n, u) {
        var i = [];
        for (var o = 0; o < e.length; o++) {
          var a = e[o];
          var s = a.string;
          if (u.relaxZeros !== false) {
            if (r === '-' && s.charAt(0) === '0') {
              if (s.charAt(1) === '{') {
                s = '0*' + s.replace(/^0\{\d+\}/, '');
              } else {
                s = '0*' + s.slice(1);
              }
            }
          }
          if (!n && !contains(t, 'string', s)) {
            i.push(r + s);
          }
          if (n && contains(t, 'string', s)) {
            i.push(r + s);
          }
        }
        return i;
      }
      function zip(e, t) {
        var r = [];
        for (var n in e) r.push([e[n], t[n]]);
        return r;
      }
      function compare(e, t) {
        return e > t ? 1 : t > e ? -1 : 0;
      }
      function push(e, t) {
        if (e.indexOf(t) === -1) e.push(t);
        return e;
      }
      function contains(e, t, r) {
        for (var n = 0; n < e.length; n++) {
          if (e[n][t] === r) {
            return true;
          }
        }
        return false;
      }
      function countNines(e, t) {
        return String(e).slice(0, -t) + n('9', t);
      }
      function countZeros(e, t) {
        return e - e % Math.pow(10, t);
      }
      function toQuantifier(e) {
        var t = e[0];
        var r = e[1] ? ',' + e[1] : '';
        if (!r && (!t || t === 1)) {
          return '';
        }
        return '{' + t + r + '}';
      }
      function toCharacterClass(e, t) {
        return '[' + e + (t - e === 1 ? '' : '-') + t + ']';
      }
      function padding(e) {
        return /^-?(0+)\d/.exec(e);
      }
      function padZeros(e, t) {
        if (t.isPadded) {
          var r = Math.abs(t.maxLen - String(e).length);
          switch (r) {
            case 0:
              return '';
            case 1:
              return '0';
            default: {
              return '0{' + r + '}';
            }
          }
        }
        return e;
      }
      e.exports = toRegexRange;
    },
    ,
    function(e) {
      var t = {}.toString;
      e.exports =
        Array.isArray ||
        function(e) {
          return t.call(e) == '[object Array]';
        };
    },
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    function(e, t, r) {
      var n = r(107);
      function listCacheGet(e) {
        var t = this.__data__,
          r = n(t, e);
        return r < 0 ? undefined : t[r][1];
      }
      e.exports = listCacheGet;
    },
    ,
    ,
    ,
    function(e, t, r) {
      var n = r(107);
      var u = Array.prototype;
      var i = u.splice;
      function listCacheDelete(e) {
        var t = this.__data__,
          r = n(t, e);
        if (r < 0) {
          return false;
        }
        var u = t.length - 1;
        if (r == u) {
          t.pop();
        } else {
          i.call(t, r, 1);
        }
        --this.size;
        return true;
      }
      e.exports = listCacheDelete;
    },
    function(e, t, r) {
      'use strict';
      var n = r(15);
      var u = r(795);
      var i = r(680);
      e.exports = function(e, t, r) {
        if (n(e)) {
          return u(i(e, t), r);
        }
        return u(e, t);
      };
    },
    function(e, t, r) {
      var n = r(170);
      var u = (function() {
        try {
          var e = n(Object, 'defineProperty');
          e({}, '', {});
          return e;
        } catch (e) {}
      })();
      e.exports = u;
    },
    ,
    ,
    ,
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(323).fromCallback;
      const u = r(622);
      const i = r(729);
      const o = r(983);
      const a = r(917).pathExists;
      function createFile(e, t) {
        function makeFile() {
          i.writeFile(e, '', e => {
            if (e) return t(e);
            t();
          });
        }
        i.stat(e, (r, n) => {
          if (!r && n.isFile()) return t();
          const i = u.dirname(e);
          a(i, (e, r) => {
            if (e) return t(e);
            if (r) return makeFile();
            o.mkdirs(i, e => {
              if (e) return t(e);
              makeFile();
            });
          });
        });
      }
      function createFileSync(e) {
        let t;
        try {
          t = i.statSync(e);
        } catch (e) {}
        if (t && t.isFile()) return;
        const r = u.dirname(e);
        if (!i.existsSync(r)) {
          o.mkdirsSync(r);
        }
        i.writeFileSync(e, '');
      }
      e.exports = { createFile: n(createFile), createFileSync: createFileSync };
    },
    function(e, t, r) {
      (function() {
        'use strict';
        t.ast = r(44);
        t.code = r(130);
        t.keyword = r(891);
      })();
    },
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    function(e) {
      var t = Object.prototype.toString;
      e.exports = function kindOf(e) {
        if (e === void 0) return 'undefined';
        if (e === null) return 'null';
        var r = typeof e;
        if (r === 'boolean') return 'boolean';
        if (r === 'string') return 'string';
        if (r === 'number') return 'number';
        if (r === 'symbol') return 'symbol';
        if (r === 'function') {
          return isGeneratorFn(e) ? 'generatorfunction' : 'function';
        }
        if (isArray(e)) return 'array';
        if (isBuffer(e)) return 'buffer';
        if (isArguments(e)) return 'arguments';
        if (isDate(e)) return 'date';
        if (isError(e)) return 'error';
        if (isRegexp(e)) return 'regexp';
        switch (ctorName(e)) {
          case 'Symbol':
            return 'symbol';
          case 'Promise':
            return 'promise';
          case 'WeakMap':
            return 'weakmap';
          case 'WeakSet':
            return 'weakset';
          case 'Map':
            return 'map';
          case 'Set':
            return 'set';
          case 'Int8Array':
            return 'int8array';
          case 'Uint8Array':
            return 'uint8array';
          case 'Uint8ClampedArray':
            return 'uint8clampedarray';
          case 'Int16Array':
            return 'int16array';
          case 'Uint16Array':
            return 'uint16array';
          case 'Int32Array':
            return 'int32array';
          case 'Uint32Array':
            return 'uint32array';
          case 'Float32Array':
            return 'float32array';
          case 'Float64Array':
            return 'float64array';
        }
        if (isGeneratorObj(e)) {
          return 'generator';
        }
        r = t.call(e);
        switch (r) {
          case '[object Object]':
            return 'object';
          case '[object Map Iterator]':
            return 'mapiterator';
          case '[object Set Iterator]':
            return 'setiterator';
          case '[object String Iterator]':
            return 'stringiterator';
          case '[object Array Iterator]':
            return 'arrayiterator';
        }
        return r
          .slice(8, -1)
          .toLowerCase()
          .replace(/\s/g, '');
      };
      function ctorName(e) {
        return e.constructor ? e.constructor.name : null;
      }
      function isArray(e) {
        if (Array.isArray) return Array.isArray(e);
        return e instanceof Array;
      }
      function isError(e) {
        return (
          e instanceof Error ||
          (typeof e.message === 'string' &&
            e.constructor &&
            typeof e.constructor.stackTraceLimit === 'number')
        );
      }
      function isDate(e) {
        if (e instanceof Date) return true;
        return (
          typeof e.toDateString === 'function' &&
          typeof e.getDate === 'function' &&
          typeof e.setDate === 'function'
        );
      }
      function isRegexp(e) {
        if (e instanceof RegExp) return true;
        return (
          typeof e.flags === 'string' &&
          typeof e.ignoreCase === 'boolean' &&
          typeof e.multiline === 'boolean' &&
          typeof e.global === 'boolean'
        );
      }
      function isGeneratorFn(e, t) {
        return ctorName(e) === 'GeneratorFunction';
      }
      function isGeneratorObj(e) {
        return (
          typeof e.throw === 'function' &&
          typeof e.return === 'function' &&
          typeof e.next === 'function'
        );
      }
      function isArguments(e) {
        try {
          if (typeof e.length === 'number' && typeof e.callee === 'function') {
            return true;
          }
        } catch (e) {
          if (e.message.indexOf('callee') !== -1) {
            return true;
          }
        }
        return false;
      }
      function isBuffer(e) {
        if (e.constructor && typeof e.constructor.isBuffer === 'function') {
          return e.constructor.isBuffer(e);
        }
        return false;
      }
    },
    ,
    function(e) {
      'use strict';
      e.exports = function forIn(e, t, r) {
        for (var n in e) {
          if (t.call(r, e[n], n, e) === false) {
            break;
          }
        }
      };
    },
    ,
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n = r(192);
      var u = r(440);
      var i = r(926);
      var o = r(919);
      var a = r(49);
      function Braces(e) {
        this.options = n({}, e);
      }
      Braces.prototype.init = function(e) {
        if (this.isInitialized) return;
        this.isInitialized = true;
        var t = a.createOptions({}, this.options, e);
        this.snapdragon = this.options.snapdragon || new u(t);
        this.compiler = this.snapdragon.compiler;
        this.parser = this.snapdragon.parser;
        i(this.snapdragon, t);
        o(this.snapdragon, t);
        a.define(this.snapdragon, 'parse', function(e, t) {
          var r = u.prototype.parse.apply(this, arguments);
          this.parser.ast.input = e;
          var n = this.parser.stack;
          while (n.length) {
            addParent({ type: 'brace.close', val: '' }, n.pop());
          }
          function addParent(e, t) {
            a.define(e, 'parent', t);
            t.nodes.push(e);
          }
          a.define(r, 'parser', this.parser);
          return r;
        });
      };
      Braces.prototype.parse = function(e, t) {
        if (e && typeof e === 'object' && e.nodes) return e;
        this.init(t);
        return this.snapdragon.parse(e, t);
      };
      Braces.prototype.compile = function(e, t) {
        if (typeof e === 'string') {
          e = this.parse(e, t);
        } else {
          this.init(t);
        }
        return this.snapdragon.compile(e, t);
      };
      Braces.prototype.expand = function(e) {
        var t = this.parse(e, { expand: true });
        return this.compile(t, { expand: true });
      };
      Braces.prototype.optimize = function(e) {
        var t = this.parse(e, { optimize: true });
        return this.compile(t, { optimize: true });
      };
      e.exports = Braces;
    },
    ,
    ,
    ,
    function(e, t, r) {
      var n = r(976),
        u = r(868);
      var i = Object.prototype;
      var o = i.hasOwnProperty;
      var a = i.propertyIsEnumerable;
      var s = n(
        (function() {
          return arguments;
        })()
      )
        ? n
        : function(e) {
            return u(e) && o.call(e, 'callee') && !a.call(e, 'callee');
          };
      e.exports = s;
    },
    ,
    function(e, t, r) {
      'use strict';
      var n = r(58);
      e.exports = function pick(e, t) {
        if (!n(e) && typeof e !== 'function') {
          return {};
        }
        var r = {};
        if (typeof t === 'string') {
          if (t in e) {
            r[t] = e[t];
          }
          return r;
        }
        var u = t.length;
        var i = -1;
        while (++i < u) {
          var o = t[i];
          if (o in e) {
            r[o] = e[o];
          }
        }
        return r;
      };
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      e.exports = function(e) {
        var t = r(995)('npm', { registry: 'https://registry.npmjs.org/' });
        var n = t[e + ':registry'] || t.registry;
        return n.slice(-1) === '/' ? n : n + '/';
      };
    },
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(323).fromCallback;
      const u = r(729);
      const i = [
        'access',
        'appendFile',
        'chmod',
        'chown',
        'close',
        'copyFile',
        'fchmod',
        'fchown',
        'fdatasync',
        'fstat',
        'fsync',
        'ftruncate',
        'futimes',
        'lchown',
        'lchmod',
        'link',
        'lstat',
        'mkdir',
        'mkdtemp',
        'open',
        'readFile',
        'readdir',
        'readlink',
        'realpath',
        'rename',
        'rmdir',
        'stat',
        'symlink',
        'truncate',
        'unlink',
        'utimes',
        'writeFile',
      ].filter(e => {
        return typeof u[e] === 'function';
      });
      Object.keys(u).forEach(e => {
        if (e === 'promises') {
          return;
        }
        t[e] = u[e];
      });
      i.forEach(e => {
        t[e] = n(u[e]);
      });
      t.exists = function(e, t) {
        if (typeof t === 'function') {
          return u.exists(e, t);
        }
        return new Promise(t => {
          return u.exists(e, t);
        });
      };
      t.read = function(e, t, r, n, i, o) {
        if (typeof o === 'function') {
          return u.read(e, t, r, n, i, o);
        }
        return new Promise((o, a) => {
          u.read(e, t, r, n, i, (e, t, r) => {
            if (e) return a(e);
            o({ bytesRead: t, buffer: r });
          });
        });
      };
      t.write = function(e, t, ...r) {
        if (typeof r[r.length - 1] === 'function') {
          return u.write(e, t, ...r);
        }
        return new Promise((n, i) => {
          u.write(e, t, ...r, (e, t, r) => {
            if (e) return i(e);
            n({ bytesWritten: t, buffer: r });
          });
        });
      };
    },
    ,
    function(e, t, r) {
      try {
        var n = r(669);
        if (typeof n.inherits !== 'function') throw '';
        e.exports = n.inherits;
      } catch (t) {
        e.exports = r(637);
      }
    },
    function(e, t) {
      Object.defineProperty(t, '__esModule', { value: true });
      t.default = /((['"])(?:(?!\2|\\).|\\(?:\r\n|[\s\S]))*(\2)?|`(?:[^`\\$]|\\[\s\S]|\$(?!\{)|\$\{(?:[^{}]|\{[^}]*\}?)*\}?)*(`)?)|(\/\/.*)|(\/\*(?:[^*]|\*(?!\/))*(\*\/)?)|(\/(?!\*)(?:\[(?:(?![\]\\]).|\\.)*\]|(?![\/\]\\]).|\\.)+\/(?:(?!\s*(?:\b|[\u0080-\uFFFF$\\'"~({]|[+\-!](?!=)|\.?\d))|[gmiyus]{1,6}\b(?![\u0080-\uFFFF$\\]|\s*(?:[+\-*%&|^<>!=?({]|\/(?![\/*])))))|(0[xX][\da-fA-F]+|0[oO][0-7]+|0[bB][01]+|(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?)|((?!\d)(?:(?!\s)[$\w\u0080-\uFFFF]|\\u[\da-fA-F]{4}|\\u\{[\da-fA-F]+\})+)|(--|\+\+|&&|\|\||=>|\.{3}|(?:[+\-\/%&|^]|\*{1,2}|<{1,2}|>{1,3}|!=?|={1,2})=?|[?~.,:;[\](){}])|(\s+)|(^$|[\s\S])/g;
      t.matchToToken = function(e) {
        var t = { type: 'invalid', value: e[0], closed: undefined };
        if (e[1]) (t.type = 'string'), (t.closed = !!(e[3] || e[4]));
        else if (e[5]) t.type = 'comment';
        else if (e[6]) (t.type = 'comment'), (t.closed = !!e[7]);
        else if (e[8]) t.type = 'regex';
        else if (e[9]) t.type = 'number';
        else if (e[10]) t.type = 'name';
        else if (e[11]) t.type = 'punctuator';
        else if (e[12]) t.type = 'whitespace';
        return t;
      };
    },
    function(e, t, r) {
      var n = r(174);
      e.exports = n(once);
      e.exports.strict = n(onceStrict);
      once.proto = once(function() {
        Object.defineProperty(Function.prototype, 'once', {
          value: function() {
            return once(this);
          },
          configurable: true,
        });
        Object.defineProperty(Function.prototype, 'onceStrict', {
          value: function() {
            return onceStrict(this);
          },
          configurable: true,
        });
      });
      function once(e) {
        var t = function() {
          if (t.called) return t.value;
          t.called = true;
          return (t.value = e.apply(this, arguments));
        };
        t.called = false;
        return t;
      }
      function onceStrict(e) {
        var t = function() {
          if (t.called) throw new Error(t.onceError);
          t.called = true;
          return (t.value = e.apply(this, arguments));
        };
        var r = e.name || 'Function wrapped with `once`';
        t.onceError = r + " shouldn't be called more than once";
        t.called = false;
        return t;
      }
    },
    ,
    function(e) {
      function isObject(e) {
        var t = typeof e;
        return e != null && (t == 'object' || t == 'function');
      }
      e.exports = isObject;
    },
    function(e, t, r) {
      const n = r(115).Buffer;
      function decodeBase64(e) {
        return n.from(e, 'base64').toString('utf8');
      }
      function encodeBase64(e) {
        return n.from(e, 'utf8').toString('base64');
      }
      e.exports = { decodeBase64: decodeBase64, encodeBase64: encodeBase64 };
    },
    function(e, t, r) {
      'use strict';
      var n = r(58);
      var u = r(60);
      var i =
        typeof Reflect !== 'undefined' && Reflect.defineProperty
          ? Reflect.defineProperty
          : Object.defineProperty;
      e.exports = function defineProperty(e, t, r) {
        if (!n(e) && typeof e !== 'function' && !Array.isArray(e)) {
          throw new TypeError('expected an object, function, or array');
        }
        if (typeof t !== 'string') {
          throw new TypeError('expected "key" to be a string');
        }
        if (u(r)) {
          i(e, t, r);
          return e;
        }
        i(e, t, { configurable: true, enumerable: false, writable: true, value: r });
        return e;
      };
    },
    ,
    ,
    function(e) {
      'use strict';
      e.exports = function(e, t) {
        function slash() {
          if (t && typeof t.slash === 'string') {
            return t.slash;
          }
          if (t && typeof t.slash === 'function') {
            return t.slash.call(e);
          }
          return '\\\\/';
        }
        function star() {
          if (t && typeof t.star === 'string') {
            return t.star;
          }
          if (t && typeof t.star === 'function') {
            return t.star.call(e);
          }
          return '[^' + slash() + ']*?';
        }
        var r = (e.ast = e.parser.ast);
        r.state = e.parser.state;
        e.compiler.state = r.state;
        e.compiler
          .set('not', function(e) {
            var t = this.prev();
            if (this.options.nonegate === true || t.type !== 'bos') {
              return this.emit('\\' + e.val, e);
            }
            return this.emit(e.val, e);
          })
          .set('escape', function(e) {
            if (this.options.unescape && /^[-\w_.]/.test(e.val)) {
              return this.emit(e.val, e);
            }
            return this.emit('\\' + e.val, e);
          })
          .set('quoted', function(e) {
            return this.emit(e.val, e);
          })
          .set('dollar', function(e) {
            if (e.parent.type === 'bracket') {
              return this.emit(e.val, e);
            }
            return this.emit('\\' + e.val, e);
          })
          .set('dot', function(e) {
            if (e.dotfiles === true) this.dotfiles = true;
            return this.emit('\\' + e.val, e);
          })
          .set('backslash', function(e) {
            return this.emit(e.val, e);
          })
          .set('slash', function(e, t, r) {
            var n = '[' + slash() + ']';
            var u = e.parent;
            var i = this.prev();
            while (u.type === 'paren' && !u.hasSlash) {
              u.hasSlash = true;
              u = u.parent;
            }
            if (i.addQmark) {
              n += '?';
            }
            if (e.rest.slice(0, 2) === '\\b') {
              return this.emit(n, e);
            }
            if (e.parsed === '**' || e.parsed === './**') {
              this.output = '(?:' + this.output;
              return this.emit(n + ')?', e);
            }
            if (e.parsed === '!**' && this.options.nonegate !== true) {
              return this.emit(n + '?\\b', e);
            }
            return this.emit(n, e);
          })
          .set('bracket', function(e) {
            var t = e.close;
            var r = !e.escaped ? '[' : '\\[';
            var n = e.negated;
            var u = e.inner;
            var i = e.val;
            if (e.escaped === true) {
              u = u.replace(/\\?(\W)/g, '\\$1');
              n = '';
            }
            if (u === ']-') {
              u = '\\]\\-';
            }
            if (n && u.indexOf('.') === -1) {
              u += '.';
            }
            if (n && u.indexOf('/') === -1) {
              u += '/';
            }
            i = r + n + u + t;
            return this.emit(i, e);
          })
          .set('square', function(e) {
            var t = (/^\W/.test(e.val) ? '\\' : '') + e.val;
            return this.emit(t, e);
          })
          .set('qmark', function(e) {
            var t = this.prev();
            var r = '[^.\\\\/]';
            if (this.options.dot || (t.type !== 'bos' && t.type !== 'slash')) {
              r = '[^\\\\/]';
            }
            if (e.parsed.slice(-1) === '(') {
              var n = e.rest.charAt(0);
              if (n === '!' || n === '=' || n === ':') {
                return this.emit(e.val, e);
              }
            }
            if (e.val.length > 1) {
              r += '{' + e.val.length + '}';
            }
            return this.emit(r, e);
          })
          .set('plus', function(e) {
            var t = e.parsed.slice(-1);
            if (t === ']' || t === ')') {
              return this.emit(e.val, e);
            }
            if (!this.output || (/[?*+]/.test(r) && e.parent.type !== 'bracket')) {
              return this.emit('\\+', e);
            }
            var r = this.output.slice(-1);
            if (/\w/.test(r) && !e.inside) {
              return this.emit('+\\+?', e);
            }
            return this.emit('+', e);
          })
          .set('globstar', function(e, t, r) {
            if (!this.output) {
              this.state.leadingGlobstar = true;
            }
            var n = this.prev();
            var u = this.prev(2);
            var i = this.next();
            var o = this.next(2);
            var a = n.type;
            var s = e.val;
            if (n.type === 'slash' && i.type === 'slash') {
              if (u.type === 'text') {
                this.output += '?';
                if (o.type !== 'text') {
                  this.output += '\\b';
                }
              }
            }
            var c = e.parsed;
            if (c.charAt(0) === '!') {
              c = c.slice(1);
            }
            var f = e.isInside.paren || e.isInside.brace;
            if (c && a !== 'slash' && a !== 'bos' && !f) {
              s = star();
            } else {
              s =
                this.options.dot !== true
                  ? '(?:(?!(?:[' + slash() + ']|^)\\.).)*?'
                  : '(?:(?!(?:[' + slash() + ']|^)(?:\\.{1,2})($|[' + slash() + ']))(?!\\.{2}).)*?';
            }
            if ((a === 'slash' || a === 'bos') && this.options.dot !== true) {
              s = '(?!\\.)' + s;
            }
            if (n.type === 'slash' && i.type === 'slash' && u.type !== 'text') {
              if (o.type === 'text' || o.type === 'star') {
                e.addQmark = true;
              }
            }
            if (this.options.capture) {
              s = '(' + s + ')';
            }
            return this.emit(s, e);
          })
          .set('star', function(e, t, r) {
            var n = t[r - 2] || {};
            var u = this.prev();
            var i = this.next();
            var o = u.type;
            function isStart(e) {
              return e.type === 'bos' || e.type === 'slash';
            }
            if (this.output === '' && this.options.contains !== true) {
              this.output = '(?![' + slash() + '])';
            }
            if (o === 'bracket' && this.options.bash === false) {
              var a = i && i.type === 'bracket' ? star() : '*?';
              if (!u.nodes || u.nodes[1].type !== 'posix') {
                return this.emit(a, e);
              }
            }
            var s =
              !this.dotfiles && o !== 'text' && o !== 'escape'
                ? this.options.dot
                  ? '(?!(?:^|[' + slash() + '])\\.{1,2}(?:$|[' + slash() + ']))'
                  : '(?!\\.)'
                : '';
            if (isStart(u) || (isStart(n) && o === 'not')) {
              if (s !== '(?!\\.)') {
                s += '(?!(\\.{2}|\\.[' + slash() + ']))(?=.)';
              } else {
                s += '(?=.)';
              }
            } else if (s === '(?!\\.)') {
              s = '';
            }
            if (u.type === 'not' && n.type === 'bos' && this.options.dot === true) {
              this.output = '(?!\\.)' + this.output;
            }
            var c = s + star();
            if (this.options.capture) {
              c = '(' + c + ')';
            }
            return this.emit(c, e);
          })
          .set('text', function(e) {
            return this.emit(e.val, e);
          })
          .set('eos', function(e) {
            var t = this.prev();
            var r = e.val;
            this.output = '(?:\\.[' + slash() + '](?=.))?' + this.output;
            if (this.state.metachar && t.type !== 'qmark' && t.type !== 'slash') {
              r += this.options.contains ? '[' + slash() + ']?' : '(?:[' + slash() + ']|$)';
            }
            return this.emit(r, e);
          });
        if (t && typeof t.compilers === 'function') {
          t.compilers(e.compiler);
        }
      };
    },
    ,
    ,
    function(e) {
      'use strict';
      e.exports = function union(e) {
        if (!Array.isArray(e)) {
          throw new TypeError('arr-union expects the first argument to be an array.');
        }
        var t = arguments.length;
        var r = 0;
        while (++r < t) {
          var n = arguments[r];
          if (!n) continue;
          if (!Array.isArray(n)) {
            n = [n];
          }
          for (var u = 0; u < n.length; u++) {
            var i = n[u];
            if (e.indexOf(i) >= 0) {
              continue;
            }
            e.push(i);
          }
        }
        return e;
      };
    },
    function(e, t, r) {
      var n = r(170);
      var u = n(Object, 'create');
      e.exports = u;
    },
    function(e, t, r) {
      var n = r(614).EventEmitter;
      var u = r(129).spawn;
      var i = r(622);
      var o = i.dirname;
      var a = i.basename;
      var s = r(747);
      r(669).inherits(Command, n);
      t = e.exports = new Command();
      t.Command = Command;
      t.Option = Option;
      function Option(e, t) {
        this.flags = e;
        this.required = e.indexOf('<') >= 0;
        this.optional = e.indexOf('[') >= 0;
        this.bool = e.indexOf('-no-') === -1;
        e = e.split(/[ ,|]+/);
        if (e.length > 1 && !/^[[<]/.test(e[1])) this.short = e.shift();
        this.long = e.shift();
        this.description = t || '';
      }
      Option.prototype.name = function() {
        return this.long.replace('--', '').replace('no-', '');
      };
      Option.prototype.attributeName = function() {
        return camelcase(this.name());
      };
      Option.prototype.is = function(e) {
        return this.short === e || this.long === e;
      };
      function Command(e) {
        this.commands = [];
        this.options = [];
        this._execs = {};
        this._allowUnknownOption = false;
        this._args = [];
        this._name = e || '';
      }
      Command.prototype.command = function(e, t, r) {
        if (typeof t === 'object' && t !== null) {
          r = t;
          t = null;
        }
        r = r || {};
        var n = e.split(/ +/);
        var u = new Command(n.shift());
        if (t) {
          u.description(t);
          this.executables = true;
          this._execs[u._name] = true;
          if (r.isDefault) this.defaultExecutable = u._name;
        }
        u._noHelp = !!r.noHelp;
        this.commands.push(u);
        u.parseExpectedArgs(n);
        u.parent = this;
        if (t) return this;
        return u;
      };
      Command.prototype.arguments = function(e) {
        return this.parseExpectedArgs(e.split(/ +/));
      };
      Command.prototype.addImplicitHelpCommand = function() {
        this.command('help [cmd]', 'display help for [cmd]');
      };
      Command.prototype.parseExpectedArgs = function(e) {
        if (!e.length) return;
        var t = this;
        e.forEach(function(e) {
          var r = { required: false, name: '', variadic: false };
          switch (e[0]) {
            case '<':
              r.required = true;
              r.name = e.slice(1, -1);
              break;
            case '[':
              r.name = e.slice(1, -1);
              break;
          }
          if (r.name.length > 3 && r.name.slice(-3) === '...') {
            r.variadic = true;
            r.name = r.name.slice(0, -3);
          }
          if (r.name) {
            t._args.push(r);
          }
        });
        return this;
      };
      Command.prototype.action = function(e) {
        var t = this;
        var r = function(r, n) {
          r = r || [];
          n = n || [];
          var u = t.parseOptions(n);
          outputHelpIfNecessary(t, u.unknown);
          if (u.unknown.length > 0) {
            t.unknownOption(u.unknown[0]);
          }
          if (u.args.length) r = u.args.concat(r);
          t._args.forEach(function(e, n) {
            if (e.required && r[n] == null) {
              t.missingArgument(e.name);
            } else if (e.variadic) {
              if (n !== t._args.length - 1) {
                t.variadicArgNotLast(e.name);
              }
              r[n] = r.splice(n);
            }
          });
          if (t._args.length) {
            r[t._args.length] = t;
          } else {
            r.push(t);
          }
          e.apply(t, r);
        };
        var n = this.parent || this;
        var u = n === this ? '*' : this._name;
        n.on('command:' + u, r);
        if (this._alias) n.on('command:' + this._alias, r);
        return this;
      };
      Command.prototype.option = function(e, t, r, n) {
        var u = this,
          i = new Option(e, t),
          o = i.name(),
          a = i.attributeName();
        if (typeof r !== 'function') {
          if (r instanceof RegExp) {
            var s = r;
            r = function(e, t) {
              var r = s.exec(e);
              return r ? r[0] : t;
            };
          } else {
            n = r;
            r = null;
          }
        }
        if (!i.bool || i.optional || i.required) {
          if (!i.bool) n = true;
          if (n !== undefined) {
            u[a] = n;
            i.defaultValue = n;
          }
        }
        this.options.push(i);
        this.on('option:' + o, function(e) {
          if (e !== null && r) {
            e = r(e, u[a] === undefined ? n : u[a]);
          }
          if (typeof u[a] === 'boolean' || typeof u[a] === 'undefined') {
            if (e == null) {
              u[a] = i.bool ? n || true : false;
            } else {
              u[a] = e;
            }
          } else if (e !== null) {
            u[a] = e;
          }
        });
        return this;
      };
      Command.prototype.allowUnknownOption = function(e) {
        this._allowUnknownOption = arguments.length === 0 || e;
        return this;
      };
      Command.prototype.parse = function(e) {
        if (this.executables) this.addImplicitHelpCommand();
        this.rawArgs = e;
        this._name = this._name || a(e[1], '.js');
        if (this.executables && e.length < 3 && !this.defaultExecutable) {
          e.push('--help');
        }
        var t = this.parseOptions(this.normalize(e.slice(2)));
        var r = (this.args = t.args);
        var n = this.parseArgs(this.args, t.unknown);
        var u = n.args[0];
        var i = null;
        if (u) {
          i = this.commands.filter(function(e) {
            return e.alias() === u;
          })[0];
        }
        if (this._execs[u] && typeof this._execs[u] !== 'function') {
          return this.executeSubCommand(e, r, t.unknown);
        } else if (i) {
          r[0] = i._name;
          return this.executeSubCommand(e, r, t.unknown);
        } else if (this.defaultExecutable) {
          r.unshift(this.defaultExecutable);
          return this.executeSubCommand(e, r, t.unknown);
        }
        return n;
      };
      Command.prototype.executeSubCommand = function(e, t, r) {
        t = t.concat(r);
        if (!t.length) this.help();
        if (t[0] === 'help' && t.length === 1) this.help();
        if (t[0] === 'help') {
          t[0] = t[1];
          t[1] = '--help';
        }
        var n = e[1];
        var c = a(n, i.extname(n)) + '-' + t[0];
        var f;
        var l = s.realpathSync(n);
        f = o(l);
        var p = i.join(f, c);
        var h = false;
        if (exists(p + '.js')) {
          c = p + '.js';
          h = true;
        } else if (exists(p + '.ts')) {
          c = p + '.ts';
          h = true;
        } else if (exists(p)) {
          c = p;
        }
        t = t.slice(1);
        var d;
        if (process.platform !== 'win32') {
          if (h) {
            t.unshift(c);
            t = (process.execArgv || []).concat(t);
            d = u(process.argv[0], t, { stdio: 'inherit', customFds: [0, 1, 2] });
          } else {
            d = u(c, t, { stdio: 'inherit', customFds: [0, 1, 2] });
          }
        } else {
          t.unshift(c);
          d = u(process.execPath, t, { stdio: 'inherit' });
        }
        var y = ['SIGUSR1', 'SIGUSR2', 'SIGTERM', 'SIGINT', 'SIGHUP'];
        y.forEach(function(e) {
          process.on(e, function() {
            if (d.killed === false && d.exitCode === null) {
              d.kill(e);
            }
          });
        });
        d.on('close', process.exit.bind(process));
        d.on('error', function(e) {
          if (e.code === 'ENOENT') {
            console.error('error: %s(1) does not exist, try --help', c);
          } else if (e.code === 'EACCES') {
            console.error('error: %s(1) not executable. try chmod or run with root', c);
          }
          process.exit(1);
        });
        this.runningCommand = d;
      };
      Command.prototype.normalize = function(e) {
        var t = [],
          r,
          n,
          u;
        for (var i = 0, o = e.length; i < o; ++i) {
          r = e[i];
          if (i > 0) {
            n = this.optionFor(e[i - 1]);
          }
          if (r === '--') {
            t = t.concat(e.slice(i));
            break;
          } else if (n && n.required) {
            t.push(r);
          } else if (r.length > 1 && r[0] === '-' && r[1] !== '-') {
            r
              .slice(1)
              .split('')
              .forEach(function(e) {
                t.push('-' + e);
              });
          } else if (/^--/.test(r) && ~(u = r.indexOf('='))) {
            t.push(r.slice(0, u), r.slice(u + 1));
          } else {
            t.push(r);
          }
        }
        return t;
      };
      Command.prototype.parseArgs = function(e, t) {
        var r;
        if (e.length) {
          r = e[0];
          if (this.listeners('command:' + r).length) {
            this.emit('command:' + e.shift(), e, t);
          } else {
            this.emit('command:*', e);
          }
        } else {
          outputHelpIfNecessary(this, t);
          if (t.length > 0) {
            this.unknownOption(t[0]);
          }
          if (
            this.commands.length === 0 &&
            this._args.filter(function(e) {
              return e.required;
            }).length === 0
          ) {
            this.emit('command:*');
          }
        }
        return this;
      };
      Command.prototype.optionFor = function(e) {
        for (var t = 0, r = this.options.length; t < r; ++t) {
          if (this.options[t].is(e)) {
            return this.options[t];
          }
        }
      };
      Command.prototype.parseOptions = function(e) {
        var t = [],
          r = e.length,
          n,
          u,
          i;
        var o = [];
        for (var a = 0; a < r; ++a) {
          i = e[a];
          if (n) {
            t.push(i);
            continue;
          }
          if (i === '--') {
            n = true;
            continue;
          }
          u = this.optionFor(i);
          if (u) {
            if (u.required) {
              i = e[++a];
              if (i == null) return this.optionMissingArgument(u);
              this.emit('option:' + u.name(), i);
            } else if (u.optional) {
              i = e[a + 1];
              if (i == null || (i[0] === '-' && i !== '-')) {
                i = null;
              } else {
                ++a;
              }
              this.emit('option:' + u.name(), i);
            } else {
              this.emit('option:' + u.name());
            }
            continue;
          }
          if (i.length > 1 && i[0] === '-') {
            o.push(i);
            if (a + 1 < e.length && e[a + 1][0] !== '-') {
              o.push(e[++a]);
            }
            continue;
          }
          t.push(i);
        }
        return { args: t, unknown: o };
      };
      Command.prototype.opts = function() {
        var e = {},
          t = this.options.length;
        for (var r = 0; r < t; r++) {
          var n = this.options[r].attributeName();
          e[n] = n === this._versionOptionName ? this._version : this[n];
        }
        return e;
      };
      Command.prototype.missingArgument = function(e) {
        console.error("error: missing required argument `%s'", e);
        process.exit(1);
      };
      Command.prototype.optionMissingArgument = function(e, t) {
        if (t) {
          console.error("error: option `%s' argument missing, got `%s'", e.flags, t);
        } else {
          console.error("error: option `%s' argument missing", e.flags);
        }
        process.exit(1);
      };
      Command.prototype.unknownOption = function(e) {
        if (this._allowUnknownOption) return;
        console.error("error: unknown option `%s'", e);
        process.exit(1);
      };
      Command.prototype.variadicArgNotLast = function(e) {
        console.error("error: variadic arguments must be last `%s'", e);
        process.exit(1);
      };
      Command.prototype.version = function(e, t) {
        if (arguments.length === 0) return this._version;
        this._version = e;
        t = t || '-V, --version';
        var r = new Option(t, 'output the version number');
        this._versionOptionName = r.long.substr(2) || 'version';
        this.options.push(r);
        this.on('option:' + this._versionOptionName, function() {
          process.stdout.write(e + '\n');
          process.exit(0);
        });
        return this;
      };
      Command.prototype.description = function(e, t) {
        if (arguments.length === 0) return this._description;
        this._description = e;
        this._argsDescription = t;
        return this;
      };
      Command.prototype.alias = function(e) {
        var t = this;
        if (this.commands.length !== 0) {
          t = this.commands[this.commands.length - 1];
        }
        if (arguments.length === 0) return t._alias;
        if (e === t._name) throw new Error("Command alias can't be the same as its name");
        t._alias = e;
        return this;
      };
      Command.prototype.usage = function(e) {
        var t = this._args.map(function(e) {
          return humanReadableArgName(e);
        });
        var r =
          '[options]' +
          (this.commands.length ? ' [command]' : '') +
          (this._args.length ? ' ' + t.join(' ') : '');
        if (arguments.length === 0) return this._usage || r;
        this._usage = e;
        return this;
      };
      Command.prototype.name = function(e) {
        if (arguments.length === 0) return this._name;
        this._name = e;
        return this;
      };
      Command.prototype.prepareCommands = function() {
        return this.commands
          .filter(function(e) {
            return !e._noHelp;
          })
          .map(function(e) {
            var t = e._args
              .map(function(e) {
                return humanReadableArgName(e);
              })
              .join(' ');
            return [
              e._name +
                (e._alias ? '|' + e._alias : '') +
                (e.options.length ? ' [options]' : '') +
                (t ? ' ' + t : ''),
              e._description,
            ];
          });
      };
      Command.prototype.largestCommandLength = function() {
        var e = this.prepareCommands();
        return e.reduce(function(e, t) {
          return Math.max(e, t[0].length);
        }, 0);
      };
      Command.prototype.largestOptionLength = function() {
        var e = [].slice.call(this.options);
        e.push({ flags: '-h, --help' });
        return e.reduce(function(e, t) {
          return Math.max(e, t.flags.length);
        }, 0);
      };
      Command.prototype.largestArgLength = function() {
        return this._args.reduce(function(e, t) {
          return Math.max(e, t.name.length);
        }, 0);
      };
      Command.prototype.padWidth = function() {
        var e = this.largestOptionLength();
        if (this._argsDescription && this._args.length) {
          if (this.largestArgLength() > e) {
            e = this.largestArgLength();
          }
        }
        if (this.commands && this.commands.length) {
          if (this.largestCommandLength() > e) {
            e = this.largestCommandLength();
          }
        }
        return e;
      };
      Command.prototype.optionHelp = function() {
        var e = this.padWidth();
        return this.options
          .map(function(t) {
            return (
              pad(t.flags, e) +
              '  ' +
              t.description +
              (t.bool && t.defaultValue !== undefined
                ? ' (default: ' + JSON.stringify(t.defaultValue) + ')'
                : '')
            );
          })
          .concat([pad('-h, --help', e) + '  ' + 'output usage information'])
          .join('\n');
      };
      Command.prototype.commandHelp = function() {
        if (!this.commands.length) return '';
        var e = this.prepareCommands();
        var t = this.padWidth();
        return [
          'Commands:',
          e
            .map(function(e) {
              var r = e[1] ? '  ' + e[1] : '';
              return (r ? pad(e[0], t) : e[0]) + r;
            })
            .join('\n')
            .replace(/^/gm, '  '),
          '',
        ].join('\n');
      };
      Command.prototype.helpInformation = function() {
        var e = [];
        if (this._description) {
          e = [this._description, ''];
          var t = this._argsDescription;
          if (t && this._args.length) {
            var r = this.padWidth();
            e.push('Arguments:');
            e.push('');
            this._args.forEach(function(n) {
              e.push('  ' + pad(n.name, r) + '  ' + t[n.name]);
            });
            e.push('');
          }
        }
        var n = this._name;
        if (this._alias) {
          n = n + '|' + this._alias;
        }
        var u = ['Usage: ' + n + ' ' + this.usage(), ''];
        var i = [];
        var o = this.commandHelp();
        if (o) i = [o];
        var a = ['Options:', '' + this.optionHelp().replace(/^/gm, '  '), ''];
        return u
          .concat(e)
          .concat(a)
          .concat(i)
          .join('\n');
      };
      Command.prototype.outputHelp = function(e) {
        if (!e) {
          e = function(e) {
            return e;
          };
        }
        process.stdout.write(e(this.helpInformation()));
        this.emit('--help');
      };
      Command.prototype.help = function(e) {
        this.outputHelp(e);
        process.exit();
      };
      function camelcase(e) {
        return e.split('-').reduce(function(e, t) {
          return e + t[0].toUpperCase() + t.slice(1);
        });
      }
      function pad(e, t) {
        var r = Math.max(0, t - e.length);
        return e + Array(r + 1).join(' ');
      }
      function outputHelpIfNecessary(e, t) {
        t = t || [];
        for (var r = 0; r < t.length; r++) {
          if (t[r] === '--help' || t[r] === '-h') {
            e.outputHelp();
            process.exit(0);
          }
        }
      }
      function humanReadableArgName(e) {
        var t = e.name + (e.variadic === true ? '...' : '');
        return e.required ? '<' + t + '>' : '[' + t + ']';
      }
      function exists(e) {
        try {
          if (s.statSync(e).isFile()) {
            return true;
          }
        } catch (e) {
          return false;
        }
      }
    },
    ,
    ,
    ,
    ,
    ,
    function(e, t) {
      (function(r) {
        if (t && typeof t === 'object' && 'object' !== 'undefined') {
          e.exports = r();
        } else if (typeof define === 'function' && define.amd) {
          define([], r);
        } else if (typeof window !== 'undefined') {
          window.isWindows = r();
        } else if (typeof global !== 'undefined') {
          global.isWindows = r();
        } else if (typeof self !== 'undefined') {
          self.isWindows = r();
        } else {
          this.isWindows = r();
        }
      })(function() {
        'use strict';
        return function isWindows() {
          return (
            process && (process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE))
          );
        };
      });
    },
    ,
    ,
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n = r(785);
      e.exports = function Position(e, t) {
        this.start = e;
        this.end = { line: t.line, column: t.column };
        n(this, 'content', t.orig);
        n(this, 'source', t.options.source);
      };
    },
    ,
    function(e, t, r) {
      'use strict';
      const n = r(910);
      const u = {};
      n(u, r(778));
      n(u, r(267));
      n(u, r(620));
      n(u, r(983));
      n(u, r(363));
      n(u, r(420));
      n(u, r(217));
      n(u, r(79));
      n(u, r(409));
      n(u, r(909));
      n(u, r(772));
      n(u, r(917));
      e.exports = u;
    },
    ,
    ,
    function(e, t, r) {
      var n = r(311),
        u = r(540);
      var i = '[object AsyncFunction]',
        o = '[object Function]',
        a = '[object GeneratorFunction]',
        s = '[object Proxy]';
      function isFunction(e) {
        if (!u(e)) {
          return false;
        }
        var t = n(e);
        return t == o || t == a || t == i || t == s;
      }
      e.exports = isFunction;
    },
    ,
    ,
    ,
    ,
    ,
    function(e) {
      e.exports = ['SIGABRT', 'SIGALRM', 'SIGHUP', 'SIGINT', 'SIGTERM'];
      if (process.platform !== 'win32') {
        e.exports.push(
          'SIGVTALRM',
          'SIGXCPU',
          'SIGXFSZ',
          'SIGUSR2',
          'SIGTRAP',
          'SIGSYS',
          'SIGQUIT',
          'SIGIOT'
        );
      }
      if (process.platform === 'linux') {
        e.exports.push('SIGIO', 'SIGPOLL', 'SIGPWR', 'SIGSTKFLT', 'SIGUNUSED');
      }
    },
    ,
    ,
    ,
    ,
    ,
    ,
    function(e, t, r) {
      var n = r(786);
      function getMapData(e, t) {
        var r = e.__data__;
        return n(t) ? r[typeof t == 'string' ? 'string' : 'hash'] : r.map;
      }
      e.exports = getMapData;
    },
    function(e, t, r) {
      'use strict';
      var n = r(900);
      e.exports = function defineProperty(e, t, r) {
        if (typeof e !== 'object' && typeof e !== 'function') {
          throw new TypeError('expected an object or function.');
        }
        if (typeof t !== 'string') {
          throw new TypeError('expected `prop` to be a string.');
        }
        if (n(r) && ('set' in r || 'get' in r)) {
          return Object.defineProperty(e, t, r);
        }
        return Object.defineProperty(e, t, {
          configurable: true,
          enumerable: false,
          writable: true,
          value: r,
        });
      };
    },
    function(e, t, r) {
      'use strict';
      var n = r(747);
      var u = r(721);
      var i = r(622);
      var o = r(894);
      var a = (t.parse = function(e) {
        if (/^\s*{/.test(e)) return JSON.parse(o(e));
        return u.parse(e);
      });
      var s = (t.file = function() {
        var e = [].slice.call(arguments).filter(function(e) {
          return e != null;
        });
        for (var t in e) if ('string' !== typeof e[t]) return;
        var r = i.join.apply(null, e);
        var u;
        try {
          return n.readFileSync(r, 'utf-8');
        } catch (e) {
          return;
        }
      });
      var c = (t.json = function() {
        var e = s.apply(null, arguments);
        return e ? a(e) : null;
      });
      var f = (t.env = function(e, t) {
        t = t || process.env;
        var r = {};
        var n = e.length;
        for (var u in t) {
          if (u.toLowerCase().indexOf(e.toLowerCase()) === 0) {
            var i = u.substring(n).split('__');
            var o;
            while ((o = i.indexOf('')) > -1) {
              i.splice(o, 1);
            }
            var a = r;
            i.forEach(function _buildSubObj(e, r) {
              if (!e || typeof a !== 'object') return;
              if (r === i.length - 1) a[e] = t[u];
              if (a[e] === undefined) a[e] = {};
              a = a[e];
            });
          }
        }
        return r;
      });
      var l = (t.find = function() {
        var e = i.join.apply(null, [].slice.call(arguments));
        function find(e, t) {
          var r = i.join(e, t);
          try {
            n.statSync(r);
            return r;
          } catch (r) {
            if (i.dirname(e) !== e) return find(i.dirname(e), t);
          }
        }
        return find(process.cwd(), e);
      });
    },
    function(e, t, r) {
      'use strict';
      e.exports = { copySync: r(722) };
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(622);
      const u = r(983);
      const i = r(917).pathExists;
      const o = r(113);
      function outputJson(e, t, r, a) {
        if (typeof r === 'function') {
          a = r;
          r = {};
        }
        const s = n.dirname(e);
        i(s, (n, i) => {
          if (n) return a(n);
          if (i) return o.writeJson(e, t, r, a);
          u.mkdirs(s, n => {
            if (n) return a(n);
            o.writeJson(e, t, r, a);
          });
        });
      }
      e.exports = outputJson;
    },
    ,
    ,
    function(e, t, r) {
      e.exports = realpath;
      realpath.realpath = realpath;
      realpath.sync = realpathSync;
      realpath.realpathSync = realpathSync;
      realpath.monkeypatch = monkeypatch;
      realpath.unmonkeypatch = unmonkeypatch;
      var n = r(747);
      var u = n.realpath;
      var i = n.realpathSync;
      var o = process.version;
      var a = /^v[0-5]\./.test(o);
      var s = r(380);
      function newError(e) {
        return (
          e &&
          e.syscall === 'realpath' &&
          (e.code === 'ELOOP' || e.code === 'ENOMEM' || e.code === 'ENAMETOOLONG')
        );
      }
      function realpath(e, t, r) {
        if (a) {
          return u(e, t, r);
        }
        if (typeof t === 'function') {
          r = t;
          t = null;
        }
        u(e, t, function(n, u) {
          if (newError(n)) {
            s.realpath(e, t, r);
          } else {
            r(n, u);
          }
        });
      }
      function realpathSync(e, t) {
        if (a) {
          return i(e, t);
        }
        try {
          return i(e, t);
        } catch (r) {
          if (newError(r)) {
            return s.realpathSync(e, t);
          } else {
            throw r;
          }
        }
      }
      function monkeypatch() {
        n.realpath = realpath;
        n.realpathSync = realpathSync;
      }
      function unmonkeypatch() {
        n.realpath = u;
        n.realpathSync = i;
      }
    },
    ,
    function(e, t, r) {
      'use strict';
      var n = r(669);
      var u = r(204);
      var i = r(965);
      var o = r(545);
      var a = r(616);
      var s = r(469);
      var c = r(159);
      var f = 1024 * 64;
      function nanomatch(e, t, r) {
        t = c.arrayify(t);
        e = c.arrayify(e);
        var n = t.length;
        if (e.length === 0 || n === 0) {
          return [];
        }
        if (n === 1) {
          return nanomatch.match(e, t[0], r);
        }
        var u = false;
        var i = [];
        var o = [];
        var a = -1;
        while (++a < n) {
          var s = t[a];
          if (typeof s === 'string' && s.charCodeAt(0) === 33) {
            i.push.apply(i, nanomatch.match(e, s.slice(1), r));
            u = true;
          } else {
            o.push.apply(o, nanomatch.match(e, s, r));
          }
        }
        if (u && o.length === 0) {
          if (r && r.unixify === false) {
            o = e.slice();
          } else {
            var f = c.unixify(r);
            for (var l = 0; l < e.length; l++) {
              o.push(f(e[l]));
            }
          }
        }
        var p = c.diff(o, i);
        if (!r || r.nodupes !== false) {
          return c.unique(p);
        }
        return p;
      }
      nanomatch.match = function(e, t, r) {
        if (Array.isArray(t)) {
          throw new TypeError('expected pattern to be a string');
        }
        var n = c.unixify(r);
        var u = memoize('match', t, r, nanomatch.matcher);
        var i = [];
        e = c.arrayify(e);
        var o = e.length;
        var a = -1;
        while (++a < o) {
          var s = e[a];
          if (s === t || u(s)) {
            i.push(c.value(s, n, r));
          }
        }
        if (typeof r === 'undefined') {
          return c.unique(i);
        }
        if (i.length === 0) {
          if (r.failglob === true) {
            throw new Error('no matches found for "' + t + '"');
          }
          if (r.nonull === true || r.nullglob === true) {
            return [r.unescape ? c.unescape(t) : t];
          }
        }
        if (r.ignore) {
          i = nanomatch.not(i, r.ignore, r);
        }
        return r.nodupes !== false ? c.unique(i) : i;
      };
      nanomatch.isMatch = function(e, t, r) {
        if (typeof e !== 'string') {
          throw new TypeError('expected a string: "' + n.inspect(e) + '"');
        }
        if (c.isEmptyString(e) || c.isEmptyString(t)) {
          return false;
        }
        var u = c.equalsPattern(r);
        if (u(e)) {
          return true;
        }
        var i = memoize('isMatch', t, r, nanomatch.matcher);
        return i(e);
      };
      nanomatch.some = function(e, t, r) {
        if (typeof e === 'string') {
          e = [e];
        }
        for (var n = 0; n < e.length; n++) {
          if (nanomatch(e[n], t, r).length === 1) {
            return true;
          }
        }
        return false;
      };
      nanomatch.every = function(e, t, r) {
        if (typeof e === 'string') {
          e = [e];
        }
        for (var n = 0; n < e.length; n++) {
          if (nanomatch(e[n], t, r).length !== 1) {
            return false;
          }
        }
        return true;
      };
      nanomatch.any = function(e, t, r) {
        if (typeof e !== 'string') {
          throw new TypeError('expected a string: "' + n.inspect(e) + '"');
        }
        if (c.isEmptyString(e) || c.isEmptyString(t)) {
          return false;
        }
        if (typeof t === 'string') {
          t = [t];
        }
        for (var u = 0; u < t.length; u++) {
          if (nanomatch.isMatch(e, t[u], r)) {
            return true;
          }
        }
        return false;
      };
      nanomatch.all = function(e, t, r) {
        if (typeof e !== 'string') {
          throw new TypeError('expected a string: "' + n.inspect(e) + '"');
        }
        if (typeof t === 'string') {
          t = [t];
        }
        for (var u = 0; u < t.length; u++) {
          if (!nanomatch.isMatch(e, t[u], r)) {
            return false;
          }
        }
        return true;
      };
      nanomatch.not = function(e, t, r) {
        var n = i({}, r);
        var u = n.ignore;
        delete n.ignore;
        e = c.arrayify(e);
        var o = c.diff(e, nanomatch(e, t, n));
        if (u) {
          o = c.diff(o, nanomatch(e, u));
        }
        return n.nodupes !== false ? c.unique(o) : o;
      };
      nanomatch.contains = function(e, t, r) {
        if (typeof e !== 'string') {
          throw new TypeError('expected a string: "' + n.inspect(e) + '"');
        }
        if (typeof t === 'string') {
          if (c.isEmptyString(e) || c.isEmptyString(t)) {
            return false;
          }
          var u = c.equalsPattern(t, r);
          if (u(e)) {
            return true;
          }
          var o = c.containsPattern(t, r);
          if (o(e)) {
            return true;
          }
        }
        var a = i({}, r, { contains: true });
        return nanomatch.any(e, t, a);
      };
      nanomatch.matchBase = function(e, t) {
        if ((e && e.indexOf('/') !== -1) || !t) return false;
        return t.basename === true || t.matchBase === true;
      };
      nanomatch.matchKeys = function(e, t, r) {
        if (!c.isObject(e)) {
          throw new TypeError('expected the first argument to be an object');
        }
        var n = nanomatch(Object.keys(e), t, r);
        return c.pick(e, n);
      };
      nanomatch.matcher = function matcher(e, t) {
        if (c.isEmptyString(e)) {
          return function() {
            return false;
          };
        }
        if (Array.isArray(e)) {
          return compose(e, t, matcher);
        }
        if (e instanceof RegExp) {
          return test(e);
        }
        if (!c.isString(e)) {
          throw new TypeError('expected pattern to be an array, string or regex');
        }
        if (!c.hasSpecialChars(e)) {
          if (t && t.nocase === true) {
            e = e.toLowerCase();
          }
          return c.matchPath(e, t);
        }
        var r = nanomatch.makeRe(e, t);
        if (nanomatch.matchBase(e, t)) {
          return c.matchBasename(r, t);
        }
        function test(e) {
          var r = c.equalsPattern(t);
          var n = c.unixify(t);
          return function(t) {
            if (r(t)) {
              return true;
            }
            if (e.test(n(t))) {
              return true;
            }
            return false;
          };
        }
        var n = test(r);
        c.define(n, 'result', r.result);
        return n;
      };
      nanomatch.capture = function(e, t, r) {
        var n = nanomatch.makeRe(e, i({ capture: true }, r));
        var u = c.unixify(r);
        function match() {
          return function(e) {
            var t = n.exec(u(e));
            if (!t) {
              return null;
            }
            return t.slice(1);
          };
        }
        var o = memoize('capture', e, r, match);
        return o(t);
      };
      nanomatch.makeRe = function(e, t) {
        if (e instanceof RegExp) {
          return e;
        }
        if (typeof e !== 'string') {
          throw new TypeError('expected pattern to be a string');
        }
        if (e.length > f) {
          throw new Error('expected pattern to be less than ' + f + ' characters');
        }
        function makeRe() {
          var r = c.extend({ wrap: false }, t);
          var n = nanomatch.create(e, r);
          var i = u(n.output, r);
          c.define(i, 'result', n);
          return i;
        }
        return memoize('makeRe', e, t, makeRe);
      };
      nanomatch.create = function(e, t) {
        if (typeof e !== 'string') {
          throw new TypeError('expected a string');
        }
        function create() {
          return nanomatch.compile(nanomatch.parse(e, t), t);
        }
        return memoize('create', e, t, create);
      };
      nanomatch.parse = function(e, t) {
        if (typeof e !== 'string') {
          throw new TypeError('expected a string');
        }
        function parse() {
          var r = c.instantiate(null, t);
          a(r, t);
          var n = r.parse(e, t);
          c.define(n, 'snapdragon', r);
          n.input = e;
          return n;
        }
        return memoize('parse', e, t, parse);
      };
      nanomatch.compile = function(e, t) {
        if (typeof e === 'string') {
          e = nanomatch.parse(e, t);
        }
        function compile() {
          var r = c.instantiate(e, t);
          o(r, t);
          return r.compile(e, t);
        }
        return memoize('compile', e.input, t, compile);
      };
      nanomatch.clearCache = function() {
        nanomatch.cache.__data__ = {};
      };
      function compose(e, t, r) {
        var n;
        return memoize('compose', String(e), t, function() {
          return function(u) {
            if (!n) {
              n = [];
              for (var i = 0; i < e.length; i++) {
                n.push(r(e[i], t));
              }
            }
            var o = n.length;
            while (o--) {
              if (n[o](u) === true) {
                return true;
              }
            }
            return false;
          };
        });
      }
      function memoize(e, t, r, n) {
        var u = c.createKey(e + '=' + t, r);
        if (r && r.cache === false) {
          return n(t, r);
        }
        if (s.has(e, u)) {
          return s.get(e, u);
        }
        var i = n(t, r);
        s.set(e, u, i);
        return i;
      }
      nanomatch.compilers = o;
      nanomatch.parsers = a;
      nanomatch.cache = s;
      e.exports = nanomatch;
    },
    ,
    function(e) {
      if (true) {
        e.exports = Emitter;
      }
      function Emitter(e) {
        if (e) return mixin(e);
      }
      function mixin(e) {
        for (var t in Emitter.prototype) {
          e[t] = Emitter.prototype[t];
        }
        return e;
      }
      Emitter.prototype.on = Emitter.prototype.addEventListener = function(e, t) {
        this._callbacks = this._callbacks || {};
        (this._callbacks['$' + e] = this._callbacks['$' + e] || []).push(t);
        return this;
      };
      Emitter.prototype.once = function(e, t) {
        function on() {
          this.off(e, on);
          t.apply(this, arguments);
        }
        on.fn = t;
        this.on(e, on);
        return this;
      };
      Emitter.prototype.off = Emitter.prototype.removeListener = Emitter.prototype.removeAllListeners = Emitter.prototype.removeEventListener = function(
        e,
        t
      ) {
        this._callbacks = this._callbacks || {};
        if (0 == arguments.length) {
          this._callbacks = {};
          return this;
        }
        var r = this._callbacks['$' + e];
        if (!r) return this;
        if (1 == arguments.length) {
          delete this._callbacks['$' + e];
          return this;
        }
        var n;
        for (var u = 0; u < r.length; u++) {
          n = r[u];
          if (n === t || n.fn === t) {
            r.splice(u, 1);
            break;
          }
        }
        return this;
      };
      Emitter.prototype.emit = function(e) {
        this._callbacks = this._callbacks || {};
        var t = [].slice.call(arguments, 1),
          r = this._callbacks['$' + e];
        if (r) {
          r = r.slice(0);
          for (var n = 0, u = r.length; n < u; ++n) {
            r[n].apply(this, t);
          }
        }
        return this;
      };
      Emitter.prototype.listeners = function(e) {
        this._callbacks = this._callbacks || {};
        return this._callbacks['$' + e] || [];
      };
      Emitter.prototype.hasListeners = function(e) {
        return !!this.listeners(e).length;
      };
    },
    ,
    ,
    ,
    function(e) {
      'use strict';
      function atob(e) {
        return Buffer.from(e, 'base64').toString('binary');
      }
      e.exports = atob.atob = atob;
    },
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(729);
      const u = r(622);
      const i = r(357);
      const o = process.platform === 'win32';
      function defaults(e) {
        const t = ['unlink', 'chmod', 'stat', 'lstat', 'rmdir', 'readdir'];
        t.forEach(t => {
          e[t] = e[t] || n[t];
          t = t + 'Sync';
          e[t] = e[t] || n[t];
        });
        e.maxBusyTries = e.maxBusyTries || 3;
      }
      function rimraf(e, t, r) {
        let n = 0;
        if (typeof t === 'function') {
          r = t;
          t = {};
        }
        i(e, 'rimraf: missing path');
        i.strictEqual(typeof e, 'string', 'rimraf: path should be a string');
        i.strictEqual(typeof r, 'function', 'rimraf: callback function required');
        i(t, 'rimraf: invalid options argument provided');
        i.strictEqual(typeof t, 'object', 'rimraf: options should be object');
        defaults(t);
        rimraf_(e, t, function CB(u) {
          if (u) {
            if (
              (u.code === 'EBUSY' || u.code === 'ENOTEMPTY' || u.code === 'EPERM') &&
              n < t.maxBusyTries
            ) {
              n++;
              const r = n * 100;
              return setTimeout(() => rimraf_(e, t, CB), r);
            }
            if (u.code === 'ENOENT') u = null;
          }
          r(u);
        });
      }
      function rimraf_(e, t, r) {
        i(e);
        i(t);
        i(typeof r === 'function');
        t.lstat(e, (n, u) => {
          if (n && n.code === 'ENOENT') {
            return r(null);
          }
          if (n && n.code === 'EPERM' && o) {
            return fixWinEPERM(e, t, n, r);
          }
          if (u && u.isDirectory()) {
            return rmdir(e, t, n, r);
          }
          t.unlink(e, n => {
            if (n) {
              if (n.code === 'ENOENT') {
                return r(null);
              }
              if (n.code === 'EPERM') {
                return o ? fixWinEPERM(e, t, n, r) : rmdir(e, t, n, r);
              }
              if (n.code === 'EISDIR') {
                return rmdir(e, t, n, r);
              }
            }
            return r(n);
          });
        });
      }
      function fixWinEPERM(e, t, r, n) {
        i(e);
        i(t);
        i(typeof n === 'function');
        if (r) {
          i(r instanceof Error);
        }
        t.chmod(e, 438, u => {
          if (u) {
            n(u.code === 'ENOENT' ? null : r);
          } else {
            t.stat(e, (u, i) => {
              if (u) {
                n(u.code === 'ENOENT' ? null : r);
              } else if (i.isDirectory()) {
                rmdir(e, t, r, n);
              } else {
                t.unlink(e, n);
              }
            });
          }
        });
      }
      function fixWinEPERMSync(e, t, r) {
        let n;
        i(e);
        i(t);
        if (r) {
          i(r instanceof Error);
        }
        try {
          t.chmodSync(e, 438);
        } catch (e) {
          if (e.code === 'ENOENT') {
            return;
          } else {
            throw r;
          }
        }
        try {
          n = t.statSync(e);
        } catch (e) {
          if (e.code === 'ENOENT') {
            return;
          } else {
            throw r;
          }
        }
        if (n.isDirectory()) {
          rmdirSync(e, t, r);
        } else {
          t.unlinkSync(e);
        }
      }
      function rmdir(e, t, r, n) {
        i(e);
        i(t);
        if (r) {
          i(r instanceof Error);
        }
        i(typeof n === 'function');
        t.rmdir(e, u => {
          if (u && (u.code === 'ENOTEMPTY' || u.code === 'EEXIST' || u.code === 'EPERM')) {
            rmkids(e, t, n);
          } else if (u && u.code === 'ENOTDIR') {
            n(r);
          } else {
            n(u);
          }
        });
      }
      function rmkids(e, t, r) {
        i(e);
        i(t);
        i(typeof r === 'function');
        t.readdir(e, (n, i) => {
          if (n) return r(n);
          let o = i.length;
          let a;
          if (o === 0) return t.rmdir(e, r);
          i.forEach(n => {
            rimraf(u.join(e, n), t, n => {
              if (a) {
                return;
              }
              if (n) return r((a = n));
              if (--o === 0) {
                t.rmdir(e, r);
              }
            });
          });
        });
      }
      function rimrafSync(e, t) {
        let r;
        t = t || {};
        defaults(t);
        i(e, 'rimraf: missing path');
        i.strictEqual(typeof e, 'string', 'rimraf: path should be a string');
        i(t, 'rimraf: missing options');
        i.strictEqual(typeof t, 'object', 'rimraf: options should be object');
        try {
          r = t.lstatSync(e);
        } catch (r) {
          if (r.code === 'ENOENT') {
            return;
          }
          if (r.code === 'EPERM' && o) {
            fixWinEPERMSync(e, t, r);
          }
        }
        try {
          if (r && r.isDirectory()) {
            rmdirSync(e, t, null);
          } else {
            t.unlinkSync(e);
          }
        } catch (r) {
          if (r.code === 'ENOENT') {
            return;
          } else if (r.code === 'EPERM') {
            return o ? fixWinEPERMSync(e, t, r) : rmdirSync(e, t, r);
          } else if (r.code !== 'EISDIR') {
            throw r;
          }
          rmdirSync(e, t, r);
        }
      }
      function rmdirSync(e, t, r) {
        i(e);
        i(t);
        if (r) {
          i(r instanceof Error);
        }
        try {
          t.rmdirSync(e);
        } catch (n) {
          if (n.code === 'ENOTDIR') {
            throw r;
          } else if (n.code === 'ENOTEMPTY' || n.code === 'EEXIST' || n.code === 'EPERM') {
            rmkidsSync(e, t);
          } else if (n.code !== 'ENOENT') {
            throw n;
          }
        }
      }
      function rmkidsSync(e, t) {
        i(e);
        i(t);
        t.readdirSync(e).forEach(r => rimrafSync(u.join(e, r), t));
        if (o) {
          const r = Date.now();
          do {
            try {
              const r = t.rmdirSync(e, t);
              return r;
            } catch (e) {}
          } while (Date.now() - r < 500);
        } else {
          const r = t.rmdirSync(e, t);
          return r;
        }
      }
      e.exports = rimraf;
      rimraf.sync = rimrafSync;
    },
    ,
    function(e, t, r) {
      'use strict';
      var n = r(507);
      var u = { get: 'function', set: 'function', configurable: 'boolean', enumerable: 'boolean' };
      function isAccessorDescriptor(e, t) {
        if (typeof t === 'string') {
          var r = Object.getOwnPropertyDescriptor(e, t);
          return typeof r !== 'undefined';
        }
        if (n(e) !== 'object') {
          return false;
        }
        if (has(e, 'value') || has(e, 'writable')) {
          return false;
        }
        if (!has(e, 'get') || typeof e.get !== 'function') {
          return false;
        }
        if (has(e, 'set') && typeof e[i] !== 'function' && typeof e[i] !== 'undefined') {
          return false;
        }
        for (var i in e) {
          if (!u.hasOwnProperty(i)) {
            continue;
          }
          if (n(e[i]) === u[i]) {
            continue;
          }
          if (typeof e[i] !== 'undefined') {
            return false;
          }
        }
        return true;
      }
      function has(e, t) {
        return {}.hasOwnProperty.call(e, t);
      }
      e.exports = isAccessorDescriptor;
    },
    ,
    function(e) {
      'use strict';
      e.exports = balanced;
      function balanced(e, t, r) {
        if (e instanceof RegExp) e = maybeMatch(e, r);
        if (t instanceof RegExp) t = maybeMatch(t, r);
        var n = range(e, t, r);
        return (
          n && {
            start: n[0],
            end: n[1],
            pre: r.slice(0, n[0]),
            body: r.slice(n[0] + e.length, n[1]),
            post: r.slice(n[1] + t.length),
          }
        );
      }
      function maybeMatch(e, t) {
        var r = t.match(e);
        return r ? r[0] : null;
      }
      balanced.range = range;
      function range(e, t, r) {
        var n, u, i, o, a;
        var s = r.indexOf(e);
        var c = r.indexOf(t, s + 1);
        var f = s;
        if (s >= 0 && c > 0) {
          n = [];
          i = r.length;
          while (f >= 0 && !a) {
            if (f == s) {
              n.push(f);
              s = r.indexOf(e, f + 1);
            } else if (n.length == 1) {
              a = [n.pop(), c];
            } else {
              u = n.pop();
              if (u < i) {
                i = u;
                o = c;
              }
              c = r.indexOf(t, f + 1);
            }
            f = s < c && s >= 0 ? s : c;
          }
          if (n.length) {
            a = [i, o];
          }
        }
        return a;
      }
    },
    function(e, t, r) {
      'use strict';
      var n = r(755);
      e.exports = function isExtendable(e) {
        return n(e) || typeof e === 'function' || Array.isArray(e);
      };
    },
    function(e, t, r) {
      'use strict';
      const n = r(729);
      const u = r(87);
      const i = r(622);
      function hasMillisResSync() {
        let e = i.join(
          'millis-test-sync' +
            Date.now().toString() +
            Math.random()
              .toString()
              .slice(2)
        );
        e = i.join(u.tmpdir(), e);
        const t = new Date(1435410243862);
        n.writeFileSync(e, 'https://github.com/jprichardson/node-fs-extra/pull/141');
        const r = n.openSync(e, 'r+');
        n.futimesSync(r, t, t);
        n.closeSync(r);
        return n.statSync(e).mtime > 1435410243e3;
      }
      function hasMillisRes(e) {
        let t = i.join(
          'millis-test' +
            Date.now().toString() +
            Math.random()
              .toString()
              .slice(2)
        );
        t = i.join(u.tmpdir(), t);
        const r = new Date(1435410243862);
        n.writeFile(t, 'https://github.com/jprichardson/node-fs-extra/pull/141', u => {
          if (u) return e(u);
          n.open(t, 'r+', (u, i) => {
            if (u) return e(u);
            n.futimes(i, r, r, r => {
              if (r) return e(r);
              n.close(i, r => {
                if (r) return e(r);
                n.stat(t, (t, r) => {
                  if (t) return e(t);
                  e(null, r.mtime > 1435410243e3);
                });
              });
            });
          });
        });
      }
      function timeRemoveMillis(e) {
        if (typeof e === 'number') {
          return Math.floor(e / 1e3) * 1e3;
        } else if (e instanceof Date) {
          return new Date(Math.floor(e.getTime() / 1e3) * 1e3);
        } else {
          throw new Error('fs-extra: timeRemoveMillis() unknown parameter type');
        }
      }
      function utimesMillis(e, t, r, u) {
        n.open(e, 'r+', (e, i) => {
          if (e) return u(e);
          n.futimes(i, t, r, e => {
            n.close(i, t => {
              if (u) u(e || t);
            });
          });
        });
      }
      e.exports = {
        hasMillisRes: hasMillisRes,
        hasMillisResSync: hasMillisResSync,
        timeRemoveMillis: timeRemoveMillis,
        utimesMillis: utimesMillis,
      };
    },
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(729);
      const u = r(622);
      const i = r(146).invalidWin32Path;
      const o = parseInt('0777', 8);
      function mkdirs(e, t, r, a) {
        if (typeof t === 'function') {
          r = t;
          t = {};
        } else if (!t || typeof t !== 'object') {
          t = { mode: t };
        }
        if (process.platform === 'win32' && i(e)) {
          const t = new Error(e + ' contains invalid WIN32 path characters.');
          t.code = 'EINVAL';
          return r(t);
        }
        let s = t.mode;
        const c = t.fs || n;
        if (s === undefined) {
          s = o & ~process.umask();
        }
        if (!a) a = null;
        r = r || function() {};
        e = u.resolve(e);
        c.mkdir(e, s, n => {
          if (!n) {
            a = a || e;
            return r(null, a);
          }
          switch (n.code) {
            case 'ENOENT':
              if (u.dirname(e) === e) return r(n);
              mkdirs(u.dirname(e), t, (n, u) => {
                if (n) r(n, u);
                else mkdirs(e, t, r, u);
              });
              break;
            default:
              c.stat(e, (e, t) => {
                if (e || !t.isDirectory()) r(n, a);
                else r(null, a);
              });
              break;
          }
        });
      }
      e.exports = mkdirs;
    },
    ,
    ,
    function(e) {
      e.exports = require('events');
    },
    function(e) {
      var t = 9007199254740991;
      function isLength(e) {
        return typeof e == 'number' && e > -1 && e % 1 == 0 && e <= t;
      }
      e.exports = isLength;
    },
    function(e, t, r) {
      'use strict';
      var n = r(844);
      var u = r(204);
      var i;
      var o = '[\\[!*+?$^"\'.\\\\/]+';
      var a = createTextRegex(o);
      e.exports = function(e, t) {
        var r = e.parser;
        var n = r.options;
        r.state = { slashes: 0, paths: [] };
        r.ast.state = r.state;
        r
          .capture('prefix', function() {
            if (this.parsed) return;
            var e = this.match(/^\.[\\\/]/);
            if (!e) return;
            this.state.strictOpen = !!this.options.strictOpen;
            this.state.addPrefix = true;
          })
          .capture('escape', function() {
            if (this.isInside('bracket')) return;
            var e = this.position();
            var t = this.match(/^(?:\\(.)|([$^]))/);
            if (!t) return;
            return e({ type: 'escape', val: t[2] || t[1] });
          })
          .capture('quoted', function() {
            var e = this.position();
            var t = this.match(/^["']/);
            if (!t) return;
            var r = t[0];
            if (this.input.indexOf(r) === -1) {
              return e({ type: 'escape', val: r });
            }
            var n = advanceTo(this.input, r);
            this.consume(n.len);
            return e({ type: 'quoted', val: n.esc });
          })
          .capture('not', function() {
            var e = this.parsed;
            var t = this.position();
            var r = this.match(this.notRegex || /^!+/);
            if (!r) return;
            var n = r[0];
            var u = n.length % 2 === 1;
            if (e === '' && !u) {
              n = '';
            }
            if (e === '' && u && this.options.nonegate !== true) {
              this.bos.val = '(?!^(?:';
              this.append = ')$).*';
              n = '';
            }
            return t({ type: 'not', val: n });
          })
          .capture('dot', function() {
            var e = this.parsed;
            var t = this.position();
            var r = this.match(/^\.+/);
            if (!r) return;
            var n = r[0];
            this.state.dot = n === '.' && (e === '' || e.slice(-1) === '/');
            return t({ type: 'dot', dotfiles: this.state.dot, val: n });
          })
          .capture('plus', /^\+(?!\()/)
          .capture('qmark', function() {
            var e = this.parsed;
            var t = this.position();
            var r = this.match(/^\?+(?!\()/);
            if (!r) return;
            this.state.metachar = true;
            this.state.qmark = true;
            return t({ type: 'qmark', parsed: e, val: r[0] });
          })
          .capture('globstar', function() {
            var e = this.parsed;
            var t = this.position();
            var r = this.match(/^\*{2}(?![*(])(?=[,)\/]|$)/);
            if (!r) return;
            var u = n.noglobstar !== true ? 'globstar' : 'star';
            var i = t({ type: u, parsed: e });
            this.state.metachar = true;
            while (this.input.slice(0, 4) === '/**/') {
              this.input = this.input.slice(3);
            }
            i.isInside = { brace: this.isInside('brace'), paren: this.isInside('paren') };
            if (u === 'globstar') {
              this.state.globstar = true;
              i.val = '**';
            } else {
              this.state.star = true;
              i.val = '*';
            }
            return i;
          })
          .capture('star', function() {
            var e = this.position();
            var t = /^(?:\*(?![*(])|[*]{3,}(?!\()|[*]{2}(?![(\/]|$)|\*(?=\*\())/;
            var r = this.match(t);
            if (!r) return;
            this.state.metachar = true;
            this.state.star = true;
            return e({ type: 'star', val: r[0] });
          })
          .capture('slash', function() {
            var e = this.position();
            var t = this.match(/^\//);
            if (!t) return;
            this.state.slashes++;
            return e({ type: 'slash', val: t[0] });
          })
          .capture('backslash', function() {
            var e = this.position();
            var t = this.match(/^\\(?![*+?(){}[\]'"])/);
            if (!t) return;
            var r = t[0];
            if (this.isInside('bracket')) {
              r = '\\';
            } else if (r.length > 1) {
              r = '\\\\';
            }
            return e({ type: 'backslash', val: r });
          })
          .capture('square', function() {
            if (this.isInside('bracket')) return;
            var e = this.position();
            var t = this.match(/^\[([^!^\\])\]/);
            if (!t) return;
            return e({ type: 'square', val: t[1] });
          })
          .capture('bracket', function() {
            var e = this.position();
            var t = this.match(/^(?:\[([!^]?)([^\]]+|\]-)(\]|[^*+?]+)|\[)/);
            if (!t) return;
            var r = t[0];
            var n = t[1] ? '^' : '';
            var u = (t[2] || '').replace(/\\\\+/, '\\\\');
            var i = t[3] || '';
            if (t[2] && u.length < t[2].length) {
              r = r.replace(/\\\\+/, '\\\\');
            }
            var o = this.input.slice(0, 2);
            if (u === '' && o === '\\]') {
              u += o;
              this.consume(2);
              var a = this.input;
              var s = -1;
              var c;
              while ((c = a[++s])) {
                this.consume(1);
                if (c === ']') {
                  i = c;
                  break;
                }
                u += c;
              }
            }
            return e({
              type: 'bracket',
              val: r,
              escaped: i !== ']',
              negated: n,
              inner: u,
              close: i,
            });
          })
          .capture('text', function() {
            if (this.isInside('bracket')) return;
            var e = this.position();
            var t = this.match(a);
            if (!t || !t[0]) return;
            return e({ type: 'text', val: t[0] });
          });
        if (t && typeof t.parsers === 'function') {
          t.parsers(e.parser);
        }
      };
      function advanceTo(e, t) {
        var r = e.charAt(0);
        var n = { len: 1, val: '', esc: '' };
        var u = 0;
        function advance() {
          if (r !== '\\') {
            n.esc += '\\' + r;
            n.val += r;
          }
          r = e.charAt(++u);
          n.len++;
          if (r === '\\') {
            advance();
            advance();
          }
        }
        while (r && r !== t) {
          advance();
        }
        return n;
      }
      function createTextRegex(e) {
        if (i) return i;
        var t = { contains: true, strictClose: false };
        var r = n.create(e, t);
        var o = u('^(?:[*]\\((?=.)|' + r + ')', t);
        return (i = o);
      }
      e.exports.not = o;
    },
    ,
    function(e) {
      var t = Object.prototype.toString;
      e.exports = function kindOf(e) {
        if (e === void 0) return 'undefined';
        if (e === null) return 'null';
        var r = typeof e;
        if (r === 'boolean') return 'boolean';
        if (r === 'string') return 'string';
        if (r === 'number') return 'number';
        if (r === 'symbol') return 'symbol';
        if (r === 'function') {
          return isGeneratorFn(e) ? 'generatorfunction' : 'function';
        }
        if (isArray(e)) return 'array';
        if (isBuffer(e)) return 'buffer';
        if (isArguments(e)) return 'arguments';
        if (isDate(e)) return 'date';
        if (isError(e)) return 'error';
        if (isRegexp(e)) return 'regexp';
        switch (ctorName(e)) {
          case 'Symbol':
            return 'symbol';
          case 'Promise':
            return 'promise';
          case 'WeakMap':
            return 'weakmap';
          case 'WeakSet':
            return 'weakset';
          case 'Map':
            return 'map';
          case 'Set':
            return 'set';
          case 'Int8Array':
            return 'int8array';
          case 'Uint8Array':
            return 'uint8array';
          case 'Uint8ClampedArray':
            return 'uint8clampedarray';
          case 'Int16Array':
            return 'int16array';
          case 'Uint16Array':
            return 'uint16array';
          case 'Int32Array':
            return 'int32array';
          case 'Uint32Array':
            return 'uint32array';
          case 'Float32Array':
            return 'float32array';
          case 'Float64Array':
            return 'float64array';
        }
        if (isGeneratorObj(e)) {
          return 'generator';
        }
        r = t.call(e);
        switch (r) {
          case '[object Object]':
            return 'object';
          case '[object Map Iterator]':
            return 'mapiterator';
          case '[object Set Iterator]':
            return 'setiterator';
          case '[object String Iterator]':
            return 'stringiterator';
          case '[object Array Iterator]':
            return 'arrayiterator';
        }
        return r
          .slice(8, -1)
          .toLowerCase()
          .replace(/\s/g, '');
      };
      function ctorName(e) {
        return e.constructor ? e.constructor.name : null;
      }
      function isArray(e) {
        if (Array.isArray) return Array.isArray(e);
        return e instanceof Array;
      }
      function isError(e) {
        return (
          e instanceof Error ||
          (typeof e.message === 'string' &&
            e.constructor &&
            typeof e.constructor.stackTraceLimit === 'number')
        );
      }
      function isDate(e) {
        if (e instanceof Date) return true;
        return (
          typeof e.toDateString === 'function' &&
          typeof e.getDate === 'function' &&
          typeof e.setDate === 'function'
        );
      }
      function isRegexp(e) {
        if (e instanceof RegExp) return true;
        return (
          typeof e.flags === 'string' &&
          typeof e.ignoreCase === 'boolean' &&
          typeof e.multiline === 'boolean' &&
          typeof e.global === 'boolean'
        );
      }
      function isGeneratorFn(e, t) {
        return ctorName(e) === 'GeneratorFunction';
      }
      function isGeneratorObj(e) {
        return (
          typeof e.throw === 'function' &&
          typeof e.return === 'function' &&
          typeof e.next === 'function'
        );
      }
      function isArguments(e) {
        try {
          if (typeof e.length === 'number' && typeof e.callee === 'function') {
            return true;
          }
        } catch (e) {
          if (e.message.indexOf('callee') !== -1) {
            return true;
          }
        }
        return false;
      }
      function isBuffer(e) {
        if (e.constructor && typeof e.constructor.isBuffer === 'function') {
          return e.constructor.isBuffer(e);
        }
        return false;
      }
    },
    function(e) {
      e.exports = require('constants');
    },
    function(e, t, r) {
      e.exports = { copySync: r(806) };
    },
    ,
    function(e) {
      e.exports = require('path');
    },
    function(e) {
      function hashDelete(e) {
        var t = this.has(e) && delete this.__data__[e];
        this.size -= t ? 1 : 0;
        return t;
      }
      e.exports = hashDelete;
    },
    function(e) {
      'use strict';
      e.exports = function(e) {
        return flat(e, []);
      };
      function flat(e, t) {
        var r = 0,
          n;
        var u = e.length;
        for (; r < u; r++) {
          n = e[r];
          Array.isArray(n) ? flat(n, t) : t.push(n);
        }
        return t;
      }
    },
    function(e, t, r) {
      'use strict';
      var n = r(192);
      var u = r(156);
      var i = r(204);
      var o = r(790);
      var a = r(457);
      var s = r(434);
      var c = r(861);
      var f = 1024 * 64;
      function extglob(e, t) {
        return extglob.create(e, t).output;
      }
      extglob.match = function(e, t, r) {
        if (typeof t !== 'string') {
          throw new TypeError('expected pattern to be a string');
        }
        e = c.arrayify(e);
        var n = extglob.matcher(t, r);
        var i = e.length;
        var o = -1;
        var a = [];
        while (++o < i) {
          var s = e[o];
          if (n(s)) {
            a.push(s);
          }
        }
        if (typeof r === 'undefined') {
          return u(a);
        }
        if (a.length === 0) {
          if (r.failglob === true) {
            throw new Error('no matches found for "' + t + '"');
          }
          if (r.nonull === true || r.nullglob === true) {
            return [t.split('\\').join('')];
          }
        }
        return r.nodupes !== false ? u(a) : a;
      };
      extglob.isMatch = function(e, t, r) {
        if (typeof t !== 'string') {
          throw new TypeError('expected pattern to be a string');
        }
        if (typeof e !== 'string') {
          throw new TypeError('expected a string');
        }
        if (t === e) {
          return true;
        }
        if (t === '' || t === ' ' || t === '.') {
          return t === e;
        }
        var n = c.memoize('isMatch', t, r, extglob.matcher);
        return n(e);
      };
      extglob.contains = function(e, t, r) {
        if (typeof e !== 'string') {
          throw new TypeError('expected a string');
        }
        if (t === '' || t === ' ' || t === '.') {
          return t === e;
        }
        var u = n({}, r, { contains: true });
        u.strictClose = false;
        u.strictOpen = false;
        return extglob.isMatch(e, t, u);
      };
      extglob.matcher = function(e, t) {
        if (typeof e !== 'string') {
          throw new TypeError('expected pattern to be a string');
        }
        function matcher() {
          var r = extglob.makeRe(e, t);
          return function(e) {
            return r.test(e);
          };
        }
        return c.memoize('matcher', e, t, matcher);
      };
      extglob.create = function(e, t) {
        if (typeof e !== 'string') {
          throw new TypeError('expected pattern to be a string');
        }
        function create() {
          var r = new s(t);
          var n = r.parse(e, t);
          return r.compile(n, t);
        }
        return c.memoize('create', e, t, create);
      };
      extglob.capture = function(e, t, r) {
        var u = extglob.makeRe(e, n({ capture: true }, r));
        function match() {
          return function(e) {
            var t = u.exec(e);
            if (!t) {
              return null;
            }
            return t.slice(1);
          };
        }
        var i = c.memoize('capture', e, r, match);
        return i(t);
      };
      extglob.makeRe = function(e, t) {
        if (e instanceof RegExp) {
          return e;
        }
        if (typeof e !== 'string') {
          throw new TypeError('expected pattern to be a string');
        }
        if (e.length > f) {
          throw new Error('expected pattern to be less than ' + f + ' characters');
        }
        function makeRe() {
          var r = n({ strictErrors: false }, t);
          if (r.strictErrors === true) r.strict = true;
          var u = extglob.create(e, r);
          return i(u.output, r);
        }
        var r = c.memoize('makeRe', e, t, makeRe);
        if (r.source.length > f) {
          throw new SyntaxError('potentially malicious regex detected');
        }
        return r;
      };
      extglob.cache = c.cache;
      extglob.clearCache = function() {
        extglob.cache.__data__ = {};
      };
      extglob.Extglob = s;
      extglob.compilers = o;
      extglob.parsers = a;
      e.exports = extglob;
    },
    function(e, t, r) {
      'use strict';
      var n = r(58);
      var u = r(60);
      var i =
        typeof Reflect !== 'undefined' && Reflect.defineProperty
          ? Reflect.defineProperty
          : Object.defineProperty;
      e.exports = function defineProperty(e, t, r) {
        if (!n(e) && typeof e !== 'function' && !Array.isArray(e)) {
          throw new TypeError('expected an object, function, or array');
        }
        if (typeof t !== 'string') {
          throw new TypeError('expected "key" to be a string');
        }
        if (u(r)) {
          i(e, t, r);
          return e;
        }
        i(e, t, { configurable: true, enumerable: false, writable: true, value: r });
        return e;
      };
    },
    ,
    ,
    ,
    ,
    function(e) {
      e.exports = require('net');
    },
    function(e, t, r) {
      'use strict';
      var n = r(747);
      var u = r(622);
      var i = r(785);
      var o = r(324);
      e.exports = mixin;
      function mixin(e) {
        i(e, '_comment', e.comment);
        e.map = new o.SourceMap.SourceMapGenerator();
        e.position = { line: 1, column: 1 };
        e.content = {};
        e.files = {};
        for (var r in t) {
          i(e, r, t[r]);
        }
      }
      t.updatePosition = function(e) {
        var t = e.match(/\n/g);
        if (t) this.position.line += t.length;
        var r = e.lastIndexOf('\n');
        this.position.column = ~r ? e.length - r : this.position.column + e.length;
      };
      t.emit = function(e, t) {
        var r = t.position || {};
        var n = r.source;
        if (n) {
          if (r.filepath) {
            n = o.unixify(r.filepath);
          }
          this.map.addMapping({
            source: n,
            generated: { line: this.position.line, column: Math.max(this.position.column - 1, 0) },
            original: { line: r.start.line, column: r.start.column - 1 },
          });
          if (r.content) {
            this.addContent(n, r);
          }
          if (r.filepath) {
            this.addFile(n, r);
          }
          this.updatePosition(e);
          this.output += e;
        }
        return e;
      };
      t.addFile = function(e, t) {
        if (typeof t.content !== 'string') return;
        if (Object.prototype.hasOwnProperty.call(this.files, e)) return;
        this.files[e] = t.content;
      };
      t.addContent = function(e, t) {
        if (typeof t.content !== 'string') return;
        if (Object.prototype.hasOwnProperty.call(this.content, e)) return;
        this.map.setSourceContent(e, t.content);
      };
      t.applySourceMaps = function() {
        Object.keys(this.files).forEach(function(e) {
          var t = this.files[e];
          this.map.setSourceContent(e, t);
          if (this.options.inputSourcemaps === true) {
            var r = o.sourceMapResolve.resolveSync(t, e, n.readFileSync);
            if (r) {
              var i = new o.SourceMap.SourceMapConsumer(r.map);
              var a = r.sourcesRelativeTo;
              this.map.applySourceMap(i, e, o.unixify(u.dirname(a)));
            }
          }
        }, this);
      };
      t.comment = function(e) {
        if (/^# sourceMappingURL=/.test(e.comment)) {
          return this.emit('', e.position);
        }
        return this._comment(e);
      };
    },
    ,
    ,
    ,
    ,
    function(e) {
      if (typeof Object.create === 'function') {
        e.exports = function inherits(e, t) {
          e.super_ = t;
          e.prototype = Object.create(t.prototype, {
            constructor: { value: e, enumerable: false, writable: true, configurable: true },
          });
        };
      } else {
        e.exports = function inherits(e, t) {
          e.super_ = t;
          var r = function() {};
          r.prototype = t.prototype;
          e.prototype = new r();
          e.prototype.constructor = e;
        };
      }
    },
    ,
    ,
    ,
    function(e, t, r) {
      var n = r(352);
      var u = r(191);
      var i = '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^ ?';
      var o = { 0: 0, t: 9, n: 10, v: 11, f: 12, r: 13 };
      t.strToChars = function(e) {
        var t = /(\[\\b\])|(\\)?\\(?:u([A-F0-9]{4})|x([A-F0-9]{2})|(0?[0-7]{2})|c([@A-Z\[\\\]\^?])|([0tnvfr]))/g;
        e = e.replace(t, function(e, t, r, n, u, a, s, c) {
          if (r) {
            return e;
          }
          var f = t
            ? 8
            : n
              ? parseInt(n, 16)
              : u ? parseInt(u, 16) : a ? parseInt(a, 8) : s ? i.indexOf(s) : o[c];
          var l = String.fromCharCode(f);
          if (/[\[\]{}\^$.|?*+()]/.test(l)) {
            l = '\\' + l;
          }
          return l;
        });
        return e;
      };
      t.tokenizeClass = function(e, r) {
        var i = [];
        var o = /\\(?:(w)|(d)|(s)|(W)|(D)|(S))|((?:(?:\\)(.)|([^\]\\]))-(?:\\)?([^\]]))|(\])|(?:\\)?(.)/g;
        var a, s;
        while ((a = o.exec(e)) != null) {
          if (a[1]) {
            i.push(u.words());
          } else if (a[2]) {
            i.push(u.ints());
          } else if (a[3]) {
            i.push(u.whitespace());
          } else if (a[4]) {
            i.push(u.notWords());
          } else if (a[5]) {
            i.push(u.notInts());
          } else if (a[6]) {
            i.push(u.notWhitespace());
          } else if (a[7]) {
            i.push({ type: n.RANGE, from: (a[8] || a[9]).charCodeAt(0), to: a[10].charCodeAt(0) });
          } else if ((s = a[12])) {
            i.push({ type: n.CHAR, value: s.charCodeAt(0) });
          } else {
            return [i, o.lastIndex];
          }
        }
        t.error(r, 'Unterminated character class');
      };
      t.error = function(e, t) {
        throw new SyntaxError('Invalid regular expression: /' + e + '/: ' + t);
      };
    },
    ,
    ,
    ,
    function(e) {
      e.exports = function(e) {
        if (typeof Buffer.allocUnsafe === 'function') {
          try {
            return Buffer.allocUnsafe(e);
          } catch (t) {
            return new Buffer(e);
          }
        }
        return new Buffer(e);
      };
    },
    ,
    function(e) {
      'use strict';
      e.exports = function base(e, t) {
        if (!isObject(e) && typeof e !== 'function') {
          throw new TypeError('expected an object or function');
        }
        var r = isObject(t) ? t : {};
        var n = typeof r.prop === 'string' ? r.prop : 'fns';
        if (!Array.isArray(e[n])) {
          define(e, n, []);
        }
        define(e, 'use', use);
        define(e, 'run', function(t) {
          if (!isObject(t)) return;
          if (!t.use || !t.run) {
            define(t, n, t[n] || []);
            define(t, 'use', use);
          }
          if (!t[n] || t[n].indexOf(base) === -1) {
            t.use(base);
          }
          var r = this || e;
          var u = r[n];
          var i = u.length;
          var o = -1;
          while (++o < i) {
            t.use(u[o]);
          }
          return t;
        });
        function use(t, u, i) {
          var o = 1;
          if (typeof t === 'string' || Array.isArray(t)) {
            u = wrap(t, u);
            o++;
          } else {
            i = u;
            u = t;
          }
          if (typeof u !== 'function') {
            throw new TypeError('expected a function');
          }
          var a = this || e;
          var s = a[n];
          var c = [].slice.call(arguments, o);
          c.unshift(a);
          if (typeof r.hook === 'function') {
            r.hook.apply(a, c);
          }
          var f = u.apply(a, c);
          if (typeof f === 'function' && s.indexOf(f) === -1) {
            s.push(f);
          }
          return a;
        }
        function wrap(e, t) {
          return function plugin() {
            return this.type === e ? t.apply(this, arguments) : plugin;
          };
        }
        return e;
      };
      function isObject(e) {
        return e && typeof e === 'object' && !Array.isArray(e);
      }
      function define(e, t, r) {
        Object.defineProperty(e, t, { configurable: true, writable: true, value: r });
      }
    },
    ,
    function(e, t, r) {
      e.exports = glob;
      var n = r(747);
      var u = r(589);
      var i = r(904);
      var o = i.Minimatch;
      var a = r(536);
      var s = r(614).EventEmitter;
      var c = r(622);
      var f = r(357);
      var l = r(912);
      var p = r(433);
      var h = r(215);
      var d = h.alphasort;
      var y = h.alphasorti;
      var v = h.setopts;
      var D = h.ownProp;
      var m = r(346);
      var A = r(669);
      var g = h.childrenIgnored;
      var E = h.isIgnored;
      var C = r(538);
      function glob(e, t, r) {
        if (typeof t === 'function') (r = t), (t = {});
        if (!t) t = {};
        if (t.sync) {
          if (r) throw new TypeError('callback provided to sync glob');
          return p(e, t);
        }
        return new Glob(e, t, r);
      }
      glob.sync = p;
      var F = (glob.GlobSync = p.GlobSync);
      glob.glob = glob;
      function extend(e, t) {
        if (t === null || typeof t !== 'object') {
          return e;
        }
        var r = Object.keys(t);
        var n = r.length;
        while (n--) {
          e[r[n]] = t[r[n]];
        }
        return e;
      }
      glob.hasMagic = function(e, t) {
        var r = extend({}, t);
        r.noprocess = true;
        var n = new Glob(e, r);
        var u = n.minimatch.set;
        if (!e) return false;
        if (u.length > 1) return true;
        for (var i = 0; i < u[0].length; i++) {
          if (typeof u[0][i] !== 'string') return true;
        }
        return false;
      };
      glob.Glob = Glob;
      a(Glob, s);
      function Glob(e, t, r) {
        if (typeof t === 'function') {
          r = t;
          t = null;
        }
        if (t && t.sync) {
          if (r) throw new TypeError('callback provided to sync glob');
          return new F(e, t);
        }
        if (!(this instanceof Glob)) return new Glob(e, t, r);
        v(this, e, t);
        this._didRealPath = false;
        var n = this.minimatch.set.length;
        this.matches = new Array(n);
        if (typeof r === 'function') {
          r = C(r);
          this.on('error', r);
          this.on('end', function(e) {
            r(null, e);
          });
        }
        var u = this;
        this._processing = 0;
        this._emitQueue = [];
        this._processQueue = [];
        this.paused = false;
        if (this.noprocess) return this;
        if (n === 0) return done();
        var i = true;
        for (var o = 0; o < n; o++) {
          this._process(this.minimatch.set[o], o, false, done);
        }
        i = false;
        function done() {
          --u._processing;
          if (u._processing <= 0) {
            if (i) {
              process.nextTick(function() {
                u._finish();
              });
            } else {
              u._finish();
            }
          }
        }
      }
      Glob.prototype._finish = function() {
        f(this instanceof Glob);
        if (this.aborted) return;
        if (this.realpath && !this._didRealpath) return this._realpath();
        h.finish(this);
        this.emit('end', this.found);
      };
      Glob.prototype._realpath = function() {
        if (this._didRealpath) return;
        this._didRealpath = true;
        var e = this.matches.length;
        if (e === 0) return this._finish();
        var t = this;
        for (var r = 0; r < this.matches.length; r++) this._realpathSet(r, next);
        function next() {
          if (--e === 0) t._finish();
        }
      };
      Glob.prototype._realpathSet = function(e, t) {
        var r = this.matches[e];
        if (!r) return t();
        var n = Object.keys(r);
        var i = this;
        var o = n.length;
        if (o === 0) return t();
        var a = (this.matches[e] = Object.create(null));
        n.forEach(function(r, n) {
          r = i._makeAbs(r);
          u.realpath(r, i.realpathCache, function(n, u) {
            if (!n) a[u] = true;
            else if (n.syscall === 'stat') a[r] = true;
            else i.emit('error', n);
            if (--o === 0) {
              i.matches[e] = a;
              t();
            }
          });
        });
      };
      Glob.prototype._mark = function(e) {
        return h.mark(this, e);
      };
      Glob.prototype._makeAbs = function(e) {
        return h.makeAbs(this, e);
      };
      Glob.prototype.abort = function() {
        this.aborted = true;
        this.emit('abort');
      };
      Glob.prototype.pause = function() {
        if (!this.paused) {
          this.paused = true;
          this.emit('pause');
        }
      };
      Glob.prototype.resume = function() {
        if (this.paused) {
          this.emit('resume');
          this.paused = false;
          if (this._emitQueue.length) {
            var e = this._emitQueue.slice(0);
            this._emitQueue.length = 0;
            for (var t = 0; t < e.length; t++) {
              var r = e[t];
              this._emitMatch(r[0], r[1]);
            }
          }
          if (this._processQueue.length) {
            var n = this._processQueue.slice(0);
            this._processQueue.length = 0;
            for (var t = 0; t < n.length; t++) {
              var u = n[t];
              this._processing--;
              this._process(u[0], u[1], u[2], u[3]);
            }
          }
        }
      };
      Glob.prototype._process = function(e, t, r, n) {
        f(this instanceof Glob);
        f(typeof n === 'function');
        if (this.aborted) return;
        this._processing++;
        if (this.paused) {
          this._processQueue.push([e, t, r, n]);
          return;
        }
        var u = 0;
        while (typeof e[u] === 'string') {
          u++;
        }
        var o;
        switch (u) {
          case e.length:
            this._processSimple(e.join('/'), t, n);
            return;
          case 0:
            o = null;
            break;
          default:
            o = e.slice(0, u).join('/');
            break;
        }
        var a = e.slice(u);
        var s;
        if (o === null) s = '.';
        else if (l(o) || l(e.join('/'))) {
          if (!o || !l(o)) o = '/' + o;
          s = o;
        } else s = o;
        var c = this._makeAbs(s);
        if (g(this, s)) return n();
        var p = a[0] === i.GLOBSTAR;
        if (p) this._processGlobStar(o, s, c, a, t, r, n);
        else this._processReaddir(o, s, c, a, t, r, n);
      };
      Glob.prototype._processReaddir = function(e, t, r, n, u, i, o) {
        var a = this;
        this._readdir(r, i, function(s, c) {
          return a._processReaddir2(e, t, r, n, u, i, c, o);
        });
      };
      Glob.prototype._processReaddir2 = function(e, t, r, n, u, i, o, a) {
        if (!o) return a();
        var s = n[0];
        var f = !!this.minimatch.negate;
        var l = s._glob;
        var p = this.dot || l.charAt(0) === '.';
        var h = [];
        for (var d = 0; d < o.length; d++) {
          var y = o[d];
          if (y.charAt(0) !== '.' || p) {
            var v;
            if (f && !e) {
              v = !y.match(s);
            } else {
              v = y.match(s);
            }
            if (v) h.push(y);
          }
        }
        var D = h.length;
        if (D === 0) return a();
        if (n.length === 1 && !this.mark && !this.stat) {
          if (!this.matches[u]) this.matches[u] = Object.create(null);
          for (var d = 0; d < D; d++) {
            var y = h[d];
            if (e) {
              if (e !== '/') y = e + '/' + y;
              else y = e + y;
            }
            if (y.charAt(0) === '/' && !this.nomount) {
              y = c.join(this.root, y);
            }
            this._emitMatch(u, y);
          }
          return a();
        }
        n.shift();
        for (var d = 0; d < D; d++) {
          var y = h[d];
          var m;
          if (e) {
            if (e !== '/') y = e + '/' + y;
            else y = e + y;
          }
          this._process([y].concat(n), u, i, a);
        }
        a();
      };
      Glob.prototype._emitMatch = function(e, t) {
        if (this.aborted) return;
        if (E(this, t)) return;
        if (this.paused) {
          this._emitQueue.push([e, t]);
          return;
        }
        var r = l(t) ? t : this._makeAbs(t);
        if (this.mark) t = this._mark(t);
        if (this.absolute) t = r;
        if (this.matches[e][t]) return;
        if (this.nodir) {
          var n = this.cache[r];
          if (n === 'DIR' || Array.isArray(n)) return;
        }
        this.matches[e][t] = true;
        var u = this.statCache[r];
        if (u) this.emit('stat', t, u);
        this.emit('match', t);
      };
      Glob.prototype._readdirInGlobStar = function(e, t) {
        if (this.aborted) return;
        if (this.follow) return this._readdir(e, false, t);
        var r = 'lstat\0' + e;
        var u = this;
        var i = m(r, lstatcb_);
        if (i) n.lstat(e, i);
        function lstatcb_(r, n) {
          if (r && r.code === 'ENOENT') return t();
          var i = n && n.isSymbolicLink();
          u.symlinks[e] = i;
          if (!i && n && !n.isDirectory()) {
            u.cache[e] = 'FILE';
            t();
          } else u._readdir(e, false, t);
        }
      };
      Glob.prototype._readdir = function(e, t, r) {
        if (this.aborted) return;
        r = m('readdir\0' + e + '\0' + t, r);
        if (!r) return;
        if (t && !D(this.symlinks, e)) return this._readdirInGlobStar(e, r);
        if (D(this.cache, e)) {
          var u = this.cache[e];
          if (!u || u === 'FILE') return r();
          if (Array.isArray(u)) return r(null, u);
        }
        var i = this;
        n.readdir(e, readdirCb(this, e, r));
      };
      function readdirCb(e, t, r) {
        return function(n, u) {
          if (n) e._readdirError(t, n, r);
          else e._readdirEntries(t, u, r);
        };
      }
      Glob.prototype._readdirEntries = function(e, t, r) {
        if (this.aborted) return;
        if (!this.mark && !this.stat) {
          for (var n = 0; n < t.length; n++) {
            var u = t[n];
            if (e === '/') u = e + u;
            else u = e + '/' + u;
            this.cache[u] = true;
          }
        }
        this.cache[e] = t;
        return r(null, t);
      };
      Glob.prototype._readdirError = function(e, t, r) {
        if (this.aborted) return;
        switch (t.code) {
          case 'ENOTSUP':
          case 'ENOTDIR':
            var n = this._makeAbs(e);
            this.cache[n] = 'FILE';
            if (n === this.cwdAbs) {
              var u = new Error(t.code + ' invalid cwd ' + this.cwd);
              u.path = this.cwd;
              u.code = t.code;
              this.emit('error', u);
              this.abort();
            }
            break;
          case 'ENOENT':
          case 'ELOOP':
          case 'ENAMETOOLONG':
          case 'UNKNOWN':
            this.cache[this._makeAbs(e)] = false;
            break;
          default:
            this.cache[this._makeAbs(e)] = false;
            if (this.strict) {
              this.emit('error', t);
              this.abort();
            }
            if (!this.silent) console.error('glob error', t);
            break;
        }
        return r();
      };
      Glob.prototype._processGlobStar = function(e, t, r, n, u, i, o) {
        var a = this;
        this._readdir(r, i, function(s, c) {
          a._processGlobStar2(e, t, r, n, u, i, c, o);
        });
      };
      Glob.prototype._processGlobStar2 = function(e, t, r, n, u, i, o, a) {
        if (!o) return a();
        var s = n.slice(1);
        var c = e ? [e] : [];
        var f = c.concat(s);
        this._process(f, u, false, a);
        var l = this.symlinks[r];
        var p = o.length;
        if (l && i) return a();
        for (var h = 0; h < p; h++) {
          var d = o[h];
          if (d.charAt(0) === '.' && !this.dot) continue;
          var y = c.concat(o[h], s);
          this._process(y, u, true, a);
          var v = c.concat(o[h], n);
          this._process(v, u, true, a);
        }
        a();
      };
      Glob.prototype._processSimple = function(e, t, r) {
        var n = this;
        this._stat(e, function(u, i) {
          n._processSimple2(e, t, u, i, r);
        });
      };
      Glob.prototype._processSimple2 = function(e, t, r, n, u) {
        if (!this.matches[t]) this.matches[t] = Object.create(null);
        if (!n) return u();
        if (e && l(e) && !this.nomount) {
          var i = /[\/\\]$/.test(e);
          if (e.charAt(0) === '/') {
            e = c.join(this.root, e);
          } else {
            e = c.resolve(this.root, e);
            if (i) e += '/';
          }
        }
        if (process.platform === 'win32') e = e.replace(/\\/g, '/');
        this._emitMatch(t, e);
        u();
      };
      Glob.prototype._stat = function(e, t) {
        var r = this._makeAbs(e);
        var u = e.slice(-1) === '/';
        if (e.length > this.maxLength) return t();
        if (!this.stat && D(this.cache, r)) {
          var i = this.cache[r];
          if (Array.isArray(i)) i = 'DIR';
          if (!u || i === 'DIR') return t(null, i);
          if (u && i === 'FILE') return t();
        }
        var o;
        var a = this.statCache[r];
        if (a !== undefined) {
          if (a === false) return t(null, a);
          else {
            var s = a.isDirectory() ? 'DIR' : 'FILE';
            if (u && s === 'FILE') return t();
            else return t(null, s, a);
          }
        }
        var c = this;
        var f = m('stat\0' + r, lstatcb_);
        if (f) n.lstat(r, f);
        function lstatcb_(u, i) {
          if (i && i.isSymbolicLink()) {
            return n.stat(r, function(n, u) {
              if (n) c._stat2(e, r, null, i, t);
              else c._stat2(e, r, n, u, t);
            });
          } else {
            c._stat2(e, r, u, i, t);
          }
        }
      };
      Glob.prototype._stat2 = function(e, t, r, n, u) {
        if (r && (r.code === 'ENOENT' || r.code === 'ENOTDIR')) {
          this.statCache[t] = false;
          return u();
        }
        var i = e.slice(-1) === '/';
        this.statCache[t] = n;
        if (t.slice(-1) === '/' && n && !n.isDirectory()) return u(null, false, n);
        var o = true;
        if (n) o = n.isDirectory() ? 'DIR' : 'FILE';
        this.cache[t] = this.cache[t] || o;
        if (i && o === 'FILE') return u();
        return u(null, o, n);
      };
    },
    ,
    ,
    ,
    ,
    function(e) {
      'use strict';
      function isSpecificValue(e) {
        return e instanceof Buffer || e instanceof Date || e instanceof RegExp ? true : false;
      }
      function cloneSpecificValue(e) {
        if (e instanceof Buffer) {
          var t = Buffer.alloc ? Buffer.alloc(e.length) : new Buffer(e.length);
          e.copy(t);
          return t;
        } else if (e instanceof Date) {
          return new Date(e.getTime());
        } else if (e instanceof RegExp) {
          return new RegExp(e);
        } else {
          throw new Error('Unexpected situation');
        }
      }
      function deepCloneArray(e) {
        var r = [];
        e.forEach(function(e, n) {
          if (typeof e === 'object' && e !== null) {
            if (Array.isArray(e)) {
              r[n] = deepCloneArray(e);
            } else if (isSpecificValue(e)) {
              r[n] = cloneSpecificValue(e);
            } else {
              r[n] = t({}, e);
            }
          } else {
            r[n] = e;
          }
        });
        return r;
      }
      function safeGetProperty(e, t) {
        return t === '__proto__' ? undefined : e[t];
      }
      var t = (e.exports = function() {
        if (arguments.length < 1 || typeof arguments[0] !== 'object') {
          return false;
        }
        if (arguments.length < 2) {
          return arguments[0];
        }
        var e = arguments[0];
        var r = Array.prototype.slice.call(arguments, 1);
        var n, u, i;
        r.forEach(function(r) {
          if (typeof r !== 'object' || r === null || Array.isArray(r)) {
            return;
          }
          Object.keys(r).forEach(function(i) {
            u = safeGetProperty(e, i);
            n = safeGetProperty(r, i);
            if (n === e) {
              return;
            } else if (typeof n !== 'object' || n === null) {
              e[i] = n;
              return;
            } else if (Array.isArray(n)) {
              e[i] = deepCloneArray(n);
              return;
            } else if (isSpecificValue(n)) {
              e[i] = cloneSpecificValue(n);
              return;
            } else if (typeof u !== 'object' || u === null || Array.isArray(u)) {
              e[i] = t({}, n);
              return;
            } else {
              e[i] = t(u, n);
              return;
            }
          });
        });
        return e;
      });
    },
    function(e, t, r) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var n = r(42);
      var u = _interopRequireDefault(n);
      var i = r(7);
      var o = _interopRequireDefault(i);
      function _interopRequireDefault(e) {
        return e && e.__esModule ? e : { default: e };
      }
      t.default = { parse: u.default, stringify: o.default };
      e.exports = t['default'];
    },
    ,
    ,
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n = r(755);
      e.exports = function isExtendable(e) {
        return n(e) || typeof e === 'function' || Array.isArray(e);
      };
    },
    ,
    function(e, t, r) {
      'use strict';
      const n = r(622);
      const u = r(729);
      const i = r(780).pathExists;
      function symlinkPaths(e, t, r) {
        if (n.isAbsolute(e)) {
          return u.lstat(e, t => {
            if (t) {
              t.message = t.message.replace('lstat', 'ensureSymlink');
              return r(t);
            }
            return r(null, { toCwd: e, toDst: e });
          });
        } else {
          const o = n.dirname(t);
          const a = n.join(o, e);
          return i(a, (t, i) => {
            if (t) return r(t);
            if (i) {
              return r(null, { toCwd: a, toDst: e });
            } else {
              return u.lstat(e, t => {
                if (t) {
                  t.message = t.message.replace('lstat', 'ensureSymlink');
                  return r(t);
                }
                return r(null, { toCwd: e, toDst: n.relative(o, e) });
              });
            }
          });
        }
      }
      function symlinkPathsSync(e, t) {
        let r;
        if (n.isAbsolute(e)) {
          r = u.existsSync(e);
          if (!r) throw new Error('absolute srcpath does not exist');
          return { toCwd: e, toDst: e };
        } else {
          const i = n.dirname(t);
          const o = n.join(i, e);
          r = u.existsSync(o);
          if (r) {
            return { toCwd: o, toDst: e };
          } else {
            r = u.existsSync(e);
            if (!r) throw new Error('relative srcpath does not exist');
            return { toCwd: e, toDst: n.relative(i, e) };
          }
        }
      }
      e.exports = { symlinkPaths: symlinkPaths, symlinkPathsSync: symlinkPathsSync };
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(729);
      const u = r(622);
      const i = r(146).invalidWin32Path;
      const o = parseInt('0777', 8);
      function mkdirsSync(e, t, r) {
        if (!t || typeof t !== 'object') {
          t = { mode: t };
        }
        let a = t.mode;
        const s = t.fs || n;
        if (process.platform === 'win32' && i(e)) {
          const t = new Error(e + ' contains invalid WIN32 path characters.');
          t.code = 'EINVAL';
          throw t;
        }
        if (a === undefined) {
          a = o & ~process.umask();
        }
        if (!r) r = null;
        e = u.resolve(e);
        try {
          s.mkdirSync(e, a);
          r = r || e;
        } catch (n) {
          switch (n.code) {
            case 'ENOENT':
              if (u.dirname(e) === e) throw n;
              r = mkdirsSync(u.dirname(e), t, r);
              mkdirsSync(e, t, r);
              break;
            default:
              let i;
              try {
                i = s.statSync(e);
              } catch (e) {
                throw n;
              }
              if (!i.isDirectory()) throw n;
              break;
          }
        }
        return r;
      }
      e.exports = mkdirsSync;
    },
    ,
    ,
    function(e) {
      e.exports = require('util');
    },
    ,
    function(e, t, r) {
      'use strict';
      var n = r(60);
      e.exports = function defineProperty(e, t, r) {
        if (typeof e !== 'object' && typeof e !== 'function') {
          throw new TypeError('expected an object or function.');
        }
        if (typeof t !== 'string') {
          throw new TypeError('expected `prop` to be a string.');
        }
        if (n(r) && ('set' in r || 'get' in r)) {
          return Object.defineProperty(e, t, r);
        }
        return Object.defineProperty(e, t, {
          configurable: true,
          enumerable: false,
          writable: true,
          value: r,
        });
      };
    },
    ,
    function(e, t, r) {
      'use strict';
      var n =
        (this && this.__awaiter) ||
        function(e, t, r, n) {
          return new (r || (r = Promise))(function(u, i) {
            function fulfilled(e) {
              try {
                step(n.next(e));
              } catch (e) {
                i(e);
              }
            }
            function rejected(e) {
              try {
                step(n['throw'](e));
              } catch (e) {
                i(e);
              }
            }
            function step(e) {
              e.done
                ? u(e.value)
                : new r(function(t) {
                    t(e.value);
                  }).then(fulfilled, rejected);
            }
            step((n = n.apply(e, t || [])).next());
          });
        };
      function __export(e) {
        for (var r in e) if (!t.hasOwnProperty(r)) t[r] = e[r];
      }
      var u =
        (this && this.__importDefault) ||
        function(e) {
          return e && e.__esModule ? e : { default: e };
        };
      Object.defineProperty(t, '__esModule', { value: true });
      const i = u(r(676));
      const o = u(r(770));
      const a = u(r(816));
      const s = u(r(622));
      const c = u(r(230));
      const f = r(947);
      const l = 'app.json';
      const p =
        'width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1.00001,viewport-fit=cover';
      const h = `root`;
      const d = `web-build`;
      const y = `en`;
      const v = `Oh no! It looks like JavaScript is not enabled in your browser.`;
      const D = 'Expo App';
      const m = '#4630EB';
      const A = 'A Neat Expo App';
      const g = '#ffffff';
      const E = '.';
      const C = 'standalone';
      const F = 'black-translucent';
      const b = 'auto';
      const S = 'any';
      const w = [192, 512];
      const B = 12;
      const x = true;
      function isUsingYarn(e) {
        const t = o.default(e);
        if (t) {
          return a.default.existsSync(s.default.join(t, 'yarn.lock'));
        } else {
          return a.default.existsSync(s.default.join(e, 'yarn.lock'));
        }
      }
      t.isUsingYarn = isUsingYarn;
      function fileExistsAsync(e) {
        return n(this, void 0, void 0, function*() {
          try {
            return (yield a.default.stat(e)).isFile();
          } catch (e) {
            return false;
          }
        });
      }
      t.fileExistsAsync = fileExistsAsync;
      function fileExists(e) {
        try {
          return a.default.statSync(e).isFile();
        } catch (e) {
          return false;
        }
      }
      t.fileExists = fileExists;
      function findConfigFile(e) {
        let t;
        if (O[e]) {
          t = O[e];
        } else {
          t = s.default.join(e, l);
        }
        return { configPath: t, configName: l, configNamespace: 'expo' };
      }
      t.findConfigFile = findConfigFile;
      function configFilename(e) {
        return findConfigFile(e).configName;
      }
      t.configFilename = configFilename;
      function readExpRcAsync(e) {
        return n(this, void 0, void 0, function*() {
          const t = s.default.join(e, '.exprc');
          return yield i.default.readAsync(t, { json5: true, cantReadFileDefault: {} });
        });
      }
      t.readExpRcAsync = readExpRcAsync;
      const O = {};
      function setCustomConfigPath(e, t) {
        O[e] = t;
      }
      t.setCustomConfigPath = setCustomConfigPath;
      function createEnvironmentConstants(e, t) {
        let r;
        try {
          r = i.default.read(t);
        } catch (e) {
          r = {};
        }
        return Object.assign({}, e, {
          name: e.displayName || e.name,
          facebookScheme: undefined,
          facebookAppId: undefined,
          facebookDisplayName: undefined,
          ios: undefined,
          android: undefined,
          web: r,
        });
      }
      t.createEnvironmentConstants = createEnvironmentConstants;
      function sanitizePublicPath(e) {
        if (typeof e !== 'string' || !e.length) {
          return '/';
        }
        if (e.endsWith('/')) {
          return e;
        }
        return e + '/';
      }
      function getConfigForPWA(e, t, r) {
        const { exp: n } = readConfigJson(e, true, true);
        return ensurePWAConfig(n, t, r);
      }
      t.getConfigForPWA = getConfigForPWA;
      function getNameFromConfig(e = {}) {
        const t = e.expo || e;
        const { web: r = {} } = t;
        const n = e.displayName || t.displayName || t.name || D;
        const u = r.name || n;
        return { appName: n, webName: u };
      }
      t.getNameFromConfig = getNameFromConfig;
      function validateShortName(e) {
        return n(this, void 0, void 0, function*() {
          if (e.length > B) {
            console.warn(
              `PWA short name should be 12 characters or less, otherwise it'll be curtailed on the mobile device homepage. You should define web.shortName in your ${l} as a string that is ${B} or less characters.`
            );
          }
        });
      }
      t.validateShortName = validateShortName;
      function ensurePWAorientation(e) {
        if (e && typeof e === 'string') {
          let t = e.toLowerCase();
          if (t !== 'default') {
            return t;
          }
        }
        return S;
      }
      function getWebManifestFromConfig(e = {}) {
        const t = e.expo || e || {};
        return t.web || {};
      }
      function getWebOutputPath(e = {}) {
        if (process.env.WEBPACK_BUILD_OUTPUT_PATH) {
          return process.env.WEBPACK_BUILD_OUTPUT_PATH;
        }
        const t = getWebManifestFromConfig(e);
        const { build: r = {} } = t;
        return r.output || d;
      }
      t.getWebOutputPath = getWebOutputPath;
      function applyWebDefaults(e) {
        const t = e.expo || e || {};
        const { web: r = {}, splash: n = {}, ios: u = {}, android: i = {} } = t;
        const { build: o = {}, webDangerous: a = {}, meta: s = {} } = r;
        const { apple: c = {} } = s;
        const { appName: f, webName: l } = getNameFromConfig(e);
        const d = r.lang || y;
        const D = a.noJavaScriptMessage || v;
        const S = o.rootId || h;
        const w = getWebOutputPath(e);
        const B = sanitizePublicPath(r.publicPath);
        const O = t.primaryColor || m;
        const _ = t.description || A;
        const j = r.themeColor || O;
        const k = r.dir || b;
        const M = r.shortName || l;
        const P = r.display || C;
        const R = r.startUrl || E;
        const N = s.viewport || p;
        const { scope: I, crossorigin: T } = r;
        const L = c.barStyle || r.barStyle || F;
        const $ = ensurePWAorientation(r.orientation || t.orientation);
        const G = r.backgroundColor || n.backgroundColor || g;
        const W = r.preferRelatedApplications || x;
        const z = inferWebRelatedApplicationsFromConfig(t);
        return Object.assign({}, t, {
          name: f,
          description: _,
          primaryColor: O,
          ios: Object.assign({}, u),
          android: Object.assign({}, i),
          web: Object.assign({}, r, {
            meta: Object.assign({}, s, {
              apple: Object.assign({}, c, {
                formatDetection: c.formatDetection || 'telephone=no',
                mobileWebAppCapable: c.mobileWebAppCapable || 'yes',
                touchFullscreen: c.touchFullscreen || 'yes',
                barStyle: L,
              }),
              viewport: N,
            }),
            build: Object.assign({}, o, { output: w, rootId: S, publicPath: B }),
            dangerous: Object.assign({}, a, { noJavaScriptMessage: D }),
            scope: I,
            crossorigin: T,
            description: _,
            preferRelatedApplications: W,
            relatedApplications: z,
            startUrl: R,
            shortName: M,
            display: P,
            orientation: $,
            dir: k,
            barStyle: L,
            backgroundColor: G,
            themeColor: j,
            lang: d,
            name: l,
          }),
        });
      }
      function inferWebRelatedApplicationsFromConfig({
        web: e = {},
        ios: t = {},
        android: r = {},
      }) {
        const n = e.relatedApplications || [];
        const { bundleIdentifier: u, appStoreUrl: i } = t;
        if (u) {
          const e = 'itunes';
          let t = n.some(({ platform: t }) => t === e);
          if (!t) {
            n.push({ platform: e, url: i, id: u });
          }
        }
        const { package: o, playStoreUrl: a } = r;
        if (o) {
          const e = 'play';
          const t = n.some(({ platform: t }) => t === e);
          if (!t) {
            n.push({
              platform: e,
              url: a || `http://play.google.com/store/apps/details?id=${o}`,
              id: o,
            });
          }
        }
        return n;
      }
      function inferWebHomescreenIcons(e = {}, t, r) {
        const { web: n = {}, ios: u = {} } = e;
        if (Array.isArray(n.icons)) {
          return n.icons;
        }
        let i = [];
        let o;
        if (n.icon || e.icon) {
          o = t(n.icon || e.icon);
        } else {
          o = r.templateIcon;
        }
        const a = `apple/icons`;
        i.push({ src: o, size: w, destination: a });
        const s = e.icon || u.icon;
        if (s) {
          const e = t(s);
          i.push({ ios: true, sizes: 180, src: e, destination: a });
        }
        return i;
      }
      function inferWebStartupImages(e, t, r) {
        const { icon: n, web: u = {}, splash: i = {}, primaryColor: o } = e;
        if (Array.isArray(u.startupImages)) {
          return u.startupImages;
        }
        const { splash: a = {} } = u;
        let s = [];
        let c;
        const f = a.image || i.image || n;
        if (f) {
          const e = a.resizeMode || i.resizeMode || 'contain';
          const r = a.backgroundColor || i.backgroundColor || o || '#ffffff';
          c = t(f);
          s.push({
            resizeMode: e,
            color: r,
            src: c,
            supportsTablet: a.supportsTablet === undefined ? true : a.supportsTablet,
            orientation: u.orientation,
            destination: `apple/splash`,
          });
        }
        return s;
      }
      function ensurePWAConfig(e, t, r) {
        const n = applyWebDefaults(e);
        if (t) {
          n.web.icons = inferWebHomescreenIcons(n, t, r);
          n.web.startupImages = inferWebStartupImages(n, t, r);
        }
        return n;
      }
      t.ensurePWAConfig = ensurePWAConfig;
      class ConfigError extends Error {
        constructor(e, t) {
          super(e);
          this.code = t;
        }
      }
      const _ = JSON.stringify({ expo: { name: 'My app', slug: 'my-app', sdkVersion: '...' } });
      function parseAndValidateRootConfig(e, t) {
        let r = e;
        if (r === null || typeof r !== 'object') {
          if (t) {
            r = { expo: {} };
          } else {
            throw new ConfigError('app.json must include a JSON object.', 'NOT_OBJECT');
          }
        }
        const n = r.expo;
        if (n === null || typeof n !== 'object') {
          throw new ConfigError(
            `Property 'expo' in app.json is not an object. Please make sure app.json includes a managed Expo app config like this: ${_}`,
            'NO_EXPO'
          );
        }
        return { exp: n, rootConfig: r };
      }
      function getRootPackageJsonPath(e, t) {
        const r =
          'nodeModulesPath' in t && typeof t.nodeModulesPath === 'string'
            ? s.default.join(s.default.resolve(e, t.nodeModulesPath), 'package.json')
            : s.default.join(e, 'package.json');
        if (!a.default.existsSync(r)) {
          throw new ConfigError(
            `The expected package.json path: ${r} does not exist`,
            'MODULE_NOT_FOUND'
          );
        }
        return r;
      }
      function readConfigJson(e, t = false, r = false) {
        const { configPath: n } = findConfigFile(e);
        let u = null;
        try {
          u = i.default.read(n, { json5: true });
        } catch (e) {}
        const { rootConfig: o, exp: a } = parseAndValidateRootConfig(u, t);
        const s = getRootPackageJsonPath(e, a);
        const c = i.default.read(s);
        return Object.assign({}, ensureConfigHasDefaultValues(e, a, c, r), { rootConfig: o });
      }
      t.readConfigJson = readConfigJson;
      function readConfigJsonAsync(e, t = false, r = false) {
        return n(this, void 0, void 0, function*() {
          const { configPath: n } = findConfigFile(e);
          let u = null;
          try {
            u = yield i.default.readAsync(n, { json5: true });
          } catch (e) {}
          const { rootConfig: o, exp: a } = parseAndValidateRootConfig(u, t);
          const s = getRootPackageJsonPath(e, a);
          const c = yield i.default.readAsync(s);
          return Object.assign({}, ensureConfigHasDefaultValues(e, a, c, r), { rootConfig: o });
        });
      }
      t.readConfigJsonAsync = readConfigJsonAsync;
      function getExpoSDKVersion(e, t) {
        if (t && t.sdkVersion) {
          return t.sdkVersion;
        }
        const r = f.projectHasModule('expo/package.json', e, t);
        if (r) {
          const e = i.default.read(r, { json5: true });
          const { version: t } = e;
          if (typeof t === 'string') {
            const e = t.split('.').shift();
            return `${e}.0.0`;
          }
        }
        throw new ConfigError(
          `Cannot determine which native SDK version your project uses because the module \`expo\` is not installed. Please install it with \`yarn add expo\` and try again.`,
          'MODULE_NOT_FOUND'
        );
      }
      t.getExpoSDKVersion = getExpoSDKVersion;
      function ensureConfigHasDefaultValues(e, t, r, n = false) {
        if (!t) t = {};
        if (!t.name && typeof r.name === 'string') {
          t.name = r.name;
        }
        if (!t.description && typeof r.description === 'string') {
          t.description = r.description;
        }
        if (!t.slug && typeof t.name === 'string') {
          t.slug = c.default(t.name.toLowerCase());
        }
        if (!t.version) {
          t.version = r.version;
        }
        if (t.nodeModulesPath) {
          t.nodeModulesPath = s.default.resolve(e, t.nodeModulesPath);
        }
        try {
          t.sdkVersion = getExpoSDKVersion(e, t);
        } catch (e) {
          if (!n) throw e;
        }
        if (!t.platforms) {
          t.platforms = ['android', 'ios'];
        }
        return { exp: t, pkg: r };
      }
      function writeConfigJsonAsync(e, t) {
        return n(this, void 0, void 0, function*() {
          const { configPath: r } = findConfigFile(e);
          let { exp: n, pkg: u, rootConfig: o } = yield readConfigJsonAsync(e);
          n = Object.assign({}, n, t);
          o = Object.assign({}, o, { expo: n });
          yield i.default.writeAsync(r, o, { json5: false });
          return { exp: n, pkg: u, rootConfig: o };
        });
      }
      t.writeConfigJsonAsync = writeConfigJsonAsync;
      __export(r(947));
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n =
        (this && this.__awaiter) ||
        function(e, t, r, n) {
          return new (r || (r = Promise))(function(u, i) {
            function fulfilled(e) {
              try {
                step(n.next(e));
              } catch (e) {
                i(e);
              }
            }
            function rejected(e) {
              try {
                step(n['throw'](e));
              } catch (e) {
                i(e);
              }
            }
            function step(e) {
              e.done
                ? u(e.value)
                : new r(function(t) {
                    t(e.value);
                  }).then(fulfilled, rejected);
            }
            step((n = n.apply(e, t || [])).next());
          });
        };
      var u =
        (this && this.__importDefault) ||
        function(e) {
          return e && e.__esModule ? e : { default: e };
        };
      Object.defineProperty(t, '__esModule', { value: true });
      const i = u(r(747));
      const o = r(669);
      const a = u(r(325));
      const s = u(r(91));
      const c = u(r(962));
      const f = u(r(655));
      const l = u(r(395));
      const p = r(284);
      const h = u(r(196));
      const d = o.promisify(i.default.readFile);
      const y = o.promisify(l.default);
      const v = {
        badJsonDefault: undefined,
        jsonParseErrorDefault: undefined,
        cantReadFileDefault: undefined,
        default: undefined,
        json5: false,
        space: 2,
        addNewLineAtEOF: true,
      };
      class JsonFile {
        constructor(e, t = {}) {
          this.file = e;
          this.options = t;
        }
        read(e) {
          return read(this.file, this._getOptions(e));
        }
        readAsync(e) {
          return n(this, void 0, void 0, function*() {
            return readAsync(this.file, this._getOptions(e));
          });
        }
        writeAsync(e, t) {
          return n(this, void 0, void 0, function*() {
            return writeAsync(this.file, e, this._getOptions(t));
          });
        }
        parseJsonString(e, t) {
          return parseJsonString(e, t);
        }
        getAsync(e, t, r) {
          return n(this, void 0, void 0, function*() {
            return getAsync(this.file, e, t, this._getOptions(r));
          });
        }
        setAsync(e, t, r) {
          return n(this, void 0, void 0, function*() {
            return setAsync(this.file, e, t, this._getOptions(r));
          });
        }
        mergeAsync(e, t) {
          return n(this, void 0, void 0, function*() {
            return mergeAsync(this.file, e, this._getOptions(t));
          });
        }
        deleteKeyAsync(e, t) {
          return n(this, void 0, void 0, function*() {
            return deleteKeyAsync(this.file, e, this._getOptions(t));
          });
        }
        deleteKeysAsync(e, t) {
          return n(this, void 0, void 0, function*() {
            return deleteKeysAsync(this.file, e, this._getOptions(t));
          });
        }
        rewriteAsync(e) {
          return n(this, void 0, void 0, function*() {
            return rewriteAsync(this.file, this._getOptions(e));
          });
        }
        _getOptions(e) {
          return Object.assign({}, this.options, e);
        }
      }
      JsonFile.read = read;
      JsonFile.readAsync = readAsync;
      JsonFile.parseJsonString = parseJsonString;
      JsonFile.writeAsync = writeAsync;
      JsonFile.getAsync = getAsync;
      JsonFile.setAsync = setAsync;
      JsonFile.mergeAsync = mergeAsync;
      JsonFile.deleteKeyAsync = deleteKeyAsync;
      JsonFile.deleteKeysAsync = deleteKeysAsync;
      JsonFile.rewriteAsync = rewriteAsync;
      t.default = JsonFile;
      function read(e, t) {
        let r;
        try {
          r = i.default.readFileSync(e, 'utf8');
        } catch (r) {
          let n = cantReadFileDefault(t);
          if (n === undefined) {
            throw new h.default(`Can't read JSON file: ${e}`, r, r.code);
          } else {
            return n;
          }
        }
        return parseJsonString(r, t);
      }
      function readAsync(e, t) {
        return n(this, void 0, void 0, function*() {
          let r;
          try {
            r = yield d(e, 'utf8');
          } catch (r) {
            let n = cantReadFileDefault(t);
            if (n === undefined) {
              throw new h.default(`Can't read JSON file: ${e}`, r, r.code);
            } else {
              return n;
            }
          }
          return parseJsonString(r, t);
        });
      }
      function parseJsonString(e, t) {
        try {
          if (_getOption(t, 'json5')) {
            return f.default.parse(e);
          } else {
            return JSON.parse(e);
          }
        } catch (r) {
          let n = jsonParseErrorDefault(t);
          if (n === undefined) {
            let t = locationFromSyntaxError(r, e);
            if (t) {
              let n = p.codeFrameColumns(e, { start: t });
              r.codeFrame = n;
              r.message += `\n${n}`;
            }
            throw new h.default(`Error parsing JSON: ${e}`, r, 'EJSONPARSE');
          } else {
            return n;
          }
        }
      }
      function getAsync(e, t, r, u) {
        return n(this, void 0, void 0, function*() {
          const n = yield readAsync(e, u);
          if (r === undefined && !s.default(n, t)) {
            throw new h.default(`No value at key path "${t}" in JSON object from: ${e}`);
          }
          return a.default(n, t, r);
        });
      }
      function writeAsync(e, t, r) {
        return n(this, void 0, void 0, function*() {
          const n = _getOption(r, 'space');
          const u = _getOption(r, 'json5');
          const i = _getOption(r, 'addNewLineAtEOF');
          let o;
          try {
            if (u) {
              o = f.default.stringify(t, null, n);
            } else {
              o = JSON.stringify(t, null, n);
            }
          } catch (t) {
            throw new h.default(`Couldn't JSON.stringify object for file: ${e}`, t);
          }
          const a = i ? `${o}\n` : o;
          yield y(e, a, {});
          return t;
        });
      }
      function setAsync(e, t, r, u) {
        return n(this, void 0, void 0, function*() {
          let n = yield readAsync(e, u);
          n = c.default(n, t, r);
          return writeAsync(e, n, u);
        });
      }
      function mergeAsync(e, t, r) {
        return n(this, void 0, void 0, function*() {
          const n = yield readAsync(e, r);
          if (Array.isArray(t)) {
            Object.assign(n, ...t);
          } else {
            Object.assign(n, t);
          }
          return writeAsync(e, n, r);
        });
      }
      function deleteKeyAsync(e, t, r) {
        return n(this, void 0, void 0, function*() {
          return deleteKeysAsync(e, [t], r);
        });
      }
      function deleteKeysAsync(e, t, r) {
        return n(this, void 0, void 0, function*() {
          const n = yield readAsync(e, r);
          let u = false;
          for (let e = 0; e < t.length; e++) {
            let r = t[e];
            if (n.hasOwnProperty(r)) {
              delete n[r];
              u = true;
            }
          }
          if (u) {
            return writeAsync(e, n, r);
          }
          return n;
        });
      }
      function rewriteAsync(e, t) {
        return n(this, void 0, void 0, function*() {
          const r = yield readAsync(e, t);
          return writeAsync(e, r, t);
        });
      }
      function jsonParseErrorDefault(e = {}) {
        if (e.jsonParseErrorDefault === undefined) {
          return e.default;
        } else {
          return e.jsonParseErrorDefault;
        }
      }
      function cantReadFileDefault(e = {}) {
        if (e.cantReadFileDefault === undefined) {
          return e.default;
        } else {
          return e.cantReadFileDefault;
        }
      }
      function _getOption(e, t) {
        if (e) {
          if (e[t] !== undefined) {
            return e[t];
          }
        }
        return v[t];
      }
      function locationFromSyntaxError(e, t) {
        if ('lineNumber' in e && 'columnNumber' in e) {
          return { line: e.lineNumber, column: e.columnNumber };
        }
        let r = /at position (\d+)/.exec(e.message);
        if (r) {
          let e = parseInt(r[1], 10);
          let n = t.slice(0, e + 1).split('\n');
          return { line: n.length, column: n[n.length - 1].length };
        }
        return null;
      }
    },
    function(e, t, r) {
      var n = r(549);
      function hashClear() {
        this.__data__ = n ? n(null) : {};
        this.size = 0;
      }
      e.exports = hashClear;
    },
    function(e, t, r) {
      'use strict';
      var n = r(924);
      var u = r(14);
      e.exports =
        Object.assign ||
        function(e) {
          if (e === null || typeof e === 'undefined') {
            throw new TypeError('Cannot convert undefined or null to object');
          }
          if (!isObject(e)) {
            e = {};
          }
          for (var t = 1; t < arguments.length; t++) {
            var r = arguments[t];
            if (isString(r)) {
              r = toObject(r);
            }
            if (isObject(r)) {
              assign(e, r);
              u(e, r);
            }
          }
          return e;
        };
      function assign(e, t) {
        for (var r in t) {
          if (hasOwn(t, r)) {
            e[r] = t[r];
          }
        }
      }
      function isString(e) {
        return e && typeof e === 'string';
      }
      function toObject(e) {
        var t = {};
        for (var r in e) {
          t[r] = e[r];
        }
        return t;
      }
      function isObject(e) {
        return (e && typeof e === 'object') || n(e);
      }
      function hasOwn(e, t) {
        return Object.prototype.hasOwnProperty.call(e, t);
      }
      function isEnum(e, t) {
        return Object.prototype.propertyIsEnumerable.call(e, t);
      }
    },
    ,
    function(e) {
      e.exports = function(e, t, r, n, u) {
        if (!isObject(e) || !t) {
          return e;
        }
        t = toString(t);
        if (r) t += '.' + toString(r);
        if (n) t += '.' + toString(n);
        if (u) t += '.' + toString(u);
        if (t in e) {
          return e[t];
        }
        var i = t.split('.');
        var o = i.length;
        var a = -1;
        while (e && ++a < o) {
          var s = i[a];
          while (s[s.length - 1] === '\\') {
            s = s.slice(0, -1) + '.' + i[++a];
          }
          e = e[s];
        }
        return e;
      };
      function isObject(e) {
        return e !== null && (typeof e === 'object' || typeof e === 'function');
      }
      function toString(e) {
        if (!e) return '';
        if (Array.isArray(e)) {
          return e.join('.');
        }
        return e;
      }
    },
    ,
    function(e, t, r) {
      'use strict';
      var n = r(58);
      var u = r(60);
      var i =
        typeof Reflect !== 'undefined' && Reflect.defineProperty
          ? Reflect.defineProperty
          : Object.defineProperty;
      e.exports = function defineProperty(e, t, r) {
        if (!n(e) && typeof e !== 'function' && !Array.isArray(e)) {
          throw new TypeError('expected an object, function, or array');
        }
        if (typeof t !== 'string') {
          throw new TypeError('expected "key" to be a string');
        }
        if (u(r)) {
          i(e, t, r);
          return e;
        }
        i(e, t, { configurable: true, enumerable: false, writable: true, value: r });
        return e;
      };
    },
    function(e, t, r) {
      var n = r(580);
      function mapCacheGet(e) {
        return n(this, e).get(e);
      }
      e.exports = mapCacheGet;
    },
    ,
    function(e, t, r) {
      var n = r(835);
      var u = r(541);
      var i = u.decodeBase64;
      var o = u.encodeBase64;
      var a = ':_authToken';
      var s = ':username';
      var c = ':_password';
      e.exports = function() {
        var e;
        var t;
        if (arguments.length >= 2) {
          e = arguments[0];
          t = arguments[1];
        } else if (typeof arguments[0] === 'string') {
          e = arguments[0];
        } else {
          t = arguments[0];
        }
        t = t || {};
        t.npmrc = t.npmrc || r(995)('npm', { registry: 'https://registry.npmjs.org/' });
        e = e || t.npmrc.registry;
        return getRegistryAuthInfo(e, t) || getLegacyAuthInfo(t.npmrc);
      };
      function getRegistryAuthInfo(e, t) {
        var r = n.parse(e, false, true);
        var u;
        while (u !== '/' && r.pathname !== u) {
          u = r.pathname || '/';
          var i = '//' + r.host + u.replace(/\/$/, '');
          var o = getAuthInfoForUrl(i, t.npmrc);
          if (o) {
            return o;
          }
          if (!t.recursive) {
            return /\/$/.test(e) ? undefined : getRegistryAuthInfo(n.resolve(e, '.'), t);
          }
          r.pathname = n.resolve(normalizePath(u), '..') || '/';
        }
        return undefined;
      }
      function getLegacyAuthInfo(e) {
        if (e._auth) {
          return { token: e._auth, type: 'Basic' };
        }
        return undefined;
      }
      function normalizePath(e) {
        return e[e.length - 1] === '/' ? e : e + '/';
      }
      function getAuthInfoForUrl(e, t) {
        var r = getBearerToken(t[e + a] || t[e + '/' + a]);
        if (r) {
          return r;
        }
        var n = t[e + s] || t[e + '/' + s];
        var u = t[e + c] || t[e + '/' + c];
        var i = getTokenForUsernameAndPassword(n, u);
        if (i) {
          return i;
        }
        return undefined;
      }
      function getBearerToken(e) {
        if (!e) {
          return undefined;
        }
        var t = e.replace(/^\$\{?([^}]*)\}?$/, function(e, t) {
          return process.env[t];
        });
        return { token: t, type: 'Bearer' };
      }
      function getTokenForUsernameAndPassword(e, t) {
        if (!e || !t) {
          return undefined;
        }
        var r = i(
          t.replace(/^\$\{?([^}]*)\}?$/, function(e, t) {
            return process.env[t];
          })
        );
        var n = o(e + ':' + r);
        return { token: n, type: 'Basic', password: r, username: e };
      }
    },
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    function(e) {
      'use strict';
      e.exports = {
        aliceblue: [240, 248, 255],
        antiquewhite: [250, 235, 215],
        aqua: [0, 255, 255],
        aquamarine: [127, 255, 212],
        azure: [240, 255, 255],
        beige: [245, 245, 220],
        bisque: [255, 228, 196],
        black: [0, 0, 0],
        blanchedalmond: [255, 235, 205],
        blue: [0, 0, 255],
        blueviolet: [138, 43, 226],
        brown: [165, 42, 42],
        burlywood: [222, 184, 135],
        cadetblue: [95, 158, 160],
        chartreuse: [127, 255, 0],
        chocolate: [210, 105, 30],
        coral: [255, 127, 80],
        cornflowerblue: [100, 149, 237],
        cornsilk: [255, 248, 220],
        crimson: [220, 20, 60],
        cyan: [0, 255, 255],
        darkblue: [0, 0, 139],
        darkcyan: [0, 139, 139],
        darkgoldenrod: [184, 134, 11],
        darkgray: [169, 169, 169],
        darkgreen: [0, 100, 0],
        darkgrey: [169, 169, 169],
        darkkhaki: [189, 183, 107],
        darkmagenta: [139, 0, 139],
        darkolivegreen: [85, 107, 47],
        darkorange: [255, 140, 0],
        darkorchid: [153, 50, 204],
        darkred: [139, 0, 0],
        darksalmon: [233, 150, 122],
        darkseagreen: [143, 188, 143],
        darkslateblue: [72, 61, 139],
        darkslategray: [47, 79, 79],
        darkslategrey: [47, 79, 79],
        darkturquoise: [0, 206, 209],
        darkviolet: [148, 0, 211],
        deeppink: [255, 20, 147],
        deepskyblue: [0, 191, 255],
        dimgray: [105, 105, 105],
        dimgrey: [105, 105, 105],
        dodgerblue: [30, 144, 255],
        firebrick: [178, 34, 34],
        floralwhite: [255, 250, 240],
        forestgreen: [34, 139, 34],
        fuchsia: [255, 0, 255],
        gainsboro: [220, 220, 220],
        ghostwhite: [248, 248, 255],
        gold: [255, 215, 0],
        goldenrod: [218, 165, 32],
        gray: [128, 128, 128],
        green: [0, 128, 0],
        greenyellow: [173, 255, 47],
        grey: [128, 128, 128],
        honeydew: [240, 255, 240],
        hotpink: [255, 105, 180],
        indianred: [205, 92, 92],
        indigo: [75, 0, 130],
        ivory: [255, 255, 240],
        khaki: [240, 230, 140],
        lavender: [230, 230, 250],
        lavenderblush: [255, 240, 245],
        lawngreen: [124, 252, 0],
        lemonchiffon: [255, 250, 205],
        lightblue: [173, 216, 230],
        lightcoral: [240, 128, 128],
        lightcyan: [224, 255, 255],
        lightgoldenrodyellow: [250, 250, 210],
        lightgray: [211, 211, 211],
        lightgreen: [144, 238, 144],
        lightgrey: [211, 211, 211],
        lightpink: [255, 182, 193],
        lightsalmon: [255, 160, 122],
        lightseagreen: [32, 178, 170],
        lightskyblue: [135, 206, 250],
        lightslategray: [119, 136, 153],
        lightslategrey: [119, 136, 153],
        lightsteelblue: [176, 196, 222],
        lightyellow: [255, 255, 224],
        lime: [0, 255, 0],
        limegreen: [50, 205, 50],
        linen: [250, 240, 230],
        magenta: [255, 0, 255],
        maroon: [128, 0, 0],
        mediumaquamarine: [102, 205, 170],
        mediumblue: [0, 0, 205],
        mediumorchid: [186, 85, 211],
        mediumpurple: [147, 112, 219],
        mediumseagreen: [60, 179, 113],
        mediumslateblue: [123, 104, 238],
        mediumspringgreen: [0, 250, 154],
        mediumturquoise: [72, 209, 204],
        mediumvioletred: [199, 21, 133],
        midnightblue: [25, 25, 112],
        mintcream: [245, 255, 250],
        mistyrose: [255, 228, 225],
        moccasin: [255, 228, 181],
        navajowhite: [255, 222, 173],
        navy: [0, 0, 128],
        oldlace: [253, 245, 230],
        olive: [128, 128, 0],
        olivedrab: [107, 142, 35],
        orange: [255, 165, 0],
        orangered: [255, 69, 0],
        orchid: [218, 112, 214],
        palegoldenrod: [238, 232, 170],
        palegreen: [152, 251, 152],
        paleturquoise: [175, 238, 238],
        palevioletred: [219, 112, 147],
        papayawhip: [255, 239, 213],
        peachpuff: [255, 218, 185],
        peru: [205, 133, 63],
        pink: [255, 192, 203],
        plum: [221, 160, 221],
        powderblue: [176, 224, 230],
        purple: [128, 0, 128],
        rebeccapurple: [102, 51, 153],
        red: [255, 0, 0],
        rosybrown: [188, 143, 143],
        royalblue: [65, 105, 225],
        saddlebrown: [139, 69, 19],
        salmon: [250, 128, 114],
        sandybrown: [244, 164, 96],
        seagreen: [46, 139, 87],
        seashell: [255, 245, 238],
        sienna: [160, 82, 45],
        silver: [192, 192, 192],
        skyblue: [135, 206, 235],
        slateblue: [106, 90, 205],
        slategray: [112, 128, 144],
        slategrey: [112, 128, 144],
        snow: [255, 250, 250],
        springgreen: [0, 255, 127],
        steelblue: [70, 130, 180],
        tan: [210, 180, 140],
        teal: [0, 128, 128],
        thistle: [216, 191, 216],
        tomato: [255, 99, 71],
        turquoise: [64, 224, 208],
        violet: [238, 130, 238],
        wheat: [245, 222, 179],
        white: [255, 255, 255],
        whitesmoke: [245, 245, 245],
        yellow: [255, 255, 0],
        yellowgreen: [154, 205, 50],
      };
    },
    ,
    ,
    ,
    function(e, t, r) {
      var n = r(737);
      var u = 500;
      function memoizeCapped(e) {
        var t = n(e, function(e) {
          if (r.size === u) {
            r.clear();
          }
          return e;
        });
        var r = t.cache;
        return t;
      }
      e.exports = memoizeCapped;
    },
    ,
    ,
    ,
    function(e, t) {
      function getArg(e, t, r) {
        if (t in e) {
          return e[t];
        } else if (arguments.length === 3) {
          return r;
        } else {
          throw new Error('"' + t + '" is a required argument.');
        }
      }
      t.getArg = getArg;
      var r = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.]*)(?::(\d+))?(\S*)$/;
      var n = /^data:.+\,.+$/;
      function urlParse(e) {
        var t = e.match(r);
        if (!t) {
          return null;
        }
        return { scheme: t[1], auth: t[2], host: t[3], port: t[4], path: t[5] };
      }
      t.urlParse = urlParse;
      function urlGenerate(e) {
        var t = '';
        if (e.scheme) {
          t += e.scheme + ':';
        }
        t += '//';
        if (e.auth) {
          t += e.auth + '@';
        }
        if (e.host) {
          t += e.host;
        }
        if (e.port) {
          t += ':' + e.port;
        }
        if (e.path) {
          t += e.path;
        }
        return t;
      }
      t.urlGenerate = urlGenerate;
      function normalize(e) {
        var r = e;
        var n = urlParse(e);
        if (n) {
          if (!n.path) {
            return e;
          }
          r = n.path;
        }
        var u = t.isAbsolute(r);
        var i = r.split(/\/+/);
        for (var o, a = 0, s = i.length - 1; s >= 0; s--) {
          o = i[s];
          if (o === '.') {
            i.splice(s, 1);
          } else if (o === '..') {
            a++;
          } else if (a > 0) {
            if (o === '') {
              i.splice(s + 1, a);
              a = 0;
            } else {
              i.splice(s, 2);
              a--;
            }
          }
        }
        r = i.join('/');
        if (r === '') {
          r = u ? '/' : '.';
        }
        if (n) {
          n.path = r;
          return urlGenerate(n);
        }
        return r;
      }
      t.normalize = normalize;
      function join(e, t) {
        if (e === '') {
          e = '.';
        }
        if (t === '') {
          t = '.';
        }
        var r = urlParse(t);
        var u = urlParse(e);
        if (u) {
          e = u.path || '/';
        }
        if (r && !r.scheme) {
          if (u) {
            r.scheme = u.scheme;
          }
          return urlGenerate(r);
        }
        if (r || t.match(n)) {
          return t;
        }
        if (u && !u.host && !u.path) {
          u.host = t;
          return urlGenerate(u);
        }
        var i = t.charAt(0) === '/' ? t : normalize(e.replace(/\/+$/, '') + '/' + t);
        if (u) {
          u.path = i;
          return urlGenerate(u);
        }
        return i;
      }
      t.join = join;
      t.isAbsolute = function(e) {
        return e.charAt(0) === '/' || !!e.match(r);
      };
      function relative(e, t) {
        if (e === '') {
          e = '.';
        }
        e = e.replace(/\/$/, '');
        var r = 0;
        while (t.indexOf(e + '/') !== 0) {
          var n = e.lastIndexOf('/');
          if (n < 0) {
            return t;
          }
          e = e.slice(0, n);
          if (e.match(/^([^\/]+:\/)?\/*$/)) {
            return t;
          }
          ++r;
        }
        return Array(r + 1).join('../') + t.substr(e.length + 1);
      }
      t.relative = relative;
      var u = (function() {
        var e = Object.create(null);
        return !('__proto__' in e);
      })();
      function identity(e) {
        return e;
      }
      function toSetString(e) {
        if (isProtoString(e)) {
          return '$' + e;
        }
        return e;
      }
      t.toSetString = u ? identity : toSetString;
      function fromSetString(e) {
        if (isProtoString(e)) {
          return e.slice(1);
        }
        return e;
      }
      t.fromSetString = u ? identity : fromSetString;
      function isProtoString(e) {
        if (!e) {
          return false;
        }
        var t = e.length;
        if (t < 9) {
          return false;
        }
        if (
          e.charCodeAt(t - 1) !== 95 ||
          e.charCodeAt(t - 2) !== 95 ||
          e.charCodeAt(t - 3) !== 111 ||
          e.charCodeAt(t - 4) !== 116 ||
          e.charCodeAt(t - 5) !== 111 ||
          e.charCodeAt(t - 6) !== 114 ||
          e.charCodeAt(t - 7) !== 112 ||
          e.charCodeAt(t - 8) !== 95 ||
          e.charCodeAt(t - 9) !== 95
        ) {
          return false;
        }
        for (var r = t - 10; r >= 0; r--) {
          if (e.charCodeAt(r) !== 36) {
            return false;
          }
        }
        return true;
      }
      function compareByOriginalPositions(e, t, r) {
        var n = e.source - t.source;
        if (n !== 0) {
          return n;
        }
        n = e.originalLine - t.originalLine;
        if (n !== 0) {
          return n;
        }
        n = e.originalColumn - t.originalColumn;
        if (n !== 0 || r) {
          return n;
        }
        n = e.generatedColumn - t.generatedColumn;
        if (n !== 0) {
          return n;
        }
        n = e.generatedLine - t.generatedLine;
        if (n !== 0) {
          return n;
        }
        return e.name - t.name;
      }
      t.compareByOriginalPositions = compareByOriginalPositions;
      function compareByGeneratedPositionsDeflated(e, t, r) {
        var n = e.generatedLine - t.generatedLine;
        if (n !== 0) {
          return n;
        }
        n = e.generatedColumn - t.generatedColumn;
        if (n !== 0 || r) {
          return n;
        }
        n = e.source - t.source;
        if (n !== 0) {
          return n;
        }
        n = e.originalLine - t.originalLine;
        if (n !== 0) {
          return n;
        }
        n = e.originalColumn - t.originalColumn;
        if (n !== 0) {
          return n;
        }
        return e.name - t.name;
      }
      t.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;
      function strcmp(e, t) {
        if (e === t) {
          return 0;
        }
        if (e > t) {
          return 1;
        }
        return -1;
      }
      function compareByGeneratedPositionsInflated(e, t) {
        var r = e.generatedLine - t.generatedLine;
        if (r !== 0) {
          return r;
        }
        r = e.generatedColumn - t.generatedColumn;
        if (r !== 0) {
          return r;
        }
        r = strcmp(e.source, t.source);
        if (r !== 0) {
          return r;
        }
        r = e.originalLine - t.originalLine;
        if (r !== 0) {
          return r;
        }
        r = e.originalColumn - t.originalColumn;
        if (r !== 0) {
          return r;
        }
        return strcmp(e.name, t.name);
      }
      t.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;
    },
    ,
    function(e, t, r) {
      var n = r(116),
        u = r(1);
      function baseGet(e, t) {
        t = n(t, e);
        var r = 0,
          i = t.length;
        while (e != null && r < i) {
          e = e[u(t[r++])];
        }
        return r && r == i ? e : undefined;
      }
      e.exports = baseGet;
    },
    ,
    ,
    function(e, t) {
      function swap(e, t, r) {
        var n = e[t];
        e[t] = e[r];
        e[r] = n;
      }
      function randomIntInRange(e, t) {
        return Math.round(e + Math.random() * (t - e));
      }
      function doQuickSort(e, t, r, n) {
        if (r < n) {
          var u = randomIntInRange(r, n);
          var i = r - 1;
          swap(e, u, n);
          var o = e[n];
          for (var a = r; a < n; a++) {
            if (t(e[a], o) <= 0) {
              i += 1;
              swap(e, i, a);
            }
          }
          swap(e, i + 1, a);
          var s = i + 1;
          doQuickSort(e, t, r, s - 1);
          doQuickSort(e, t, s + 1, n);
        }
      }
      t.quickSort = function(e, t) {
        doQuickSort(e, t, 0, e.length - 1);
      };
    },
    function(e, t, r) {
      'use strict';
      var n = r(661);
      var u = r(509);
      function mixinDeep(e, t) {
        var r = arguments.length,
          n = 0;
        while (++n < r) {
          var i = arguments[n];
          if (isObject(i)) {
            u(i, copy, e);
          }
        }
        return e;
      }
      function copy(e, t) {
        if (t === '__proto__') {
          return;
        }
        var r = this[t];
        if (isObject(e) && isObject(r)) {
          mixinDeep(r, e);
        } else {
          this[t] = e;
        }
      }
      function isObject(e) {
        return n(e) && !Array.isArray(e);
      }
      e.exports = mixinDeep;
    },
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    function(e) {
      'use strict';
      e.exports = clone;
      function clone(e) {
        if (e === null || typeof e !== 'object') return e;
        if (e instanceof Object) var t = { __proto__: e.__proto__ };
        else var t = Object.create(null);
        Object.getOwnPropertyNames(e).forEach(function(r) {
          Object.defineProperty(t, r, Object.getOwnPropertyDescriptor(e, r));
        });
        return t;
      }
    },
    function(e, t, r) {
      var n = r(229);
      var u = Object.prototype.toString;
      e.exports = function kindOf(e) {
        if (typeof e === 'undefined') {
          return 'undefined';
        }
        if (e === null) {
          return 'null';
        }
        if (e === true || e === false || e instanceof Boolean) {
          return 'boolean';
        }
        if (typeof e === 'string' || e instanceof String) {
          return 'string';
        }
        if (typeof e === 'number' || e instanceof Number) {
          return 'number';
        }
        if (typeof e === 'function' || e instanceof Function) {
          return 'function';
        }
        if (typeof Array.isArray !== 'undefined' && Array.isArray(e)) {
          return 'array';
        }
        if (e instanceof RegExp) {
          return 'regexp';
        }
        if (e instanceof Date) {
          return 'date';
        }
        var t = u.call(e);
        if (t === '[object RegExp]') {
          return 'regexp';
        }
        if (t === '[object Date]') {
          return 'date';
        }
        if (t === '[object Arguments]') {
          return 'arguments';
        }
        if (t === '[object Error]') {
          return 'error';
        }
        if (n(e)) {
          return 'buffer';
        }
        if (t === '[object Set]') {
          return 'set';
        }
        if (t === '[object WeakSet]') {
          return 'weakset';
        }
        if (t === '[object Map]') {
          return 'map';
        }
        if (t === '[object WeakMap]') {
          return 'weakmap';
        }
        if (t === '[object Symbol]') {
          return 'symbol';
        }
        if (t === '[object Int8Array]') {
          return 'int8array';
        }
        if (t === '[object Uint8Array]') {
          return 'uint8array';
        }
        if (t === '[object Uint8ClampedArray]') {
          return 'uint8clampedarray';
        }
        if (t === '[object Int16Array]') {
          return 'int16array';
        }
        if (t === '[object Uint16Array]') {
          return 'uint16array';
        }
        if (t === '[object Int32Array]') {
          return 'int32array';
        }
        if (t === '[object Uint32Array]') {
          return 'uint32array';
        }
        if (t === '[object Float32Array]') {
          return 'float32array';
        }
        if (t === '[object Float64Array]') {
          return 'float64array';
        }
        return 'object';
      };
    },
    function(e, t, r) {
      'use strict';
      var n = r(669);
      var u = r(975);
      var i = r(245);
      var o = r(593);
      var a = r(58);
      var s = r(708);
      var c = r(293);
      var f = r(960);
      function namespace(e) {
        var t = e ? i.namespace(e) : i;
        var r = [];
        function Base(e, r) {
          if (!(this instanceof Base)) {
            return new Base(e, r);
          }
          t.call(this, e);
          this.is('base');
          this.initBase(e, r);
        }
        n.inherits(Base, t);
        o(Base);
        Base.prototype.initBase = function(t, n) {
          this.options = s({}, this.options, n);
          this.cache = this.cache || {};
          this.define('registered', {});
          if (e) this[e] = {};
          this.define('_callbacks', this._callbacks);
          if (a(t)) {
            this.visit('set', t);
          }
          Base.run(this, 'use', r);
        };
        Base.prototype.is = function(e) {
          if (typeof e !== 'string') {
            throw new TypeError('expected name to be a string');
          }
          this.define('is' + c(e), true);
          this.define('_name', e);
          this.define('_appname', e);
          return this;
        };
        Base.prototype.isRegistered = function(e, t) {
          if (this.registered.hasOwnProperty(e)) {
            return true;
          }
          if (t !== false) {
            this.registered[e] = true;
            this.emit('plugin', e);
          }
          return false;
        };
        Base.prototype.use = function(e) {
          e.call(this, this);
          return this;
        };
        Base.prototype.define = function(e, t) {
          if (a(e)) {
            return this.visit('define', e);
          }
          u(this, e, t);
          return this;
        };
        Base.prototype.mixin = function(e, t) {
          Base.prototype[e] = t;
          return this;
        };
        Base.prototype.mixins = Base.prototype.mixins || [];
        Object.defineProperty(Base.prototype, 'base', {
          configurable: true,
          get: function() {
            return this.parent ? this.parent.base : this;
          },
        });
        u(Base, 'use', function(e) {
          r.push(e);
          return Base;
        });
        u(Base, 'run', function(e, t, r) {
          var n = r.length,
            u = 0;
          while (n--) {
            e[t](r[u++]);
          }
          return Base;
        });
        u(
          Base,
          'extend',
          f.extend(Base, function(e, t) {
            e.prototype.mixins = e.prototype.mixins || [];
            u(e, 'mixin', function(t) {
              var r = t(e.prototype, e);
              if (typeof r === 'function') {
                e.prototype.mixins.push(r);
              }
              return e;
            });
            u(e, 'mixins', function(t) {
              Base.run(t, 'mixin', e.prototype.mixins);
              return e;
            });
            e.prototype.mixin = function(t, r) {
              e.prototype[t] = r;
              return this;
            };
            return Base;
          })
        );
        u(Base, 'mixin', function(e) {
          var t = e(Base.prototype, Base);
          if (typeof t === 'function') {
            Base.prototype.mixins.push(t);
          }
          return Base;
        });
        u(Base, 'mixins', function(e) {
          Base.run(e, 'mixin', Base.prototype.mixins);
          return Base;
        });
        u(Base, 'inherit', f.inherit);
        u(Base, 'bubble', f.bubble);
        return Base;
      }
      e.exports = namespace();
      e.exports.namespace = namespace;
    },
    function(e, t) {
      t.parse = t.decode = decode;
      t.stringify = t.encode = encode;
      t.safe = safe;
      t.unsafe = unsafe;
      var r = typeof process !== 'undefined' && process.platform === 'win32' ? '\r\n' : '\n';
      function encode(e, t) {
        var n = [];
        var u = '';
        if (typeof t === 'string') {
          t = { section: t, whitespace: false };
        } else {
          t = t || {};
          t.whitespace = t.whitespace === true;
        }
        var i = t.whitespace ? ' = ' : '=';
        Object.keys(e).forEach(function(t, o, a) {
          var s = e[t];
          if (s && Array.isArray(s)) {
            s.forEach(function(e) {
              u += safe(t + '[]') + i + safe(e) + '\n';
            });
          } else if (s && typeof s === 'object') {
            n.push(t);
          } else {
            u += safe(t) + i + safe(s) + r;
          }
        });
        if (t.section && u.length) {
          u = '[' + safe(t.section) + ']' + r + u;
        }
        n.forEach(function(n, i, o) {
          var a = dotSplit(n).join('\\.');
          var s = (t.section ? t.section + '.' : '') + a;
          var c = encode(e[n], { section: s, whitespace: t.whitespace });
          if (u.length && c.length) {
            u += r;
          }
          u += c;
        });
        return u;
      }
      function dotSplit(e) {
        return e
          .replace(/\1/g, 'LITERAL\\1LITERAL')
          .replace(/\\\./g, '')
          .split(/\./)
          .map(function(e) {
            return e.replace(/\1/g, '\\.').replace(/\2LITERAL\\1LITERAL\2/g, '');
          });
      }
      function decode(e) {
        var t = {};
        var r = t;
        var n = null;
        var u = /^\[([^\]]*)\]$|^([^=]+)(=(.*))?$/i;
        var i = e.split(/[\r\n]+/g);
        i.forEach(function(e, i, o) {
          if (!e || e.match(/^\s*[;#]/)) return;
          var a = e.match(u);
          if (!a) return;
          if (a[1] !== undefined) {
            n = unsafe(a[1]);
            r = t[n] = t[n] || {};
            return;
          }
          var s = unsafe(a[2]);
          var c = a[3] ? unsafe(a[4]) : true;
          switch (c) {
            case 'true':
            case 'false':
            case 'null':
              c = JSON.parse(c);
          }
          if (s.length > 2 && s.slice(-2) === '[]') {
            s = s.substring(0, s.length - 2);
            if (!r[s]) {
              r[s] = [];
            } else if (!Array.isArray(r[s])) {
              r[s] = [r[s]];
            }
          }
          if (Array.isArray(r[s])) {
            r[s].push(c);
          } else {
            r[s] = c;
          }
        });
        Object.keys(t)
          .filter(function(e, r, n) {
            if (!t[e] || typeof t[e] !== 'object' || Array.isArray(t[e])) {
              return false;
            }
            var u = dotSplit(e);
            var i = t;
            var o = u.pop();
            var a = o.replace(/\\\./g, '.');
            u.forEach(function(e, t, r) {
              if (!i[e] || typeof i[e] !== 'object') i[e] = {};
              i = i[e];
            });
            if (i === t && a === o) {
              return false;
            }
            i[a] = t[e];
            return true;
          })
          .forEach(function(e, r, n) {
            delete t[e];
          });
        return t;
      }
      function isQuoted(e) {
        return (
          (e.charAt(0) === '"' && e.slice(-1) === '"') ||
          (e.charAt(0) === "'" && e.slice(-1) === "'")
        );
      }
      function safe(e) {
        return typeof e !== 'string' ||
          e.match(/[=\r\n]/) ||
          e.match(/^\[/) ||
          (e.length > 1 && isQuoted(e)) ||
          e !== e.trim()
          ? JSON.stringify(e)
          : e.replace(/;/g, '\\;').replace(/#/g, '\\#');
      }
      function unsafe(e, t) {
        e = (e || '').trim();
        if (isQuoted(e)) {
          if (e.charAt(0) === "'") {
            e = e.substr(1, e.length - 2);
          }
          try {
            e = JSON.parse(e);
          } catch (e) {}
        } else {
          var r = false;
          var n = '';
          for (var u = 0, i = e.length; u < i; u++) {
            var o = e.charAt(u);
            if (r) {
              if ('\\;#'.indexOf(o) !== -1) {
                n += o;
              } else {
                n += '\\' + o;
              }
              r = false;
            } else if (';#'.indexOf(o) !== -1) {
              break;
            } else if (o === '\\') {
              r = true;
            } else {
              n += o;
            }
          }
          if (r) {
            n += '\\';
          }
          return n.trim();
        }
        return e;
      }
    },
    function(e, t, r) {
      'use strict';
      const n = r(729);
      const u = r(622);
      const i = r(467).mkdirsSync;
      const o = r(936).utimesMillisSync;
      const a = Symbol('notExist');
      function copySync(e, t, r) {
        if (typeof r === 'function') {
          r = { filter: r };
        }
        r = r || {};
        r.clobber = 'clobber' in r ? !!r.clobber : true;
        r.overwrite = 'overwrite' in r ? !!r.overwrite : r.clobber;
        if (r.preserveTimestamps && process.arch === 'ia32') {
          console.warn(
            `fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;\n\n    see https://github.com/jprichardson/node-fs-extra/issues/269`
          );
        }
        const o = checkPaths(e, t);
        if (r.filter && !r.filter(e, t)) return;
        const a = u.dirname(t);
        if (!n.existsSync(a)) i(a);
        return startCopy(o, e, t, r);
      }
      function startCopy(e, t, r, n) {
        if (n.filter && !n.filter(t, r)) return;
        return getStats(e, t, r, n);
      }
      function getStats(e, t, r, u) {
        const i = u.dereference ? n.statSync : n.lstatSync;
        const o = i(t);
        if (o.isDirectory()) return onDir(o, e, t, r, u);
        else if (o.isFile() || o.isCharacterDevice() || o.isBlockDevice())
          return onFile(o, e, t, r, u);
        else if (o.isSymbolicLink()) return onLink(e, t, r, u);
      }
      function onFile(e, t, r, n, u) {
        if (t === a) return copyFile(e, r, n, u);
        return mayCopyFile(e, r, n, u);
      }
      function mayCopyFile(e, t, r, u) {
        if (u.overwrite) {
          n.unlinkSync(r);
          return copyFile(e, t, r, u);
        } else if (u.errorOnExist) {
          throw new Error(`'${r}' already exists`);
        }
      }
      function copyFile(e, t, r, u) {
        if (typeof n.copyFileSync === 'function') {
          n.copyFileSync(t, r);
          n.chmodSync(r, e.mode);
          if (u.preserveTimestamps) {
            return o(r, e.atime, e.mtime);
          }
          return;
        }
        return copyFileFallback(e, t, r, u);
      }
      function copyFileFallback(e, t, u, i) {
        const o = 64 * 1024;
        const a = r(139)(o);
        const s = n.openSync(t, 'r');
        const c = n.openSync(u, 'w', e.mode);
        let f = 0;
        while (f < e.size) {
          const e = n.readSync(s, a, 0, o, f);
          n.writeSync(c, a, 0, e);
          f += e;
        }
        if (i.preserveTimestamps) n.futimesSync(c, e.atime, e.mtime);
        n.closeSync(s);
        n.closeSync(c);
      }
      function onDir(e, t, r, n, u) {
        if (t === a) return mkDirAndCopy(e, r, n, u);
        if (t && !t.isDirectory()) {
          throw new Error(`Cannot overwrite non-directory '${n}' with directory '${r}'.`);
        }
        return copyDir(r, n, u);
      }
      function mkDirAndCopy(e, t, r, u) {
        n.mkdirSync(r);
        copyDir(t, r, u);
        return n.chmodSync(r, e.mode);
      }
      function copyDir(e, t, r) {
        n.readdirSync(e).forEach(n => copyDirItem(n, e, t, r));
      }
      function copyDirItem(e, t, r, n) {
        const i = u.join(t, e);
        const o = u.join(r, e);
        const a = checkPaths(i, o);
        return startCopy(a, i, o, n);
      }
      function onLink(e, t, r, i) {
        let o = n.readlinkSync(t);
        if (i.dereference) {
          o = u.resolve(process.cwd(), o);
        }
        if (e === a) {
          return n.symlinkSync(o, r);
        } else {
          let e;
          try {
            e = n.readlinkSync(r);
          } catch (e) {
            if (e.code === 'EINVAL' || e.code === 'UNKNOWN') return n.symlinkSync(o, r);
            throw e;
          }
          if (i.dereference) {
            e = u.resolve(process.cwd(), e);
          }
          if (isSrcSubdir(o, e)) {
            throw new Error(`Cannot copy '${o}' to a subdirectory of itself, '${e}'.`);
          }
          if (n.statSync(r).isDirectory() && isSrcSubdir(e, o)) {
            throw new Error(`Cannot overwrite '${e}' with '${o}'.`);
          }
          return copyLink(o, r);
        }
      }
      function copyLink(e, t) {
        n.unlinkSync(t);
        return n.symlinkSync(e, t);
      }
      function isSrcSubdir(e, t) {
        const r = u.resolve(e).split(u.sep);
        const n = u.resolve(t).split(u.sep);
        return r.reduce((e, t, r) => e && n[r] === t, true);
      }
      function checkStats(e, t) {
        const r = n.statSync(e);
        let u;
        try {
          u = n.statSync(t);
        } catch (e) {
          if (e.code === 'ENOENT') return { srcStat: r, destStat: a };
          throw e;
        }
        return { srcStat: r, destStat: u };
      }
      function checkPaths(e, t) {
        const { srcStat: r, destStat: n } = checkStats(e, t);
        if (n.ino && n.ino === r.ino) {
          throw new Error('Source and destination must not be the same.');
        }
        if (r.isDirectory() && isSrcSubdir(e, t)) {
          throw new Error(`Cannot copy '${e}' to a subdirectory of itself, '${t}'.`);
        }
        return n;
      }
      e.exports = copySync;
    },
    ,
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n = e.exports;
      var u = r(622);
      var i = r(440);
      n.define = r(682);
      n.diff = r(186);
      n.extend = r(678);
      n.pick = r(520);
      n.typeOf = r(771);
      n.unique = r(156);
      n.isWindows = function() {
        return u.sep === '\\' || process.platform === 'win32';
      };
      n.instantiate = function(e, t) {
        var r;
        if (n.typeOf(e) === 'object' && e.snapdragon) {
          r = e.snapdragon;
        } else if (n.typeOf(t) === 'object' && t.snapdragon) {
          r = t.snapdragon;
        } else {
          r = new i(t);
        }
        n.define(r, 'parse', function(e, t) {
          var r = i.prototype.parse.apply(this, arguments);
          r.input = e;
          var u = this.parser.stack.pop();
          if (u && this.options.strictErrors !== true) {
            var o = u.nodes[0];
            var a = u.nodes[1];
            if (u.type === 'bracket') {
              if (a.val.charAt(0) === '[') {
                a.val = '\\' + a.val;
              }
            } else {
              o.val = '\\' + o.val;
              var s = o.parent.nodes[1];
              if (s.type === 'star') {
                s.loose = true;
              }
            }
          }
          n.define(r, 'parser', this.parser);
          return r;
        });
        return r;
      };
      n.createKey = function(e, t) {
        if (n.typeOf(t) !== 'object') {
          return e;
        }
        var r = e;
        var u = Object.keys(t);
        for (var i = 0; i < u.length; i++) {
          var o = u[i];
          r += ';' + o + '=' + String(t[o]);
        }
        return r;
      };
      n.arrayify = function(e) {
        if (typeof e === 'string') return [e];
        return e ? (Array.isArray(e) ? e : [e]) : [];
      };
      n.isString = function(e) {
        return typeof e === 'string';
      };
      n.isObject = function(e) {
        return n.typeOf(e) === 'object';
      };
      n.hasSpecialChars = function(e) {
        return /(?:(?:(^|\/)[!.])|[*?+()|\[\]{}]|[+@]\()/.test(e);
      };
      n.escapeRegex = function(e) {
        return e.replace(/[-[\]{}()^$|*+?.\\\/\s]/g, '\\$&');
      };
      n.toPosixPath = function(e) {
        return e.replace(/\\+/g, '/');
      };
      n.unescape = function(e) {
        return n.toPosixPath(e.replace(/\\(?=[*+?!.])/g, ''));
      };
      n.stripPrefix = function(e) {
        if (e.charAt(0) !== '.') {
          return e;
        }
        var t = e.charAt(1);
        if (n.isSlash(t)) {
          return e.slice(2);
        }
        return e;
      };
      n.isSlash = function(e) {
        return e === '/' || e === '\\/' || e === '\\' || e === '\\\\';
      };
      n.matchPath = function(e, t) {
        return t && t.contains ? n.containsPattern(e, t) : n.equalsPattern(e, t);
      };
      n._equals = function(e, t, r) {
        return r === e || r === t;
      };
      n._contains = function(e, t, r) {
        return e.indexOf(r) !== -1 || t.indexOf(r) !== -1;
      };
      n.equalsPattern = function(e, t) {
        var r = n.unixify(t);
        t = t || {};
        return function fn(u) {
          var i = n._equals(u, r(u), e);
          if (i === true || t.nocase !== true) {
            return i;
          }
          var o = u.toLowerCase();
          return n._equals(o, r(o), e);
        };
      };
      n.containsPattern = function(e, t) {
        var r = n.unixify(t);
        t = t || {};
        return function(u) {
          var i = n._contains(u, r(u), e);
          if (i === true || t.nocase !== true) {
            return i;
          }
          var o = u.toLowerCase();
          return n._contains(o, r(o), e);
        };
      };
      n.matchBasename = function(e) {
        return function(t) {
          return e.test(u.basename(t));
        };
      };
      n.value = function(e, t, r) {
        if (r && r.unixify === false) {
          return e;
        }
        return t(e);
      };
      n.unixify = function(e) {
        e = e || {};
        return function(t) {
          if (n.isWindows() || e.unixify === true) {
            t = n.toPosixPath(t);
          }
          if (e.stripPrefix !== false) {
            t = n.stripPrefix(t);
          }
          if (e.unescape === true) {
            t = n.unescape(t);
          }
          return t;
        };
      };
    },
    ,
    function(e, t, r) {
      var n = r(747);
      var u = r(782);
      var i = r(825);
      var o = r(718);
      var a = [];
      var s = r(669);
      function noop() {}
      var c = noop;
      if (s.debuglog) c = s.debuglog('gfs4');
      else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ''))
        c = function() {
          var e = s.format.apply(s, arguments);
          e = 'GFS4: ' + e.split(/\n/).join('\nGFS4: ');
          console.error(e);
        };
      if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || '')) {
        process.on('exit', function() {
          c(a);
          r(357).equal(a.length, 0);
        });
      }
      e.exports = patch(o(n));
      if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !n.__patched) {
        e.exports = patch(n);
        n.__patched = true;
      }
      e.exports.close = (function(e) {
        return function(t, r) {
          return e.call(n, t, function(e) {
            if (!e) retry();
            if (typeof r === 'function') r.apply(this, arguments);
          });
        };
      })(n.close);
      e.exports.closeSync = (function(e) {
        return function(t) {
          var r = e.apply(n, arguments);
          retry();
          return r;
        };
      })(n.closeSync);
      if (!/\bgraceful-fs\b/.test(n.closeSync.toString())) {
        n.closeSync = e.exports.closeSync;
        n.close = e.exports.close;
      }
      function patch(e) {
        u(e);
        e.gracefulify = patch;
        e.FileReadStream = ReadStream;
        e.FileWriteStream = WriteStream;
        e.createReadStream = createReadStream;
        e.createWriteStream = createWriteStream;
        var t = e.readFile;
        e.readFile = readFile;
        function readFile(e, r, n) {
          if (typeof r === 'function') (n = r), (r = null);
          return go$readFile(e, r, n);
          function go$readFile(e, r, n) {
            return t(e, r, function(t) {
              if (t && (t.code === 'EMFILE' || t.code === 'ENFILE'))
                enqueue([go$readFile, [e, r, n]]);
              else {
                if (typeof n === 'function') n.apply(this, arguments);
                retry();
              }
            });
          }
        }
        var r = e.writeFile;
        e.writeFile = writeFile;
        function writeFile(e, t, n, u) {
          if (typeof n === 'function') (u = n), (n = null);
          return go$writeFile(e, t, n, u);
          function go$writeFile(e, t, n, u) {
            return r(e, t, n, function(r) {
              if (r && (r.code === 'EMFILE' || r.code === 'ENFILE'))
                enqueue([go$writeFile, [e, t, n, u]]);
              else {
                if (typeof u === 'function') u.apply(this, arguments);
                retry();
              }
            });
          }
        }
        var n = e.appendFile;
        if (n) e.appendFile = appendFile;
        function appendFile(e, t, r, u) {
          if (typeof r === 'function') (u = r), (r = null);
          return go$appendFile(e, t, r, u);
          function go$appendFile(e, t, r, u) {
            return n(e, t, r, function(n) {
              if (n && (n.code === 'EMFILE' || n.code === 'ENFILE'))
                enqueue([go$appendFile, [e, t, r, u]]);
              else {
                if (typeof u === 'function') u.apply(this, arguments);
                retry();
              }
            });
          }
        }
        var o = e.readdir;
        e.readdir = readdir;
        function readdir(e, t, r) {
          var n = [e];
          if (typeof t !== 'function') {
            n.push(t);
          } else {
            r = t;
          }
          n.push(go$readdir$cb);
          return go$readdir(n);
          function go$readdir$cb(e, t) {
            if (t && t.sort) t.sort();
            if (e && (e.code === 'EMFILE' || e.code === 'ENFILE')) enqueue([go$readdir, [n]]);
            else {
              if (typeof r === 'function') r.apply(this, arguments);
              retry();
            }
          }
        }
        function go$readdir(t) {
          return o.apply(e, t);
        }
        if (process.version.substr(0, 4) === 'v0.8') {
          var a = i(e);
          ReadStream = a.ReadStream;
          WriteStream = a.WriteStream;
        }
        var s = e.ReadStream;
        if (s) {
          ReadStream.prototype = Object.create(s.prototype);
          ReadStream.prototype.open = ReadStream$open;
        }
        var c = e.WriteStream;
        if (c) {
          WriteStream.prototype = Object.create(c.prototype);
          WriteStream.prototype.open = WriteStream$open;
        }
        e.ReadStream = ReadStream;
        e.WriteStream = WriteStream;
        function ReadStream(e, t) {
          if (this instanceof ReadStream) return s.apply(this, arguments), this;
          else return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
        }
        function ReadStream$open() {
          var e = this;
          open(e.path, e.flags, e.mode, function(t, r) {
            if (t) {
              if (e.autoClose) e.destroy();
              e.emit('error', t);
            } else {
              e.fd = r;
              e.emit('open', r);
              e.read();
            }
          });
        }
        function WriteStream(e, t) {
          if (this instanceof WriteStream) return c.apply(this, arguments), this;
          else return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
        }
        function WriteStream$open() {
          var e = this;
          open(e.path, e.flags, e.mode, function(t, r) {
            if (t) {
              e.destroy();
              e.emit('error', t);
            } else {
              e.fd = r;
              e.emit('open', r);
            }
          });
        }
        function createReadStream(e, t) {
          return new ReadStream(e, t);
        }
        function createWriteStream(e, t) {
          return new WriteStream(e, t);
        }
        var f = e.open;
        e.open = open;
        function open(e, t, r, n) {
          if (typeof r === 'function') (n = r), (r = null);
          return go$open(e, t, r, n);
          function go$open(e, t, r, n) {
            return f(e, t, r, function(u, i) {
              if (u && (u.code === 'EMFILE' || u.code === 'ENFILE'))
                enqueue([go$open, [e, t, r, n]]);
              else {
                if (typeof n === 'function') n.apply(this, arguments);
                retry();
              }
            });
          }
        }
        return e;
      }
      function enqueue(e) {
        c('ENQUEUE', e[0].name, e[1]);
        a.push(e);
      }
      function retry() {
        var e = a.shift();
        if (e) {
          c('RETRY', e[0].name, e[1]);
          e[0].apply(null, e[1]);
        }
      }
    },
    ,
    function(e, t, r) {
      t = e.exports = r(856);
      t.log = log;
      t.formatArgs = formatArgs;
      t.save = save;
      t.load = load;
      t.useColors = useColors;
      t.storage =
        'undefined' != typeof chrome && 'undefined' != typeof chrome.storage
          ? chrome.storage.local
          : localstorage();
      t.colors = [
        'lightseagreen',
        'forestgreen',
        'goldenrod',
        'dodgerblue',
        'darkorchid',
        'crimson',
      ];
      function useColors() {
        if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
          return true;
        }
        return (
          (typeof document !== 'undefined' &&
            document.documentElement &&
            document.documentElement.style &&
            document.documentElement.style.WebkitAppearance) ||
          (typeof window !== 'undefined' &&
            window.console &&
            (window.console.firebug || (window.console.exception && window.console.table))) ||
          (typeof navigator !== 'undefined' &&
            navigator.userAgent &&
            navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) &&
            parseInt(RegExp.$1, 10) >= 31) ||
          (typeof navigator !== 'undefined' &&
            navigator.userAgent &&
            navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/))
        );
      }
      t.formatters.j = function(e) {
        try {
          return JSON.stringify(e);
        } catch (e) {
          return '[UnexpectedJSONParseError]: ' + e.message;
        }
      };
      function formatArgs(e) {
        var r = this.useColors;
        e[0] =
          (r ? '%c' : '') +
          this.namespace +
          (r ? ' %c' : ' ') +
          e[0] +
          (r ? '%c ' : ' ') +
          '+' +
          t.humanize(this.diff);
        if (!r) return;
        var n = 'color: ' + this.color;
        e.splice(1, 0, n, 'color: inherit');
        var u = 0;
        var i = 0;
        e[0].replace(/%[a-zA-Z%]/g, function(e) {
          if ('%%' === e) return;
          u++;
          if ('%c' === e) {
            i = u;
          }
        });
        e.splice(i, 0, n);
      }
      function log() {
        return (
          'object' === typeof console &&
          console.log &&
          Function.prototype.apply.call(console.log, console, arguments)
        );
      }
      function save(e) {
        try {
          if (null == e) {
            t.storage.removeItem('debug');
          } else {
            t.storage.debug = e;
          }
        } catch (e) {}
      }
      function load() {
        var e;
        try {
          e = t.storage.debug;
        } catch (e) {}
        if (!e && typeof process !== 'undefined' && 'env' in process) {
          e = process.env.DEBUG;
        }
        return e;
      }
      t.enable(load());
      function localstorage() {
        try {
          return window.localStorage;
        } catch (e) {}
      }
    },
    ,
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(729);
      const u = r(622);
      const i = r(983);
      const o = r(113);
      function outputJsonSync(e, t, r) {
        const a = u.dirname(e);
        if (!n.existsSync(a)) {
          i.mkdirsSync(a);
        }
        o.writeJsonSync(e, t, r);
      }
      e.exports = outputJsonSync;
    },
    function(e, t, r) {
      var n = r(29);
      var u = 'Expected a function';
      function memoize(e, t) {
        if (typeof e != 'function' || (t != null && typeof t != 'function')) {
          throw new TypeError(u);
        }
        var r = function() {
          var n = arguments,
            u = t ? t.apply(this, n) : n[0],
            i = r.cache;
          if (i.has(u)) {
            return i.get(u);
          }
          var o = e.apply(this, n);
          r.cache = i.set(u, o) || i;
          return o;
        };
        r.cache = new (memoize.Cache || n)();
        return r;
      }
      memoize.Cache = n;
      e.exports = memoize;
    },
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    function(e) {
      e.exports = require('fs');
    },
    ,
    ,
    ,
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n = r(151);
      e.exports = function(e) {
        e.compiler
          .set('escape', function(e) {
            return this.emit('\\' + e.val.replace(/^\\/, ''), e);
          })
          .set('text', function(e) {
            return this.emit(e.val.replace(/([{}])/g, '\\$1'), e);
          })
          .set('posix', function(e) {
            if (e.val === '[::]') {
              return this.emit('\\[::\\]', e);
            }
            var t = n[e.inner];
            if (typeof t === 'undefined') {
              t = '[' + e.inner + ']';
            }
            return this.emit(t, e);
          })
          .set('bracket', function(e) {
            return this.mapVisit(e.nodes);
          })
          .set('bracket.open', function(e) {
            return this.emit(e.val, e);
          })
          .set('bracket.inner', function(e) {
            var t = e.val;
            if (t === '[' || t === ']') {
              return this.emit('\\' + e.val, e);
            }
            if (t === '^]') {
              return this.emit('^\\]', e);
            }
            if (t === '^') {
              return this.emit('^', e);
            }
            if (/-/.test(t) && !/(\d-\d|\w-\w)/.test(t)) {
              t = t.split('-').join('\\-');
            }
            var r = t.charAt(0) === '^';
            if (r && t.indexOf('/') === -1) {
              t += '/';
            }
            if (r && t.indexOf('.') === -1) {
              t += '.';
            }
            t = t.replace(/\\([1-9])/g, '$1');
            return this.emit(t, e);
          })
          .set('bracket.close', function(e) {
            var t = e.val.replace(/^\\/, '');
            if (e.parent.escaped === true) {
              return this.emit('\\' + t, e);
            }
            return this.emit(t, e);
          });
      };
    },
    function(e, t, r) {
      'use strict';
      var n = r(58);
      function isObjectObject(e) {
        return n(e) === true && Object.prototype.toString.call(e) === '[object Object]';
      }
      e.exports = function isPlainObject(e) {
        var t, r;
        if (isObjectObject(e) === false) return false;
        t = e.constructor;
        if (typeof t !== 'function') return false;
        r = t.prototype;
        if (isObjectObject(r) === false) return false;
        if (r.hasOwnProperty('isPrototypeOf') === false) {
          return false;
        }
        return true;
      };
    },
    ,
    ,
    function(e, t, r) {
      var n = r(922),
        u = r(959);
      var i = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
        o = /^\w*$/;
      function isKey(e, t) {
        if (n(e)) {
          return false;
        }
        var r = typeof e;
        if (r == 'number' || r == 'symbol' || r == 'boolean' || e == null || u(e)) {
          return true;
        }
        return o.test(e) || !i.test(e) || (t != null && e in Object(t));
      }
      e.exports = isKey;
    },
    ,
    ,
    ,
    function(e, t, r) {
      var n = r(47);
      function customDecodeUriComponent(e) {
        return n(e.replace(/\+/g, '%2B'));
      }
      e.exports = customDecodeUriComponent;
    },
    ,
    function(e, t, r) {
      e.exports = new (r(64))();
    },
    function(e, t, r) {
      var n = r(229);
      var u = Object.prototype.toString;
      e.exports = function kindOf(e) {
        if (typeof e === 'undefined') {
          return 'undefined';
        }
        if (e === null) {
          return 'null';
        }
        if (e === true || e === false || e instanceof Boolean) {
          return 'boolean';
        }
        if (typeof e === 'string' || e instanceof String) {
          return 'string';
        }
        if (typeof e === 'number' || e instanceof Number) {
          return 'number';
        }
        if (typeof e === 'function' || e instanceof Function) {
          return 'function';
        }
        if (typeof Array.isArray !== 'undefined' && Array.isArray(e)) {
          return 'array';
        }
        if (e instanceof RegExp) {
          return 'regexp';
        }
        if (e instanceof Date) {
          return 'date';
        }
        var t = u.call(e);
        if (t === '[object RegExp]') {
          return 'regexp';
        }
        if (t === '[object Date]') {
          return 'date';
        }
        if (t === '[object Arguments]') {
          return 'arguments';
        }
        if (t === '[object Error]') {
          return 'error';
        }
        if (n(e)) {
          return 'buffer';
        }
        if (t === '[object Set]') {
          return 'set';
        }
        if (t === '[object WeakSet]') {
          return 'weakset';
        }
        if (t === '[object Map]') {
          return 'map';
        }
        if (t === '[object WeakMap]') {
          return 'weakmap';
        }
        if (t === '[object Symbol]') {
          return 'symbol';
        }
        if (t === '[object Int8Array]') {
          return 'int8array';
        }
        if (t === '[object Uint8Array]') {
          return 'uint8array';
        }
        if (t === '[object Uint8ClampedArray]') {
          return 'uint8clampedarray';
        }
        if (t === '[object Int16Array]') {
          return 'int16array';
        }
        if (t === '[object Uint16Array]') {
          return 'uint16array';
        }
        if (t === '[object Int32Array]') {
          return 'int32array';
        }
        if (t === '[object Uint32Array]') {
          return 'uint32array';
        }
        if (t === '[object Float32Array]') {
          return 'float32array';
        }
        if (t === '[object Float64Array]') {
          return 'float64array';
        }
        return 'object';
      };
    },
    function(e) {
      'use strict';
      var t = /[|\\{}()[\]^$+*?.]/g;
      e.exports = function(e) {
        if (typeof e !== 'string') {
          throw new TypeError('Expected a string');
        }
        return e.replace(t, '\\$&');
      };
    },
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(564);
      const u = r(163);
      const i = r(622);
      e.exports = findWorkspaceRoot;
      function findWorkspaceRoot(e) {
        if (!e) {
          e = process.cwd();
        }
        let t = null;
        let r = i.normalize(e);
        do {
          const n = readPackageJSON(r);
          const o = extractWorkspaces(n);
          if (o) {
            const t = i.relative(r, e);
            if (t === '' || u([t], o).length > 0) {
              return r;
            } else {
              return null;
            }
          }
          t = r;
          r = i.dirname(r);
        } while (r !== t);
        return null;
      }
      function extractWorkspaces(e) {
        const t = (e || {}).workspaces;
        return (t && t.packages) || (Array.isArray(t) ? t : null);
      }
      function readPackageJSON(e) {
        const t = i.join(e, 'package.json');
        if (n.pathExistsSync(t)) {
          return n.readJsonSync(t);
        }
        return null;
      }
    },
    function(e) {
      var t = Object.prototype.toString;
      e.exports = function kindOf(e) {
        if (e === void 0) return 'undefined';
        if (e === null) return 'null';
        var r = typeof e;
        if (r === 'boolean') return 'boolean';
        if (r === 'string') return 'string';
        if (r === 'number') return 'number';
        if (r === 'symbol') return 'symbol';
        if (r === 'function') {
          return isGeneratorFn(e) ? 'generatorfunction' : 'function';
        }
        if (isArray(e)) return 'array';
        if (isBuffer(e)) return 'buffer';
        if (isArguments(e)) return 'arguments';
        if (isDate(e)) return 'date';
        if (isError(e)) return 'error';
        if (isRegexp(e)) return 'regexp';
        switch (ctorName(e)) {
          case 'Symbol':
            return 'symbol';
          case 'Promise':
            return 'promise';
          case 'WeakMap':
            return 'weakmap';
          case 'WeakSet':
            return 'weakset';
          case 'Map':
            return 'map';
          case 'Set':
            return 'set';
          case 'Int8Array':
            return 'int8array';
          case 'Uint8Array':
            return 'uint8array';
          case 'Uint8ClampedArray':
            return 'uint8clampedarray';
          case 'Int16Array':
            return 'int16array';
          case 'Uint16Array':
            return 'uint16array';
          case 'Int32Array':
            return 'int32array';
          case 'Uint32Array':
            return 'uint32array';
          case 'Float32Array':
            return 'float32array';
          case 'Float64Array':
            return 'float64array';
        }
        if (isGeneratorObj(e)) {
          return 'generator';
        }
        r = t.call(e);
        switch (r) {
          case '[object Object]':
            return 'object';
          case '[object Map Iterator]':
            return 'mapiterator';
          case '[object Set Iterator]':
            return 'setiterator';
          case '[object String Iterator]':
            return 'stringiterator';
          case '[object Array Iterator]':
            return 'arrayiterator';
        }
        return r
          .slice(8, -1)
          .toLowerCase()
          .replace(/\s/g, '');
      };
      function ctorName(e) {
        return e.constructor ? e.constructor.name : null;
      }
      function isArray(e) {
        if (Array.isArray) return Array.isArray(e);
        return e instanceof Array;
      }
      function isError(e) {
        return (
          e instanceof Error ||
          (typeof e.message === 'string' &&
            e.constructor &&
            typeof e.constructor.stackTraceLimit === 'number')
        );
      }
      function isDate(e) {
        if (e instanceof Date) return true;
        return (
          typeof e.toDateString === 'function' &&
          typeof e.getDate === 'function' &&
          typeof e.setDate === 'function'
        );
      }
      function isRegexp(e) {
        if (e instanceof RegExp) return true;
        return (
          typeof e.flags === 'string' &&
          typeof e.ignoreCase === 'boolean' &&
          typeof e.multiline === 'boolean' &&
          typeof e.global === 'boolean'
        );
      }
      function isGeneratorFn(e, t) {
        return ctorName(e) === 'GeneratorFunction';
      }
      function isGeneratorObj(e) {
        return (
          typeof e.throw === 'function' &&
          typeof e.return === 'function' &&
          typeof e.next === 'function'
        );
      }
      function isArguments(e) {
        try {
          if (typeof e.length === 'number' && typeof e.callee === 'function') {
            return true;
          }
        } catch (e) {
          if (e.message.indexOf('callee') !== -1) {
            return true;
          }
        }
        return false;
      }
      function isBuffer(e) {
        if (e.constructor && typeof e.constructor.isBuffer === 'function') {
          return e.constructor.isBuffer(e);
        }
        return false;
      }
    },
    function(e, t, r) {
      'use strict';
      const n = r(323).fromCallback;
      const u = r(729);
      const i = r(622);
      const o = r(983);
      const a = r(917).pathExists;
      function outputFile(e, t, r, n) {
        if (typeof r === 'function') {
          n = r;
          r = 'utf8';
        }
        const s = i.dirname(e);
        a(s, (i, a) => {
          if (i) return n(i);
          if (a) return u.writeFile(e, t, r, n);
          o.mkdirs(s, i => {
            if (i) return n(i);
            u.writeFile(e, t, r, n);
          });
        });
      }
      function outputFileSync(e, t, r) {
        const n = i.dirname(e);
        if (u.existsSync(n)) {
          return u.writeFileSync.apply(u, arguments);
        }
        o.mkdirsSync(n);
        u.writeFileSync.apply(u, arguments);
      }
      e.exports = { outputFile: n(outputFile), outputFileSync: outputFileSync };
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(729);
      function symlinkType(e, t, r) {
        r = typeof t === 'function' ? t : r;
        t = typeof t === 'function' ? false : t;
        if (t) return r(null, t);
        n.lstat(e, (e, n) => {
          if (e) return r(null, 'file');
          t = n && n.isDirectory() ? 'dir' : 'file';
          r(null, t);
        });
      }
      function symlinkTypeSync(e, t) {
        let r;
        if (t) return t;
        try {
          r = n.lstatSync(e);
        } catch (e) {
          return 'file';
        }
        return r && r.isDirectory() ? 'dir' : 'file';
      }
      e.exports = { symlinkType: symlinkType, symlinkTypeSync: symlinkTypeSync };
    },
    function(e, t, r) {
      'use strict';
      var n = r(271);
      var u = r(870);
      e.exports = function hasValue(e) {
        if (u(e)) {
          return true;
        }
        switch (n(e)) {
          case 'null':
          case 'boolean':
          case 'function':
            return true;
          case 'string':
          case 'arguments':
            return e.length !== 0;
          case 'error':
            return e.message !== '';
          case 'array':
            var t = e.length;
            if (t === 0) {
              return false;
            }
            for (var r = 0; r < t; r++) {
              if (hasValue(e[r])) {
                return true;
              }
            }
            return false;
          case 'file':
          case 'map':
          case 'set':
            return e.size !== 0;
          case 'object':
            var i = Object.keys(e);
            if (i.length === 0) {
              return false;
            }
            for (var r = 0; r < i.length; r++) {
              var o = i[r];
              if (hasValue(e[o])) {
                return true;
              }
            }
            return false;
          default: {
            return false;
          }
        }
      };
    },
    ,
    function(e, t, r) {
      const n = r(323).fromCallback;
      const u = r(729);
      const i = [
        'access',
        'appendFile',
        'chmod',
        'chown',
        'close',
        'copyFile',
        'fchmod',
        'fchown',
        'fdatasync',
        'fstat',
        'fsync',
        'ftruncate',
        'futimes',
        'lchown',
        'link',
        'lstat',
        'mkdir',
        'mkdtemp',
        'open',
        'readFile',
        'readdir',
        'readlink',
        'realpath',
        'rename',
        'rmdir',
        'stat',
        'symlink',
        'truncate',
        'unlink',
        'utimes',
        'writeFile',
      ].filter(e => {
        return typeof u[e] === 'function';
      });
      Object.keys(u).forEach(e => {
        t[e] = u[e];
      });
      i.forEach(e => {
        t[e] = n(u[e]);
      });
      t.exists = function(e, t) {
        if (typeof t === 'function') {
          return u.exists(e, t);
        }
        return new Promise(t => {
          return u.exists(e, t);
        });
      };
      t.read = function(e, t, r, n, i, o) {
        if (typeof o === 'function') {
          return u.read(e, t, r, n, i, o);
        }
        return new Promise((o, a) => {
          u.read(e, t, r, n, i, (e, t, r) => {
            if (e) return a(e);
            o({ bytesRead: t, buffer: r });
          });
        });
      };
      t.write = function(e, t, r, n, i, o) {
        if (typeof arguments[arguments.length - 1] === 'function') {
          return u.write(e, t, r, n, i, o);
        }
        if (typeof t === 'string') {
          return new Promise((i, o) => {
            u.write(e, t, r, n, (e, t, r) => {
              if (e) return o(e);
              i({ bytesWritten: t, buffer: r });
            });
          });
        }
        return new Promise((o, a) => {
          u.write(e, t, r, n, i, (e, t, r) => {
            if (e) return a(e);
            o({ bytesWritten: t, buffer: r });
          });
        });
      };
    },
    ,
    function(e, t, r) {
      'use strict';
      const n = r(323).fromPromise;
      const u = r(534);
      function pathExists(e) {
        return u
          .access(e)
          .then(() => true)
          .catch(() => false);
      }
      e.exports = { pathExists: n(pathExists), pathExistsSync: u.existsSync };
    },
    ,
    function(e, t, r) {
      var n = r(619);
      var u = process.cwd;
      var i = null;
      var o = process.env.GRACEFUL_FS_PLATFORM || process.platform;
      process.cwd = function() {
        if (!i) i = u.call(process);
        return i;
      };
      try {
        process.cwd();
      } catch (e) {}
      var a = process.chdir;
      process.chdir = function(e) {
        i = null;
        a.call(process, e);
      };
      e.exports = patch;
      function patch(e) {
        if (n.hasOwnProperty('O_SYMLINK') && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
          patchLchmod(e);
        }
        if (!e.lutimes) {
          patchLutimes(e);
        }
        e.chown = chownFix(e.chown);
        e.fchown = chownFix(e.fchown);
        e.lchown = chownFix(e.lchown);
        e.chmod = chmodFix(e.chmod);
        e.fchmod = chmodFix(e.fchmod);
        e.lchmod = chmodFix(e.lchmod);
        e.chownSync = chownFixSync(e.chownSync);
        e.fchownSync = chownFixSync(e.fchownSync);
        e.lchownSync = chownFixSync(e.lchownSync);
        e.chmodSync = chmodFixSync(e.chmodSync);
        e.fchmodSync = chmodFixSync(e.fchmodSync);
        e.lchmodSync = chmodFixSync(e.lchmodSync);
        e.stat = statFix(e.stat);
        e.fstat = statFix(e.fstat);
        e.lstat = statFix(e.lstat);
        e.statSync = statFixSync(e.statSync);
        e.fstatSync = statFixSync(e.fstatSync);
        e.lstatSync = statFixSync(e.lstatSync);
        if (!e.lchmod) {
          e.lchmod = function(e, t, r) {
            if (r) process.nextTick(r);
          };
          e.lchmodSync = function() {};
        }
        if (!e.lchown) {
          e.lchown = function(e, t, r, n) {
            if (n) process.nextTick(n);
          };
          e.lchownSync = function() {};
        }
        if (o === 'win32') {
          e.rename = (function(t) {
            return function(r, n, u) {
              var i = Date.now();
              var o = 0;
              t(r, n, function CB(a) {
                if (a && (a.code === 'EACCES' || a.code === 'EPERM') && Date.now() - i < 6e4) {
                  setTimeout(function() {
                    e.stat(n, function(e, i) {
                      if (e && e.code === 'ENOENT') t(r, n, CB);
                      else u(a);
                    });
                  }, o);
                  if (o < 100) o += 10;
                  return;
                }
                if (u) u(a);
              });
            };
          })(e.rename);
        }
        e.read = (function(t) {
          return function(r, n, u, i, o, a) {
            var s;
            if (a && typeof a === 'function') {
              var c = 0;
              s = function(f, l, p) {
                if (f && f.code === 'EAGAIN' && c < 10) {
                  c++;
                  return t.call(e, r, n, u, i, o, s);
                }
                a.apply(this, arguments);
              };
            }
            return t.call(e, r, n, u, i, o, s);
          };
        })(e.read);
        e.readSync = (function(t) {
          return function(r, n, u, i, o) {
            var a = 0;
            while (true) {
              try {
                return t.call(e, r, n, u, i, o);
              } catch (e) {
                if (e.code === 'EAGAIN' && a < 10) {
                  a++;
                  continue;
                }
                throw e;
              }
            }
          };
        })(e.readSync);
        function patchLchmod(e) {
          e.lchmod = function(t, r, u) {
            e.open(t, n.O_WRONLY | n.O_SYMLINK, r, function(t, n) {
              if (t) {
                if (u) u(t);
                return;
              }
              e.fchmod(n, r, function(t) {
                e.close(n, function(e) {
                  if (u) u(t || e);
                });
              });
            });
          };
          e.lchmodSync = function(t, r) {
            var u = e.openSync(t, n.O_WRONLY | n.O_SYMLINK, r);
            var i = true;
            var o;
            try {
              o = e.fchmodSync(u, r);
              i = false;
            } finally {
              if (i) {
                try {
                  e.closeSync(u);
                } catch (e) {}
              } else {
                e.closeSync(u);
              }
            }
            return o;
          };
        }
        function patchLutimes(e) {
          if (n.hasOwnProperty('O_SYMLINK')) {
            e.lutimes = function(t, r, u, i) {
              e.open(t, n.O_SYMLINK, function(t, n) {
                if (t) {
                  if (i) i(t);
                  return;
                }
                e.futimes(n, r, u, function(t) {
                  e.close(n, function(e) {
                    if (i) i(t || e);
                  });
                });
              });
            };
            e.lutimesSync = function(t, r, u) {
              var i = e.openSync(t, n.O_SYMLINK);
              var o;
              var a = true;
              try {
                o = e.futimesSync(i, r, u);
                a = false;
              } finally {
                if (a) {
                  try {
                    e.closeSync(i);
                  } catch (e) {}
                } else {
                  e.closeSync(i);
                }
              }
              return o;
            };
          } else {
            e.lutimes = function(e, t, r, n) {
              if (n) process.nextTick(n);
            };
            e.lutimesSync = function() {};
          }
        }
        function chmodFix(t) {
          if (!t) return t;
          return function(r, n, u) {
            return t.call(e, r, n, function(e) {
              if (chownErOk(e)) e = null;
              if (u) u.apply(this, arguments);
            });
          };
        }
        function chmodFixSync(t) {
          if (!t) return t;
          return function(r, n) {
            try {
              return t.call(e, r, n);
            } catch (e) {
              if (!chownErOk(e)) throw e;
            }
          };
        }
        function chownFix(t) {
          if (!t) return t;
          return function(r, n, u, i) {
            return t.call(e, r, n, u, function(e) {
              if (chownErOk(e)) e = null;
              if (i) i.apply(this, arguments);
            });
          };
        }
        function chownFixSync(t) {
          if (!t) return t;
          return function(r, n, u) {
            try {
              return t.call(e, r, n, u);
            } catch (e) {
              if (!chownErOk(e)) throw e;
            }
          };
        }
        function statFix(t) {
          if (!t) return t;
          return function(r, n) {
            return t.call(e, r, function(e, t) {
              if (!t) return n.apply(this, arguments);
              if (t.uid < 0) t.uid += 4294967296;
              if (t.gid < 0) t.gid += 4294967296;
              if (n) n.apply(this, arguments);
            });
          };
        }
        function statFixSync(t) {
          if (!t) return t;
          return function(r) {
            var n = t.call(e, r);
            if (n.uid < 0) n.uid += 4294967296;
            if (n.gid < 0) n.gid += 4294967296;
            return n;
          };
        }
        function chownErOk(e) {
          if (!e) return true;
          if (e.code === 'ENOSYS') return true;
          var t = !process.getuid || process.getuid() !== 0;
          if (t) {
            if (e.code === 'EINVAL' || e.code === 'EPERM') return true;
          }
          return false;
        }
      }
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n = r(148);
      e.exports = function defineProperty(e, t, r) {
        if (typeof e !== 'object' && typeof e !== 'function') {
          throw new TypeError('expected an object or function.');
        }
        if (typeof t !== 'string') {
          throw new TypeError('expected `prop` to be a string.');
        }
        if (n(r) && ('set' in r || 'get' in r)) {
          return Object.defineProperty(e, t, r);
        }
        return Object.defineProperty(e, t, {
          configurable: true,
          enumerable: false,
          writable: true,
          value: r,
        });
      };
    },
    function(e) {
      function isKeyable(e) {
        var t = typeof e;
        return t == 'string' || t == 'number' || t == 'symbol' || t == 'boolean'
          ? e !== '__proto__'
          : e === null;
      }
      e.exports = isKeyable;
    },
    function(e, t, r) {
      'use strict';
      var n = r(58);
      e.exports = function visit(e, t, r, u) {
        if (!n(e) && typeof e !== 'function') {
          throw new Error('object-visit expects `thisArg` to be an object.');
        }
        if (typeof t !== 'string') {
          throw new Error('object-visit expects `method` name to be a string');
        }
        if (typeof e[t] !== 'function') {
          return e;
        }
        var i = [].slice.call(arguments, 3);
        r = r || {};
        for (var o in r) {
          var a = [o, r[o]].concat(i);
          e[t].apply(e, a);
        }
        return e;
      };
    },
    function(e, t, r) {
      'use strict';
      const n = r(927);
      const u = r(181);
      const i = r(969);
      e.exports = {
        createFile: n.createFile,
        createFileSync: n.createFileSync,
        ensureFile: n.createFile,
        ensureFileSync: n.createFileSync,
        createLink: u.createLink,
        createLinkSync: u.createLinkSync,
        ensureLink: u.createLink,
        ensureLinkSync: u.createLinkSync,
        createSymlink: i.createSymlink,
        createSymlinkSync: i.createSymlinkSync,
        ensureSymlink: i.createSymlink,
        ensureSymlinkSync: i.createSymlinkSync,
      };
    },
    function(e, t, r) {
      'use strict';
      var n = r(625);
      var u = r(591);
      var i = r(844);
      var o = r(204);
      var a;
      var s = '([!@*?+]?\\(|\\)|\\[:?(?=.*?:?\\])|:?\\]|[*+?!^$.\\\\/])+';
      var c = function(e) {
        return a || (a = textRegex(s));
      };
      e.exports = function(e) {
        var t = e.parser.parsers;
        e.use(u.parsers);
        var r = t.escape;
        var i = t.slash;
        var o = t.qmark;
        var a = t.plus;
        var s = t.star;
        var f = t.dot;
        e.use(n.parsers);
        e.parser
          .use(function() {
            this.notRegex = /^\!+(?!\()/;
          })
          .capture('escape', r)
          .capture('slash', i)
          .capture('qmark', o)
          .capture('star', s)
          .capture('plus', a)
          .capture('dot', f)
          .capture('text', function() {
            if (this.isInside('bracket')) return;
            var e = this.position();
            var t = this.match(c(this.options));
            if (!t || !t[0]) return;
            var r = t[0].replace(/([[\]^$])/g, '\\$1');
            return e({ type: 'text', val: r });
          });
      };
      function textRegex(e) {
        var t = i.create(e, { contains: true, strictClose: false });
        var r = '(?:[\\^]|\\\\|';
        return o(r + t + ')', { strictClose: false });
      }
    },
    function(e, t, r) {
      'use strict';
      var n = r(318);
      e.exports = function(e) {
        function star() {
          if (typeof e.options.star === 'function') {
            return e.options.star.apply(this, arguments);
          }
          if (typeof e.options.star === 'string') {
            return e.options.star;
          }
          return '.*?';
        }
        e.use(n.compilers);
        e.compiler
          .set('escape', function(e) {
            return this.emit(e.val, e);
          })
          .set('dot', function(e) {
            return this.emit('\\' + e.val, e);
          })
          .set('qmark', function(e) {
            var t = '[^\\\\/.]';
            var r = this.prev();
            if (e.parsed.slice(-1) === '(') {
              var n = e.rest.charAt(0);
              if (n !== '!' && n !== '=' && n !== ':') {
                return this.emit(t, e);
              }
              return this.emit(e.val, e);
            }
            if (r.type === 'text' && r.val) {
              return this.emit(t, e);
            }
            if (e.val.length > 1) {
              t += '{' + e.val.length + '}';
            }
            return this.emit(t, e);
          })
          .set('plus', function(e) {
            var t = e.parsed.slice(-1);
            if (t === ']' || t === ')') {
              return this.emit(e.val, e);
            }
            var r = this.output.slice(-1);
            if (!this.output || (/[?*+]/.test(r) && e.parent.type !== 'bracket')) {
              return this.emit('\\+', e);
            }
            if (/\w/.test(r) && !e.inside) {
              return this.emit('+\\+?', e);
            }
            return this.emit('+', e);
          })
          .set('star', function(e) {
            var t = this.prev();
            var r = t.type !== 'text' && t.type !== 'escape' ? '(?!\\.)' : '';
            return this.emit(r + star.call(this, e), e);
          })
          .set('paren', function(e) {
            return this.mapVisit(e.nodes);
          })
          .set('paren.open', function(e) {
            var t = this.options.capture ? '(' : '';
            switch (e.parent.prefix) {
              case '!':
              case '^':
                return this.emit(t + '(?:(?!(?:', e);
              case '*':
              case '+':
              case '?':
              case '@':
                return this.emit(t + '(?:', e);
              default: {
                var r = e.val;
                if (this.options.bash === true) {
                  r = '\\' + r;
                } else if (!this.options.capture && r === '(' && e.parent.rest[0] !== '?') {
                  r += '?:';
                }
                return this.emit(r, e);
              }
            }
          })
          .set('paren.close', function(e) {
            var t = this.options.capture ? ')' : '';
            switch (e.prefix) {
              case '!':
              case '^':
                var r = /^(\)|$)/.test(e.rest) ? '$' : '';
                var n = star.call(this, e);
                if (e.parent.hasSlash && !this.options.star && this.options.slash !== false) {
                  n = '.*?';
                }
                return this.emit(r + ('))' + n + ')') + t, e);
              case '*':
              case '+':
              case '?':
                return this.emit(')' + e.prefix + t, e);
              case '@':
                return this.emit(')' + t, e);
              default: {
                var u = (this.options.bash === true ? '\\' : '') + ')';
                return this.emit(u, e);
              }
            }
          })
          .set('text', function(e) {
            var t = e.val.replace(/[\[\]]/g, '\\$&');
            return this.emit(t, e);
          });
      };
    },
    ,
    ,
    ,
    ,
    function(e) {
      'use strict';
      e.exports = function hasValue(e, t) {
        if (e === null || e === undefined) {
          return false;
        }
        if (typeof e === 'boolean') {
          return true;
        }
        if (typeof e === 'number') {
          if (e === 0 && t === true) {
            return false;
          }
          return true;
        }
        if (e.length !== undefined) {
          return e.length !== 0;
        }
        for (var r in e) {
          if (e.hasOwnProperty(r)) {
            return true;
          }
        }
        return false;
      };
    },
    function(e) {
      'use strict';
      var t = Object.prototype.hasOwnProperty;
      e.exports = MapCache;
      function MapCache(e) {
        this.__data__ = e || {};
      }
      MapCache.prototype.set = function mapSet(e, t) {
        if (e !== '__proto__') {
          this.__data__[e] = t;
        }
        return this;
      };
      MapCache.prototype.get = function mapGet(e) {
        return e === '__proto__' ? undefined : this.__data__[e];
      };
      MapCache.prototype.has = function mapHas(e) {
        return e !== '__proto__' && t.call(this.__data__, e);
      };
      MapCache.prototype.del = function mapDelete(e) {
        return this.has(e) && delete this.__data__[e];
      };
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(622);
      const u = r(282);
      const i = r(747);
      const o = (e, t, r) => {
        if (typeof e !== 'string') {
          throw new TypeError(`Expected \`fromDir\` to be of type \`string\`, got \`${typeof e}\``);
        }
        if (typeof t !== 'string') {
          throw new TypeError(
            `Expected \`moduleId\` to be of type \`string\`, got \`${typeof t}\``
          );
        }
        try {
          e = i.realpathSync(e);
        } catch (t) {
          if (t.code === 'ENOENT') {
            e = n.resolve(e);
          } else if (r) {
            return;
          } else {
            throw t;
          }
        }
        const o = n.join(e, 'noop.js');
        const a = () => u._resolveFilename(t, { id: o, filename: o, paths: u._nodeModulePaths(e) });
        if (r) {
          try {
            return a();
          } catch (e) {
            return;
          }
        }
        return a();
      };
      e.exports = (e, t) => o(e, t);
      e.exports.silent = (e, t) => o(e, t, true);
    },
    ,
    ,
    ,
    ,
    function(e) {
      'use strict';
      e.exports = (e, t) => {
        t = t || process.argv;
        const r = e.startsWith('-') ? '' : e.length === 1 ? '-' : '--';
        const n = t.indexOf(r + e);
        const u = t.indexOf('--');
        return n !== -1 && (u === -1 ? true : n < u);
      };
    },
    ,
    function(e, t, r) {
      'use strict';
      const n = r(729);
      const u = r(622);
      const i = r(82);
      const o = r(983);
      function copySync(e, t, r) {
        if (typeof r === 'function' || r instanceof RegExp) {
          r = { filter: r };
        }
        r = r || {};
        r.recursive = !!r.recursive;
        r.clobber = 'clobber' in r ? !!r.clobber : true;
        r.overwrite = 'overwrite' in r ? !!r.overwrite : r.clobber;
        r.dereference = 'dereference' in r ? !!r.dereference : false;
        r.preserveTimestamps = 'preserveTimestamps' in r ? !!r.preserveTimestamps : false;
        r.filter =
          r.filter ||
          function() {
            return true;
          };
        if (r.preserveTimestamps && process.arch === 'ia32') {
          console.warn(
            `fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;\n\n    see https://github.com/jprichardson/node-fs-extra/issues/269`
          );
        }
        const a = r.recursive && !r.dereference ? n.lstatSync(e) : n.statSync(e);
        const s = u.dirname(t);
        const c = n.existsSync(s);
        let f = false;
        if (r.filter instanceof RegExp) {
          console.warn('Warning: fs-extra: Passing a RegExp filter is deprecated, use a function');
          f = r.filter.test(e);
        } else if (typeof r.filter === 'function') f = r.filter(e, t);
        if (a.isFile() && f) {
          if (!c) o.mkdirsSync(s);
          i(e, t, {
            overwrite: r.overwrite,
            errorOnExist: r.errorOnExist,
            preserveTimestamps: r.preserveTimestamps,
          });
        } else if (a.isDirectory() && f) {
          if (!n.existsSync(t)) o.mkdirsSync(t);
          const i = n.readdirSync(e);
          i.forEach(n => {
            const i = r;
            i.recursive = true;
            copySync(u.join(e, n), u.join(t, n), i);
          });
        } else if (r.recursive && a.isSymbolicLink() && f) {
          const r = n.readlinkSync(e);
          n.symlinkSync(r, t);
        }
      }
      e.exports = copySync;
    },
    ,
    function(e) {
      var t = Object.prototype;
      var r = t.toString;
      function objectToString(e) {
        return r.call(e);
      }
      e.exports = objectToString;
    },
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      e.exports = Object.assign(
        {},
        r(534),
        r(583),
        r(254),
        r(915),
        r(788),
        r(966),
        r(467),
        r(925),
        r(860),
        r(399),
        r(780),
        r(135)
      );
      const n = r(747);
      if (Object.getOwnPropertyDescriptor(n, 'promises')) {
        Object.defineProperty(e.exports, 'promises', {
          get() {
            return n.promises;
          },
        });
      }
    },
    ,
    ,
    ,
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(747);
      const u = r(87);
      const i = '__RESOLVED_TMP_DIR__';
      if (!global[i]) {
        Object.defineProperty(global, i, { value: n.realpathSync(u.tmpdir()) });
      }
      e.exports = global[i];
    },
    ,
    function(e, t, r) {
      var n = r(413).Stream;
      e.exports = legacy;
      function legacy(e) {
        return { ReadStream: ReadStream, WriteStream: WriteStream };
        function ReadStream(t, r) {
          if (!(this instanceof ReadStream)) return new ReadStream(t, r);
          n.call(this);
          var u = this;
          this.path = t;
          this.fd = null;
          this.readable = true;
          this.paused = false;
          this.flags = 'r';
          this.mode = 438;
          this.bufferSize = 64 * 1024;
          r = r || {};
          var i = Object.keys(r);
          for (var o = 0, a = i.length; o < a; o++) {
            var s = i[o];
            this[s] = r[s];
          }
          if (this.encoding) this.setEncoding(this.encoding);
          if (this.start !== undefined) {
            if ('number' !== typeof this.start) {
              throw TypeError('start must be a Number');
            }
            if (this.end === undefined) {
              this.end = Infinity;
            } else if ('number' !== typeof this.end) {
              throw TypeError('end must be a Number');
            }
            if (this.start > this.end) {
              throw new Error('start must be <= end');
            }
            this.pos = this.start;
          }
          if (this.fd !== null) {
            process.nextTick(function() {
              u._read();
            });
            return;
          }
          e.open(this.path, this.flags, this.mode, function(e, t) {
            if (e) {
              u.emit('error', e);
              u.readable = false;
              return;
            }
            u.fd = t;
            u.emit('open', t);
            u._read();
          });
        }
        function WriteStream(t, r) {
          if (!(this instanceof WriteStream)) return new WriteStream(t, r);
          n.call(this);
          this.path = t;
          this.fd = null;
          this.writable = true;
          this.flags = 'w';
          this.encoding = 'binary';
          this.mode = 438;
          this.bytesWritten = 0;
          r = r || {};
          var u = Object.keys(r);
          for (var i = 0, o = u.length; i < o; i++) {
            var a = u[i];
            this[a] = r[a];
          }
          if (this.start !== undefined) {
            if ('number' !== typeof this.start) {
              throw TypeError('start must be a Number');
            }
            if (this.start < 0) {
              throw new Error('start must be >= zero');
            }
            this.pos = this.start;
          }
          this.busy = false;
          this._queue = [];
          if (this.fd === null) {
            this._open = e.open;
            this._queue.push([this._open, this.path, this.flags, this.mode, undefined]);
            this.flush();
          }
        }
      }
    },
    function(e) {
      'use strict';
      e.exports = function repeat(e, t) {
        var r = new Array(t);
        for (var n = 0; n < t; n++) {
          r[n] = e;
        }
        return r;
      };
    },
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    function(e) {
      var t = Function.prototype;
      var r = t.toString;
      function toSource(e) {
        if (e != null) {
          try {
            return r.call(e);
          } catch (e) {}
          try {
            return e + '';
          } catch (e) {}
        }
        return '';
      }
      e.exports = toSource;
    },
    function(e) {
      e.exports = require('url');
    },
    ,
    function(e, t, r) {
      'use strict';
      var n = r(606);
      var u = r(14);
      e.exports =
        Object.assign ||
        function(e) {
          if (e === null || typeof e === 'undefined') {
            throw new TypeError('Cannot convert undefined or null to object');
          }
          if (!isObject(e)) {
            e = {};
          }
          for (var t = 1; t < arguments.length; t++) {
            var r = arguments[t];
            if (isString(r)) {
              r = toObject(r);
            }
            if (isObject(r)) {
              assign(e, r);
              u(e, r);
            }
          }
          return e;
        };
      function assign(e, t) {
        for (var r in t) {
          if (hasOwn(t, r)) {
            e[r] = t[r];
          }
        }
      }
      function isString(e) {
        return e && typeof e === 'string';
      }
      function toObject(e) {
        var t = {};
        for (var r in e) {
          t[r] = e[r];
        }
        return t;
      }
      function isObject(e) {
        return (e && typeof e === 'object') || n(e);
      }
      function hasOwn(e, t) {
        return Object.prototype.hasOwnProperty.call(e, t);
      }
      function isEnum(e, t) {
        return Object.prototype.propertyIsEnumerable.call(e, t);
      }
    },
    ,
    ,
    function(e, t, r) {
      var n = r(161);
      function buildGraph() {
        var e = {};
        var t = Object.keys(n);
        for (var r = t.length, u = 0; u < r; u++) {
          e[t[u]] = { distance: -1, parent: null };
        }
        return e;
      }
      function deriveBFS(e) {
        var t = buildGraph();
        var r = [e];
        t[e].distance = 0;
        while (r.length) {
          var u = r.pop();
          var i = Object.keys(n[u]);
          for (var o = i.length, a = 0; a < o; a++) {
            var s = i[a];
            var c = t[s];
            if (c.distance === -1) {
              c.distance = t[u].distance + 1;
              c.parent = u;
              r.unshift(s);
            }
          }
        }
        return t;
      }
      function link(e, t) {
        return function(r) {
          return t(e(r));
        };
      }
      function wrapConversion(e, t) {
        var r = [t[e].parent, e];
        var u = n[t[e].parent][e];
        var i = t[e].parent;
        while (t[i].parent) {
          r.unshift(t[i].parent);
          u = link(n[t[i].parent][i], u);
          i = t[i].parent;
        }
        u.conversion = r;
        return u;
      }
      e.exports = function(e) {
        var t = deriveBFS(e);
        var r = {};
        var n = Object.keys(t);
        for (var u = n.length, i = 0; i < u; i++) {
          var o = n[i];
          var a = t[o];
          if (a.parent === null) {
            continue;
          }
          r[o] = wrapConversion(o, t);
        }
        return r;
      };
    },
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n = r(179);
      var u = r(207);
      function toRegex(e, t) {
        return new RegExp(toRegex.create(e, t));
      }
      toRegex.create = function(e, t) {
        if (typeof e !== 'string') {
          throw new TypeError('expected a string');
        }
        var r = n({}, t);
        if (r.contains === true) {
          r.strictNegate = false;
        }
        var i = r.strictOpen !== false ? '^' : '';
        var o = r.strictClose !== false ? '$' : '';
        var a = r.endChar ? r.endChar : '+';
        var s = e;
        if (r.strictNegate === false) {
          s = '(?:(?!(?:' + e + ')).)' + a;
        } else {
          s = '(?:(?!^(?:' + e + ')$).)' + a;
        }
        var c = i + s + o;
        if (r.safe === true && u(c) === false) {
          throw new Error('potentially unsafe regular expression: ' + c);
        }
        return c;
      };
      e.exports = toRegex;
    },
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    function(e, t, r) {
      var n = r(549);
      var u = '__lodash_hash_undefined__';
      function hashSet(e, t) {
        var r = this.__data__;
        this.size += this.has(e) ? 0 : 1;
        r[e] = n && t === undefined ? u : t;
        return this;
      }
      e.exports = hashSet;
    },
    ,
    function(e, t, r) {
      t = e.exports = createDebug.debug = createDebug['default'] = createDebug;
      t.coerce = coerce;
      t.disable = disable;
      t.enable = enable;
      t.enabled = enabled;
      t.humanize = r(295);
      t.names = [];
      t.skips = [];
      t.formatters = {};
      var n;
      function selectColor(e) {
        var r = 0,
          n;
        for (n in e) {
          r = (r << 5) - r + e.charCodeAt(n);
          r |= 0;
        }
        return t.colors[Math.abs(r) % t.colors.length];
      }
      function createDebug(e) {
        function debug() {
          if (!debug.enabled) return;
          var e = debug;
          var r = +new Date();
          var u = r - (n || r);
          e.diff = u;
          e.prev = n;
          e.curr = r;
          n = r;
          var i = new Array(arguments.length);
          for (var o = 0; o < i.length; o++) {
            i[o] = arguments[o];
          }
          i[0] = t.coerce(i[0]);
          if ('string' !== typeof i[0]) {
            i.unshift('%O');
          }
          var a = 0;
          i[0] = i[0].replace(/%([a-zA-Z%])/g, function(r, n) {
            if (r === '%%') return r;
            a++;
            var u = t.formatters[n];
            if ('function' === typeof u) {
              var o = i[a];
              r = u.call(e, o);
              i.splice(a, 1);
              a--;
            }
            return r;
          });
          t.formatArgs.call(e, i);
          var s = debug.log || t.log || console.log.bind(console);
          s.apply(e, i);
        }
        debug.namespace = e;
        debug.enabled = t.enabled(e);
        debug.useColors = t.useColors();
        debug.color = selectColor(e);
        if ('function' === typeof t.init) {
          t.init(debug);
        }
        return debug;
      }
      function enable(e) {
        t.save(e);
        t.names = [];
        t.skips = [];
        var r = (typeof e === 'string' ? e : '').split(/[\s,]+/);
        var n = r.length;
        for (var u = 0; u < n; u++) {
          if (!r[u]) continue;
          e = r[u].replace(/\*/g, '.*?');
          if (e[0] === '-') {
            t.skips.push(new RegExp('^' + e.substr(1) + '$'));
          } else {
            t.names.push(new RegExp('^' + e + '$'));
          }
        }
      }
      function disable() {
        t.enable('');
      }
      function enabled(e) {
        var r, n;
        for (r = 0, n = t.skips.length; r < n; r++) {
          if (t.skips[r].test(e)) {
            return false;
          }
        }
        for (r = 0, n = t.names.length; r < n; r++) {
          if (t.names[r].test(e)) {
            return true;
          }
        }
        return false;
      }
      function coerce(e) {
        if (e instanceof Error) return e.stack || e.message;
        return e;
      }
    },
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(323).fromCallback;
      const u = r(729);
      const i = r(622);
      const o = r(254).copy;
      const a = r(135).remove;
      const s = r(467).mkdirp;
      const c = r(780).pathExists;
      function move(e, t, r, n) {
        if (typeof r === 'function') {
          n = r;
          r = {};
        }
        const o = r.overwrite || r.clobber || false;
        e = i.resolve(e);
        t = i.resolve(t);
        if (e === t) return u.access(e, n);
        u.stat(e, (r, u) => {
          if (r) return n(r);
          if (u.isDirectory() && isSrcSubdir(e, t)) {
            return n(new Error(`Cannot move '${e}' to a subdirectory of itself, '${t}'.`));
          }
          s(i.dirname(t), r => {
            if (r) return n(r);
            return doRename(e, t, o, n);
          });
        });
      }
      function doRename(e, t, r, n) {
        if (r) {
          return a(t, u => {
            if (u) return n(u);
            return rename(e, t, r, n);
          });
        }
        c(t, (u, i) => {
          if (u) return n(u);
          if (i) return n(new Error('dest already exists.'));
          return rename(e, t, r, n);
        });
      }
      function rename(e, t, r, n) {
        u.rename(e, t, u => {
          if (!u) return n();
          if (u.code !== 'EXDEV') return n(u);
          return moveAcrossDevice(e, t, r, n);
        });
      }
      function moveAcrossDevice(e, t, r, n) {
        const u = { overwrite: r, errorOnExist: true };
        o(e, t, u, t => {
          if (t) return n(t);
          return a(e, n);
        });
      }
      function isSrcSubdir(e, t) {
        const r = e.split(i.sep);
        const n = t.split(i.sep);
        return r.reduce((e, t, r) => {
          return e && n[r] === t;
        }, true);
      }
      e.exports = { move: n(move) };
    },
    function(e, t, r) {
      'use strict';
      var n = r(844);
      var u = r(64);
      var i = e.exports;
      var o = (i.cache = new u());
      i.arrayify = function(e) {
        if (!Array.isArray(e)) {
          return [e];
        }
        return e;
      };
      i.memoize = function(e, t, r, n) {
        var u = i.createKey(e + t, r);
        if (o.has(e, u)) {
          return o.get(e, u);
        }
        var a = n(t, r);
        if (r && r.cache === false) {
          return a;
        }
        o.set(e, u, a);
        return a;
      };
      i.createKey = function(e, t) {
        var r = e;
        if (typeof t === 'undefined') {
          return r;
        }
        for (var n in t) {
          r += ';' + n + '=' + String(t[n]);
        }
        return r;
      };
      i.createRegex = function(e) {
        var t = { contains: true, strictClose: false };
        return n(e, t);
      };
    },
    ,
    ,
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(622);
      const u = r(729);
      const i = r(917).pathExists;
      function symlinkPaths(e, t, r) {
        if (n.isAbsolute(e)) {
          return u.lstat(e, (t, n) => {
            if (t) {
              t.message = t.message.replace('lstat', 'ensureSymlink');
              return r(t);
            }
            return r(null, { toCwd: e, toDst: e });
          });
        } else {
          const o = n.dirname(t);
          const a = n.join(o, e);
          return i(a, (t, i) => {
            if (t) return r(t);
            if (i) {
              return r(null, { toCwd: a, toDst: e });
            } else {
              return u.lstat(e, (t, u) => {
                if (t) {
                  t.message = t.message.replace('lstat', 'ensureSymlink');
                  return r(t);
                }
                return r(null, { toCwd: e, toDst: n.relative(o, e) });
              });
            }
          });
        }
      }
      function symlinkPathsSync(e, t) {
        let r;
        if (n.isAbsolute(e)) {
          r = u.existsSync(e);
          if (!r) throw new Error('absolute srcpath does not exist');
          return { toCwd: e, toDst: e };
        } else {
          const i = n.dirname(t);
          const o = n.join(i, e);
          r = u.existsSync(o);
          if (r) {
            return { toCwd: o, toDst: e };
          } else {
            r = u.existsSync(e);
            if (!r) throw new Error('relative srcpath does not exist');
            return { toCwd: e, toDst: n.relative(i, e) };
          }
        }
      }
      e.exports = { symlinkPaths: symlinkPaths, symlinkPathsSync: symlinkPathsSync };
    },
    function(e) {
      function isObjectLike(e) {
        return e != null && typeof e == 'object';
      }
      e.exports = isObjectLike;
    },
    ,
    function(e, t, r) {
      'use strict';
      var n = r(765);
      e.exports = function isNumber(e) {
        var t = n(e);
        if (t === 'string') {
          if (!e.trim()) return false;
        } else if (t !== 'number') {
          return false;
        }
        return e - e + 1 >= 0;
      };
    },
    ,
    ,
    ,
    ,
    ,
    function(e, t, r) {
      var n = r(993);
      var u = r(669);
      t = e.exports = r(856);
      t.init = init;
      t.log = log;
      t.formatArgs = formatArgs;
      t.save = save;
      t.load = load;
      t.useColors = useColors;
      t.colors = [6, 2, 3, 4, 5, 1];
      t.inspectOpts = Object.keys(process.env)
        .filter(function(e) {
          return /^debug_/i.test(e);
        })
        .reduce(function(e, t) {
          var r = t
            .substring(6)
            .toLowerCase()
            .replace(/_([a-z])/g, function(e, t) {
              return t.toUpperCase();
            });
          var n = process.env[t];
          if (/^(yes|on|true|enabled)$/i.test(n)) n = true;
          else if (/^(no|off|false|disabled)$/i.test(n)) n = false;
          else if (n === 'null') n = null;
          else n = Number(n);
          e[r] = n;
          return e;
        }, {});
      var i = parseInt(process.env.DEBUG_FD, 10) || 2;
      if (1 !== i && 2 !== i) {
        u.deprecate(function() {},
        'except for stderr(2) and stdout(1), any other usage of DEBUG_FD is deprecated. Override debug.log if you want to use a different log function (https://git.io/debug_fd)')();
      }
      var o = 1 === i ? process.stdout : 2 === i ? process.stderr : createWritableStdioStream(i);
      function useColors() {
        return 'colors' in t.inspectOpts ? Boolean(t.inspectOpts.colors) : n.isatty(i);
      }
      t.formatters.o = function(e) {
        this.inspectOpts.colors = this.useColors;
        return u
          .inspect(e, this.inspectOpts)
          .split('\n')
          .map(function(e) {
            return e.trim();
          })
          .join(' ');
      };
      t.formatters.O = function(e) {
        this.inspectOpts.colors = this.useColors;
        return u.inspect(e, this.inspectOpts);
      };
      function formatArgs(e) {
        var r = this.namespace;
        var n = this.useColors;
        if (n) {
          var u = this.color;
          var i = '  [3' + u + ';1m' + r + ' ' + '[0m';
          e[0] = i + e[0].split('\n').join('\n' + i);
          e.push('[3' + u + 'm+' + t.humanize(this.diff) + '[0m');
        } else {
          e[0] = new Date().toUTCString() + ' ' + r + ' ' + e[0];
        }
      }
      function log() {
        return o.write(u.format.apply(u, arguments) + '\n');
      }
      function save(e) {
        if (null == e) {
          delete process.env.DEBUG;
        } else {
          process.env.DEBUG = e;
        }
      }
      function load() {
        return process.env.DEBUG;
      }
      function createWritableStdioStream(e) {
        var t;
        var u = process.binding('tty_wrap');
        switch (u.guessHandleType(e)) {
          case 'TTY':
            t = new n.WriteStream(e);
            t._type = 'tty';
            if (t._handle && t._handle.unref) {
              t._handle.unref();
            }
            break;
          case 'FILE':
            var i = r(747);
            t = new i.SyncWriteStream(e, { autoClose: false });
            t._type = 'fs';
            break;
          case 'PIPE':
          case 'TCP':
            var o = r(631);
            t = new o.Socket({ fd: e, readable: false, writable: true });
            t.readable = false;
            t.read = null;
            t._type = 'pipe';
            if (t._handle && t._handle.unref) {
              t._handle.unref();
            }
            break;
          default:
            throw new Error('Implement me. Unknown stream file type!');
        }
        t.fd = e;
        t._isStdio = true;
        return t;
      }
      function init(e) {
        e.inspectOpts = {};
        var r = Object.keys(t.inspectOpts);
        for (var n = 0; n < r.length; n++) {
          e.inspectOpts[r[n]] = t.inspectOpts[r[n]];
        }
      }
      t.enable(load());
    },
    ,
    ,
    ,
    ,
    function(e, t, r) {
      var n = r(305),
        u = r(489),
        i = r(485),
        o = r(397),
        a = r(948);
      function ListCache(e) {
        var t = -1,
          r = e == null ? 0 : e.length;
        this.clear();
        while (++t < r) {
          var n = e[t];
          this.set(n[0], n[1]);
        }
      }
      ListCache.prototype.clear = n;
      ListCache.prototype['delete'] = u;
      ListCache.prototype.get = i;
      ListCache.prototype.has = o;
      ListCache.prototype.set = a;
      e.exports = ListCache;
    },
    ,
    ,
    ,
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(466);
      e.exports = () => n(32);
    },
    function(e, t, r) {
      'use strict';
      var n = r(383);
      var u = r(785);
      var i = r(669);
      function extend(e, t) {
        if (typeof e !== 'function') {
          throw new TypeError('expected Parent to be a function.');
        }
        return function(r, o) {
          if (typeof r !== 'function') {
            throw new TypeError('expected Ctor to be a function.');
          }
          i.inherits(r, e);
          n(r, e);
          if (typeof o === 'object') {
            var a = Object.create(o);
            for (var s in a) {
              r.prototype[s] = a[s];
            }
          }
          u(r.prototype, '_parent_', {
            configurable: true,
            set: function() {},
            get: function() {
              return e.prototype;
            },
          });
          if (typeof t === 'function') {
            t(r, e);
          }
          r.extend = extend(r, t);
        };
      }
      e.exports = extend;
    },
    ,
    ,
    function(e, t, r) {
      (function() {
        'use strict';
        var t = r(130);
        function isStrictModeReservedWordES6(e) {
          switch (e) {
            case 'implements':
            case 'interface':
            case 'package':
            case 'private':
            case 'protected':
            case 'public':
            case 'static':
            case 'let':
              return true;
            default:
              return false;
          }
        }
        function isKeywordES5(e, t) {
          if (!t && e === 'yield') {
            return false;
          }
          return isKeywordES6(e, t);
        }
        function isKeywordES6(e, t) {
          if (t && isStrictModeReservedWordES6(e)) {
            return true;
          }
          switch (e.length) {
            case 2:
              return e === 'if' || e === 'in' || e === 'do';
            case 3:
              return e === 'var' || e === 'for' || e === 'new' || e === 'try';
            case 4:
              return (
                e === 'this' ||
                e === 'else' ||
                e === 'case' ||
                e === 'void' ||
                e === 'with' ||
                e === 'enum'
              );
            case 5:
              return (
                e === 'while' ||
                e === 'break' ||
                e === 'catch' ||
                e === 'throw' ||
                e === 'const' ||
                e === 'yield' ||
                e === 'class' ||
                e === 'super'
              );
            case 6:
              return (
                e === 'return' ||
                e === 'typeof' ||
                e === 'delete' ||
                e === 'switch' ||
                e === 'export' ||
                e === 'import'
              );
            case 7:
              return e === 'default' || e === 'finally' || e === 'extends';
            case 8:
              return e === 'function' || e === 'continue' || e === 'debugger';
            case 10:
              return e === 'instanceof';
            default:
              return false;
          }
        }
        function isReservedWordES5(e, t) {
          return e === 'null' || e === 'true' || e === 'false' || isKeywordES5(e, t);
        }
        function isReservedWordES6(e, t) {
          return e === 'null' || e === 'true' || e === 'false' || isKeywordES6(e, t);
        }
        function isRestrictedWord(e) {
          return e === 'eval' || e === 'arguments';
        }
        function isIdentifierNameES5(e) {
          var r, n, u;
          if (e.length === 0) {
            return false;
          }
          u = e.charCodeAt(0);
          if (!t.isIdentifierStartES5(u)) {
            return false;
          }
          for (r = 1, n = e.length; r < n; ++r) {
            u = e.charCodeAt(r);
            if (!t.isIdentifierPartES5(u)) {
              return false;
            }
          }
          return true;
        }
        function decodeUtf16(e, t) {
          return (e - 55296) * 1024 + (t - 56320) + 65536;
        }
        function isIdentifierNameES6(e) {
          var r, n, u, i, o;
          if (e.length === 0) {
            return false;
          }
          o = t.isIdentifierStartES6;
          for (r = 0, n = e.length; r < n; ++r) {
            u = e.charCodeAt(r);
            if (55296 <= u && u <= 56319) {
              ++r;
              if (r >= n) {
                return false;
              }
              i = e.charCodeAt(r);
              if (!(56320 <= i && i <= 57343)) {
                return false;
              }
              u = decodeUtf16(u, i);
            }
            if (!o(u)) {
              return false;
            }
            o = t.isIdentifierPartES6;
          }
          return true;
        }
        function isIdentifierES5(e, t) {
          return isIdentifierNameES5(e) && !isReservedWordES5(e, t);
        }
        function isIdentifierES6(e, t) {
          return isIdentifierNameES6(e) && !isReservedWordES6(e, t);
        }
        e.exports = {
          isKeywordES5: isKeywordES5,
          isKeywordES6: isKeywordES6,
          isReservedWordES5: isReservedWordES5,
          isReservedWordES6: isReservedWordES6,
          isRestrictedWord: isRestrictedWord,
          isIdentifierNameES5: isIdentifierNameES5,
          isIdentifierNameES6: isIdentifierNameES6,
          isIdentifierES5: isIdentifierES5,
          isIdentifierES6: isIdentifierES6,
        };
      })();
    },
    ,
    function(e, t, r) {
      if (typeof process !== 'undefined' && process.type === 'renderer') {
        e.exports = r(731);
      } else {
        e.exports = r(876);
      }
    },
    function(e) {
      'use strict';
      var t = 1;
      var r = 2;
      function stripWithoutWhitespace() {
        return '';
      }
      function stripWithWhitespace(e, t, r) {
        return e.slice(t, r).replace(/\S/g, ' ');
      }
      e.exports = function(e, n) {
        n = n || {};
        var u;
        var i;
        var o = false;
        var a = false;
        var s = 0;
        var c = '';
        var f = n.whitespace === false ? stripWithoutWhitespace : stripWithWhitespace;
        for (var l = 0; l < e.length; l++) {
          u = e[l];
          i = e[l + 1];
          if (!a && u === '"') {
            var p = e[l - 1] === '\\' && e[l - 2] !== '\\';
            if (!p) {
              o = !o;
            }
          }
          if (o) {
            continue;
          }
          if (!a && u + i === '//') {
            c += e.slice(s, l);
            s = l;
            a = t;
            l++;
          } else if (a === t && u + i === '\r\n') {
            l++;
            a = false;
            c += f(e, s, l);
            s = l;
            continue;
          } else if (a === t && u === '\n') {
            a = false;
            c += f(e, s, l);
            s = l;
          } else if (!a && u + i === '/*') {
            c += e.slice(s, l);
            s = l;
            a = r;
            l++;
            continue;
          } else if (a === r && u + i === '*/') {
            l++;
            a = false;
            c += f(e, s, l + 1);
            s = l + 1;
            continue;
          }
        }
        return c + (a ? f(e.substr(s)) : e.substr(s));
      };
    },
    ,
    ,
    function(e, t, r) {
      var n = r(921),
        u = r(143);
      var i = Object.prototype;
      var o = i.hasOwnProperty;
      function assignValue(e, t, r) {
        var i = e[t];
        if (!(o.call(e, t) && u(i, r)) || (r === undefined && !(t in e))) {
          n(e, t, r);
        }
      }
      e.exports = assignValue;
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n = r(100);
      var u = r(302);
      var i = r(138);
      e.exports = function isDescriptor(e, t) {
        if (n(e) !== 'object') {
          return false;
        }
        if ('get' in e) {
          return u(e, t);
        }
        return i(e, t);
      };
    },
    ,
    ,
    ,
    function(e, t, r) {
      e.exports = minimatch;
      minimatch.Minimatch = Minimatch;
      var n = { sep: '/' };
      try {
        n = r(622);
      } catch (e) {}
      var u = (minimatch.GLOBSTAR = Minimatch.GLOBSTAR = {});
      var i = r(266);
      var o = {
        '!': { open: '(?:(?!(?:', close: '))[^/]*?)' },
        '?': { open: '(?:', close: ')?' },
        '+': { open: '(?:', close: ')+' },
        '*': { open: '(?:', close: ')*' },
        '@': { open: '(?:', close: ')' },
      };
      var a = '[^/]';
      var s = a + '*?';
      var c = '(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?';
      var f = '(?:(?!(?:\\/|^)\\.).)*?';
      var l = charSet('().*{}+?[]^$\\!');
      function charSet(e) {
        return e.split('').reduce(function(e, t) {
          e[t] = true;
          return e;
        }, {});
      }
      var p = /\/+/;
      minimatch.filter = filter;
      function filter(e, t) {
        t = t || {};
        return function(r, n, u) {
          return minimatch(r, e, t);
        };
      }
      function ext(e, t) {
        e = e || {};
        t = t || {};
        var r = {};
        Object.keys(t).forEach(function(e) {
          r[e] = t[e];
        });
        Object.keys(e).forEach(function(t) {
          r[t] = e[t];
        });
        return r;
      }
      minimatch.defaults = function(e) {
        if (!e || !Object.keys(e).length) return minimatch;
        var t = minimatch;
        var r = function minimatch(r, n, u) {
          return t.minimatch(r, n, ext(e, u));
        };
        r.Minimatch = function Minimatch(r, n) {
          return new t.Minimatch(r, ext(e, n));
        };
        return r;
      };
      Minimatch.defaults = function(e) {
        if (!e || !Object.keys(e).length) return Minimatch;
        return minimatch.defaults(e).Minimatch;
      };
      function minimatch(e, t, r) {
        if (typeof t !== 'string') {
          throw new TypeError('glob pattern string required');
        }
        if (!r) r = {};
        if (!r.nocomment && t.charAt(0) === '#') {
          return false;
        }
        if (t.trim() === '') return e === '';
        return new Minimatch(t, r).match(e);
      }
      function Minimatch(e, t) {
        if (!(this instanceof Minimatch)) {
          return new Minimatch(e, t);
        }
        if (typeof e !== 'string') {
          throw new TypeError('glob pattern string required');
        }
        if (!t) t = {};
        e = e.trim();
        if (n.sep !== '/') {
          e = e.split(n.sep).join('/');
        }
        this.options = t;
        this.set = [];
        this.pattern = e;
        this.regexp = null;
        this.negate = false;
        this.comment = false;
        this.empty = false;
        this.make();
      }
      Minimatch.prototype.debug = function() {};
      Minimatch.prototype.make = make;
      function make() {
        if (this._made) return;
        var e = this.pattern;
        var t = this.options;
        if (!t.nocomment && e.charAt(0) === '#') {
          this.comment = true;
          return;
        }
        if (!e) {
          this.empty = true;
          return;
        }
        this.parseNegate();
        var r = (this.globSet = this.braceExpand());
        if (t.debug) this.debug = console.error;
        this.debug(this.pattern, r);
        r = this.globParts = r.map(function(e) {
          return e.split(p);
        });
        this.debug(this.pattern, r);
        r = r.map(function(e, t, r) {
          return e.map(this.parse, this);
        }, this);
        this.debug(this.pattern, r);
        r = r.filter(function(e) {
          return e.indexOf(false) === -1;
        });
        this.debug(this.pattern, r);
        this.set = r;
      }
      Minimatch.prototype.parseNegate = parseNegate;
      function parseNegate() {
        var e = this.pattern;
        var t = false;
        var r = this.options;
        var n = 0;
        if (r.nonegate) return;
        for (var u = 0, i = e.length; u < i && e.charAt(u) === '!'; u++) {
          t = !t;
          n++;
        }
        if (n) this.pattern = e.substr(n);
        this.negate = t;
      }
      minimatch.braceExpand = function(e, t) {
        return braceExpand(e, t);
      };
      Minimatch.prototype.braceExpand = braceExpand;
      function braceExpand(e, t) {
        if (!t) {
          if (this instanceof Minimatch) {
            t = this.options;
          } else {
            t = {};
          }
        }
        e = typeof e === 'undefined' ? this.pattern : e;
        if (typeof e === 'undefined') {
          throw new TypeError('undefined pattern');
        }
        if (t.nobrace || !e.match(/\{.*\}/)) {
          return [e];
        }
        return i(e);
      }
      Minimatch.prototype.parse = parse;
      var h = {};
      function parse(e, t) {
        if (e.length > 1024 * 64) {
          throw new TypeError('pattern is too long');
        }
        var r = this.options;
        if (!r.noglobstar && e === '**') return u;
        if (e === '') return '';
        var n = '';
        var i = !!r.nocase;
        var c = false;
        var f = [];
        var p = [];
        var d;
        var y = false;
        var v = -1;
        var D = -1;
        var m = e.charAt(0) === '.' ? '' : r.dot ? '(?!(?:^|\\/)\\.{1,2}(?:$|\\/))' : '(?!\\.)';
        var A = this;
        function clearStateChar() {
          if (d) {
            switch (d) {
              case '*':
                n += s;
                i = true;
                break;
              case '?':
                n += a;
                i = true;
                break;
              default:
                n += '\\' + d;
                break;
            }
            A.debug('clearStateChar %j %j', d, n);
            d = false;
          }
        }
        for (var g = 0, E = e.length, C; g < E && (C = e.charAt(g)); g++) {
          this.debug('%s\t%s %s %j', e, g, n, C);
          if (c && l[C]) {
            n += '\\' + C;
            c = false;
            continue;
          }
          switch (C) {
            case '/':
              return false;
            case '\\':
              clearStateChar();
              c = true;
              continue;
            case '?':
            case '*':
            case '+':
            case '@':
            case '!':
              this.debug('%s\t%s %s %j <-- stateChar', e, g, n, C);
              if (y) {
                this.debug('  in class');
                if (C === '!' && g === D + 1) C = '^';
                n += C;
                continue;
              }
              A.debug('call clearStateChar %j', d);
              clearStateChar();
              d = C;
              if (r.noext) clearStateChar();
              continue;
            case '(':
              if (y) {
                n += '(';
                continue;
              }
              if (!d) {
                n += '\\(';
                continue;
              }
              f.push({
                type: d,
                start: g - 1,
                reStart: n.length,
                open: o[d].open,
                close: o[d].close,
              });
              n += d === '!' ? '(?:(?!(?:' : '(?:';
              this.debug('plType %j %j', d, n);
              d = false;
              continue;
            case ')':
              if (y || !f.length) {
                n += '\\)';
                continue;
              }
              clearStateChar();
              i = true;
              var F = f.pop();
              n += F.close;
              if (F.type === '!') {
                p.push(F);
              }
              F.reEnd = n.length;
              continue;
            case '|':
              if (y || !f.length || c) {
                n += '\\|';
                c = false;
                continue;
              }
              clearStateChar();
              n += '|';
              continue;
            case '[':
              clearStateChar();
              if (y) {
                n += '\\' + C;
                continue;
              }
              y = true;
              D = g;
              v = n.length;
              n += C;
              continue;
            case ']':
              if (g === D + 1 || !y) {
                n += '\\' + C;
                c = false;
                continue;
              }
              if (y) {
                var b = e.substring(D + 1, g);
                try {
                  RegExp('[' + b + ']');
                } catch (e) {
                  var S = this.parse(b, h);
                  n = n.substr(0, v) + '\\[' + S[0] + '\\]';
                  i = i || S[1];
                  y = false;
                  continue;
                }
              }
              i = true;
              y = false;
              n += C;
              continue;
            default:
              clearStateChar();
              if (c) {
                c = false;
              } else if (l[C] && !(C === '^' && y)) {
                n += '\\';
              }
              n += C;
          }
        }
        if (y) {
          b = e.substr(D + 1);
          S = this.parse(b, h);
          n = n.substr(0, v) + '\\[' + S[0];
          i = i || S[1];
        }
        for (F = f.pop(); F; F = f.pop()) {
          var w = n.slice(F.reStart + F.open.length);
          this.debug('setting tail', n, F);
          w = w.replace(/((?:\\{2}){0,64})(\\?)\|/g, function(e, t, r) {
            if (!r) {
              r = '\\';
            }
            return t + t + r + '|';
          });
          this.debug('tail=%j\n   %s', w, w, F, n);
          var B = F.type === '*' ? s : F.type === '?' ? a : '\\' + F.type;
          i = true;
          n = n.slice(0, F.reStart) + B + '\\(' + w;
        }
        clearStateChar();
        if (c) {
          n += '\\\\';
        }
        var x = false;
        switch (n.charAt(0)) {
          case '.':
          case '[':
          case '(':
            x = true;
        }
        for (var O = p.length - 1; O > -1; O--) {
          var _ = p[O];
          var j = n.slice(0, _.reStart);
          var k = n.slice(_.reStart, _.reEnd - 8);
          var M = n.slice(_.reEnd - 8, _.reEnd);
          var P = n.slice(_.reEnd);
          M += P;
          var R = j.split('(').length - 1;
          var N = P;
          for (g = 0; g < R; g++) {
            N = N.replace(/\)[+*?]?/, '');
          }
          P = N;
          var I = '';
          if (P === '' && t !== h) {
            I = '$';
          }
          var T = j + k + P + I + M;
          n = T;
        }
        if (n !== '' && i) {
          n = '(?=.)' + n;
        }
        if (x) {
          n = m + n;
        }
        if (t === h) {
          return [n, i];
        }
        if (!i) {
          return globUnescape(e);
        }
        var L = r.nocase ? 'i' : '';
        try {
          var $ = new RegExp('^' + n + '$', L);
        } catch (e) {
          return new RegExp('$.');
        }
        $._glob = e;
        $._src = n;
        return $;
      }
      minimatch.makeRe = function(e, t) {
        return new Minimatch(e, t || {}).makeRe();
      };
      Minimatch.prototype.makeRe = makeRe;
      function makeRe() {
        if (this.regexp || this.regexp === false) return this.regexp;
        var e = this.set;
        if (!e.length) {
          this.regexp = false;
          return this.regexp;
        }
        var t = this.options;
        var r = t.noglobstar ? s : t.dot ? c : f;
        var n = t.nocase ? 'i' : '';
        var i = e
          .map(function(e) {
            return e
              .map(function(e) {
                return e === u ? r : typeof e === 'string' ? regExpEscape(e) : e._src;
              })
              .join('\\/');
          })
          .join('|');
        i = '^(?:' + i + ')$';
        if (this.negate) i = '^(?!' + i + ').*$';
        try {
          this.regexp = new RegExp(i, n);
        } catch (e) {
          this.regexp = false;
        }
        return this.regexp;
      }
      minimatch.match = function(e, t, r) {
        r = r || {};
        var n = new Minimatch(t, r);
        e = e.filter(function(e) {
          return n.match(e);
        });
        if (n.options.nonull && !e.length) {
          e.push(t);
        }
        return e;
      };
      Minimatch.prototype.match = match;
      function match(e, t) {
        this.debug('match', e, this.pattern);
        if (this.comment) return false;
        if (this.empty) return e === '';
        if (e === '/' && t) return true;
        var r = this.options;
        if (n.sep !== '/') {
          e = e.split(n.sep).join('/');
        }
        e = e.split(p);
        this.debug(this.pattern, 'split', e);
        var u = this.set;
        this.debug(this.pattern, 'set', u);
        var i;
        var o;
        for (o = e.length - 1; o >= 0; o--) {
          i = e[o];
          if (i) break;
        }
        for (o = 0; o < u.length; o++) {
          var a = u[o];
          var s = e;
          if (r.matchBase && a.length === 1) {
            s = [i];
          }
          var c = this.matchOne(s, a, t);
          if (c) {
            if (r.flipNegate) return true;
            return !this.negate;
          }
        }
        if (r.flipNegate) return false;
        return this.negate;
      }
      Minimatch.prototype.matchOne = function(e, t, r) {
        var n = this.options;
        this.debug('matchOne', { this: this, file: e, pattern: t });
        this.debug('matchOne', e.length, t.length);
        for (var i = 0, o = 0, a = e.length, s = t.length; i < a && o < s; i++, o++) {
          this.debug('matchOne loop');
          var c = t[o];
          var f = e[i];
          this.debug(t, c, f);
          if (c === false) return false;
          if (c === u) {
            this.debug('GLOBSTAR', [t, c, f]);
            var l = i;
            var p = o + 1;
            if (p === s) {
              this.debug('** at the end');
              for (; i < a; i++) {
                if (e[i] === '.' || e[i] === '..' || (!n.dot && e[i].charAt(0) === '.'))
                  return false;
              }
              return true;
            }
            while (l < a) {
              var h = e[l];
              this.debug('\nglobstar while', e, l, t, p, h);
              if (this.matchOne(e.slice(l), t.slice(p), r)) {
                this.debug('globstar found match!', l, a, h);
                return true;
              } else {
                if (h === '.' || h === '..' || (!n.dot && h.charAt(0) === '.')) {
                  this.debug('dot detected!', e, l, t, p);
                  break;
                }
                this.debug('globstar swallow a segment, and continue');
                l++;
              }
            }
            if (r) {
              this.debug('\n>>> no match, partial?', e, l, t, p);
              if (l === a) return true;
            }
            return false;
          }
          var d;
          if (typeof c === 'string') {
            if (n.nocase) {
              d = f.toLowerCase() === c.toLowerCase();
            } else {
              d = f === c;
            }
            this.debug('string match', c, f, d);
          } else {
            d = f.match(c);
            this.debug('pattern match', c, f, d);
          }
          if (!d) return false;
        }
        if (i === a && o === s) {
          return true;
        } else if (i === a) {
          return r;
        } else if (o === s) {
          var y = i === a - 1 && e[i] === '';
          return y;
        }
        throw new Error('wtf?');
      };
      function globUnescape(e) {
        return e.replace(/\\(.)/g, '$1');
      }
      function regExpEscape(e) {
        return e.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      }
    },
    ,
    function(e, t, r) {
      'use strict';
      var n = r(406);
      e.exports = function(e, t, r) {
        if (typeof e !== 'string') {
          throw new TypeError('expected a string');
        }
        if (typeof t === 'function') {
          r = t;
          t = null;
        }
        if (typeof t === 'string') {
          t = { sep: t };
        }
        var u = n({ sep: '.' }, t);
        var i = u.quotes || ['"', "'", '`'];
        var o;
        if (u.brackets === true) {
          o = { '<': '>', '(': ')', '[': ']', '{': '}' };
        } else if (u.brackets) {
          o = u.brackets;
        }
        var a = [];
        var s = [];
        var c = [''];
        var f = u.sep;
        var l = e.length;
        var p = -1;
        var h;
        function expected() {
          if (o && s.length) {
            return o[s[s.length - 1]];
          }
        }
        while (++p < l) {
          var d = e[p];
          var y = e[p + 1];
          var v = { val: d, idx: p, arr: c, str: e };
          a.push(v);
          if (d === '\\') {
            v.val = keepEscaping(u, e, p) === true ? d + y : y;
            v.escaped = true;
            if (typeof r === 'function') {
              r(v);
            }
            c[c.length - 1] += v.val;
            p++;
            continue;
          }
          if (o && o[d]) {
            s.push(d);
            var D = expected();
            var m = p + 1;
            if (e.indexOf(D, m + 1) !== -1) {
              while (s.length && m < l) {
                var A = e[++m];
                if (A === '\\') {
                  A++;
                  continue;
                }
                if (i.indexOf(A) !== -1) {
                  m = getClosingQuote(e, A, m + 1);
                  continue;
                }
                D = expected();
                if (s.length && e.indexOf(D, m + 1) === -1) {
                  break;
                }
                if (o[A]) {
                  s.push(A);
                  continue;
                }
                if (D === A) {
                  s.pop();
                }
              }
            }
            h = m;
            if (h === -1) {
              c[c.length - 1] += d;
              continue;
            }
            d = e.slice(p, h + 1);
            v.val = d;
            v.idx = p = h;
          }
          if (i.indexOf(d) !== -1) {
            h = getClosingQuote(e, d, p + 1);
            if (h === -1) {
              c[c.length - 1] += d;
              continue;
            }
            if (keepQuotes(d, u) === true) {
              d = e.slice(p, h + 1);
            } else {
              d = e.slice(p + 1, h);
            }
            v.val = d;
            v.idx = p = h;
          }
          if (typeof r === 'function') {
            r(v, a);
            d = v.val;
            p = v.idx;
          }
          if (v.val === f && v.split !== false) {
            c.push('');
            continue;
          }
          c[c.length - 1] += v.val;
        }
        return c;
      };
      function getClosingQuote(e, t, r, n) {
        var u = e.indexOf(t, r);
        if (e.charAt(u - 1) === '\\') {
          return getClosingQuote(e, t, u + 1);
        }
        return u;
      }
      function keepQuotes(e, t) {
        if (t.keepDoubleQuotes === true && e === '"') return true;
        if (t.keepSingleQuotes === true && e === "'") return true;
        return t.keepQuotes;
      }
      function keepEscaping(e, t, r) {
        if (typeof e.keepEscaping === 'function') {
          return e.keepEscaping(t, r);
        }
        return e.keepEscaping === true || t[r + 1] === '\\';
      }
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(498);
      const u = r(321);
      const i = r(930);
      e.exports = {
        createFile: n.createFile,
        createFileSync: n.createFileSync,
        ensureFile: n.createFile,
        ensureFileSync: n.createFileSync,
        createLink: u.createLink,
        createLinkSync: u.createLinkSync,
        ensureLink: u.createLink,
        ensureLinkSync: u.createLinkSync,
        createSymlink: i.createSymlink,
        createSymlinkSync: i.createSymlinkSync,
        ensureSymlink: i.createSymlink,
        ensureSymlinkSync: i.createSymlinkSync,
      };
    },
    function(e) {
      'use strict';
      function assign() {
        const e = [].slice.call(arguments).filter(e => e);
        const t = e.shift();
        e.forEach(e => {
          Object.keys(e).forEach(r => {
            t[r] = e[r];
          });
        });
        return t;
      }
      e.exports = assign;
    },
    ,
    function(e) {
      'use strict';
      function posix(e) {
        return e.charAt(0) === '/';
      }
      function win32(e) {
        var t = /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/;
        var r = t.exec(e);
        var n = r[1] || '';
        var u = Boolean(n && n.charAt(1) !== ':');
        return Boolean(r[2] || u);
      }
      e.exports = process.platform === 'win32' ? win32 : posix;
      e.exports.posix = posix;
      e.exports.win32 = win32;
    },
    ,
    function(e, t, r) {
      var n;
      try {
        n = r(729);
      } catch (e) {
        n = r(747);
      }
      function readFile(e, t, r) {
        if (r == null) {
          r = t;
          t = {};
        }
        if (typeof t === 'string') {
          t = { encoding: t };
        }
        t = t || {};
        var u = t.fs || n;
        var i = true;
        if ('throws' in t) {
          i = t.throws;
        }
        u.readFile(e, t, function(n, u) {
          if (n) return r(n);
          u = stripBom(u);
          var o;
          try {
            o = JSON.parse(u, t ? t.reviver : null);
          } catch (t) {
            if (i) {
              t.message = e + ': ' + t.message;
              return r(t);
            } else {
              return r(null, null);
            }
          }
          r(null, o);
        });
      }
      function readFileSync(e, t) {
        t = t || {};
        if (typeof t === 'string') {
          t = { encoding: t };
        }
        var r = t.fs || n;
        var u = true;
        if ('throws' in t) {
          u = t.throws;
        }
        try {
          var i = r.readFileSync(e, t);
          i = stripBom(i);
          return JSON.parse(i, t.reviver);
        } catch (t) {
          if (u) {
            t.message = e + ': ' + t.message;
            throw t;
          } else {
            return null;
          }
        }
      }
      function stringify(e, t) {
        var r;
        var n = '\n';
        if (typeof t === 'object' && t !== null) {
          if (t.spaces) {
            r = t.spaces;
          }
          if (t.EOL) {
            n = t.EOL;
          }
        }
        var u = JSON.stringify(e, t ? t.replacer : null, r);
        return u.replace(/\n/g, n) + n;
      }
      function writeFile(e, t, r, u) {
        if (u == null) {
          u = r;
          r = {};
        }
        r = r || {};
        var i = r.fs || n;
        var o = '';
        try {
          o = stringify(t, r);
        } catch (e) {
          if (u) u(e, null);
          return;
        }
        i.writeFile(e, o, r, u);
      }
      function writeFileSync(e, t, r) {
        r = r || {};
        var u = r.fs || n;
        var i = stringify(t, r);
        return u.writeFileSync(e, i, r);
      }
      function stripBom(e) {
        if (Buffer.isBuffer(e)) e = e.toString('utf8');
        e = e.replace(/^\uFEFF/, '');
        return e;
      }
      var u = {
        readFile: readFile,
        readFileSync: readFileSync,
        writeFile: writeFile,
        writeFileSync: writeFileSync,
      };
      e.exports = u;
    },
    function(e, t, r) {
      'use strict';
      const n = r(323).fromCallback;
      const u = r(747);
      const i = r(622);
      const o = r(467);
      const a = r(135);
      const s = n(function emptyDir(e, t) {
        t = t || function() {};
        u.readdir(e, (r, n) => {
          if (r) return o.mkdirs(e, t);
          n = n.map(t => i.join(e, t));
          deleteItem();
          function deleteItem() {
            const e = n.pop();
            if (!e) return t();
            a.remove(e, e => {
              if (e) return t(e);
              deleteItem();
            });
          }
        });
      });
      function emptyDirSync(e) {
        let t;
        try {
          t = u.readdirSync(e);
        } catch (t) {
          return o.mkdirsSync(e);
        }
        t.forEach(t => {
          t = i.join(e, t);
          a.removeSync(t);
        });
      }
      e.exports = {
        emptyDirSync: emptyDirSync,
        emptydirSync: emptyDirSync,
        emptyDir: s,
        emptydir: s,
      };
    },
    ,
    function(e, t, r) {
      'use strict';
      const n = r(323).fromPromise;
      const u = r(778);
      function pathExists(e) {
        return u
          .access(e)
          .then(() => true)
          .catch(() => false);
      }
      e.exports = { pathExists: n(pathExists), pathExistsSync: u.existsSync };
    },
    ,
    function(e, t, r) {
      'use strict';
      var n = r(249);
      var u = r(49);
      e.exports = function(e, t) {
        e.parser
          .set('bos', function() {
            if (!this.parsed) {
              this.ast = this.nodes[0] = new n(this.ast);
            }
          })
          .set('escape', function() {
            var e = this.position();
            var r = this.match(/^(?:\\(.)|\$\{)/);
            if (!r) return;
            var i = this.prev();
            var o = u.last(i.nodes);
            var a = e(new n({ type: 'text', multiplier: 1, val: r[0] }));
            if (a.val === '\\\\') {
              return a;
            }
            if (a.val === '${') {
              var s = this.input;
              var c = -1;
              var f;
              while ((f = s[++c])) {
                this.consume(1);
                a.val += f;
                if (f === '\\') {
                  a.val += s[++c];
                  continue;
                }
                if (f === '}') {
                  break;
                }
              }
            }
            if (this.options.unescape !== false) {
              a.val = a.val.replace(/\\([{}])/g, '$1');
            }
            if (o.val === '"' && this.input.charAt(0) === '"') {
              o.val = a.val;
              this.consume(1);
              return;
            }
            return concatNodes.call(this, e, a, i, t);
          })
          .set('bracket', function() {
            var e = this.isInside('brace');
            var t = this.position();
            var r = this.match(/^(?:\[([!^]?)([^\]]{2,}|\]-)(\]|[^*+?]+)|\[)/);
            if (!r) return;
            var u = this.prev();
            var i = r[0];
            var o = r[1] ? '^' : '';
            var a = r[2] || '';
            var s = r[3] || '';
            if (e && u.type === 'brace') {
              u.text = u.text || '';
              u.text += i;
            }
            var c = this.input.slice(0, 2);
            if (a === '' && c === '\\]') {
              a += c;
              this.consume(2);
              var f = this.input;
              var l = -1;
              var p;
              while ((p = f[++l])) {
                this.consume(1);
                if (p === ']') {
                  s = p;
                  break;
                }
                a += p;
              }
            }
            return t(
              new n({ type: 'bracket', val: i, escaped: s !== ']', negated: o, inner: a, close: s })
            );
          })
          .set('multiplier', function() {
            var e = this.isInside('brace');
            var r = this.position();
            var u = this.match(/^\{((?:,|\{,+\})+)\}/);
            if (!u) return;
            this.multiplier = true;
            var i = this.prev();
            var o = u[0];
            if (e && i.type === 'brace') {
              i.text = i.text || '';
              i.text += o;
            }
            var a = r(new n({ type: 'text', multiplier: 1, match: u, val: o }));
            return concatNodes.call(this, r, a, i, t);
          })
          .set('brace.open', function() {
            var e = this.position();
            var t = this.match(/^\{(?!(?:[^\\}]?|,+)\})/);
            if (!t) return;
            var r = this.prev();
            var i = u.last(r.nodes);
            if (i && i.val && isExtglobChar(i.val.slice(-1))) {
              i.optimize = false;
            }
            var o = e(new n({ type: 'brace.open', val: t[0] }));
            var a = e(new n({ type: 'brace', nodes: [] }));
            a.push(o);
            r.push(a);
            this.push('brace', a);
          })
          .set('brace.close', function() {
            var e = this.position();
            var t = this.match(/^\}/);
            if (!t || !t[0]) return;
            var r = this.pop('brace');
            var i = e(new n({ type: 'brace.close', val: t[0] }));
            if (!this.isType(r, 'brace')) {
              if (this.options.strict) {
                throw new Error('missing opening "{"');
              }
              i.type = 'text';
              i.multiplier = 0;
              i.escaped = true;
              return i;
            }
            var o = this.prev();
            var a = u.last(o.nodes);
            if (a.text) {
              var s = u.last(a.nodes);
              if (s.val === ')' && /[!@*?+]\(/.test(a.text)) {
                var c = a.nodes[0];
                var f = a.nodes[1];
                if (c.type === 'brace.open' && f && f.type === 'text') {
                  f.optimize = false;
                }
              }
            }
            if (r.nodes.length > 2) {
              var l = r.nodes[1];
              if (l.type === 'text' && l.val === ',') {
                r.nodes.splice(1, 1);
                r.nodes.push(l);
              }
            }
            r.push(i);
          })
          .set('boundary', function() {
            var e = this.position();
            var t = this.match(/^[$^](?!\{)/);
            if (!t) return;
            return e(new n({ type: 'text', val: t[0] }));
          })
          .set('nobrace', function() {
            var e = this.isInside('brace');
            var t = this.position();
            var r = this.match(/^\{[^,]?\}/);
            if (!r) return;
            var u = this.prev();
            var i = r[0];
            if (e && u.type === 'brace') {
              u.text = u.text || '';
              u.text += i;
            }
            return t(new n({ type: 'text', multiplier: 0, val: i }));
          })
          .set('text', function() {
            var e = this.isInside('brace');
            var r = this.position();
            var u = this.match(/^((?!\\)[^${}[\]])+/);
            if (!u) return;
            var i = this.prev();
            var o = u[0];
            if (e && i.type === 'brace') {
              i.text = i.text || '';
              i.text += o;
            }
            var a = r(new n({ type: 'text', multiplier: 1, val: o }));
            return concatNodes.call(this, r, a, i, t);
          });
      };
      function isExtglobChar(e) {
        return e === '!' || e === '@' || e === '*' || e === '?' || e === '+';
      }
      function concatNodes(e, t, r, n) {
        t.orig = t.val;
        var i = this.prev();
        var o = u.last(i.nodes);
        var a = false;
        if (t.val.length > 1) {
          var s = t.val.charAt(0);
          var c = t.val.slice(-1);
          a = (s === '"' && c === '"') || (s === "'" && c === "'") || (s === '`' && c === '`');
        }
        if (a && n.unescape !== false) {
          t.val = t.val.slice(1, t.val.length - 1);
          t.escaped = true;
        }
        if (t.match) {
          var f = t.match[1];
          if (!f || f.indexOf('}') === -1) {
            f = t.match[0];
          }
          var l = f.replace(/\{/g, ',').replace(/\}/g, '');
          t.multiplier *= l.length;
          t.val = '';
        }
        var p = o.type === 'text' && o.multiplier === 1 && t.multiplier === 1 && t.val;
        if (p) {
          o.val += t.val;
          return;
        }
        i.push(t);
      }
    },
    ,
    function(e, t, r) {
      var n = r(491);
      function baseAssignValue(e, t, r) {
        if (t == '__proto__' && n) {
          n(e, t, { configurable: true, enumerable: true, value: r, writable: true });
        } else {
          e[t] = r;
        }
      }
      e.exports = baseAssignValue;
    },
    function(e) {
      var t = Array.isArray;
      e.exports = t;
    },
    ,
    function(e, t, r) {
      'use strict';
      var n = r(755);
      e.exports = function isExtendable(e) {
        return n(e) || typeof e === 'function' || Array.isArray(e);
      };
    },
    function(e, t, r) {
      'use strict';
      const n = r(729);
      const u = r(622);
      const i = r(583).copySync;
      const o = r(135).removeSync;
      const a = r(467).mkdirsSync;
      const s = r(139);
      function moveSync(e, t, r) {
        r = r || {};
        const i = r.overwrite || r.clobber || false;
        e = u.resolve(e);
        t = u.resolve(t);
        if (e === t) return n.accessSync(e);
        if (isSrcSubdir(e, t)) throw new Error(`Cannot move '${e}' into itself '${t}'.`);
        a(u.dirname(t));
        tryRenameSync();
        function tryRenameSync() {
          if (i) {
            try {
              return n.renameSync(e, t);
            } catch (n) {
              if (n.code === 'ENOTEMPTY' || n.code === 'EEXIST' || n.code === 'EPERM') {
                o(t);
                r.overwrite = false;
                return moveSync(e, t, r);
              }
              if (n.code !== 'EXDEV') throw n;
              return moveSyncAcrossDevice(e, t, i);
            }
          } else {
            try {
              n.linkSync(e, t);
              return n.unlinkSync(e);
            } catch (r) {
              if (
                r.code === 'EXDEV' ||
                r.code === 'EISDIR' ||
                r.code === 'EPERM' ||
                r.code === 'ENOTSUP'
              ) {
                return moveSyncAcrossDevice(e, t, i);
              }
              throw r;
            }
          }
        }
      }
      function moveSyncAcrossDevice(e, t, r) {
        const u = n.statSync(e);
        if (u.isDirectory()) {
          return moveDirSyncAcrossDevice(e, t, r);
        } else {
          return moveFileSyncAcrossDevice(e, t, r);
        }
      }
      function moveFileSyncAcrossDevice(e, t, r) {
        const u = 64 * 1024;
        const i = s(u);
        const o = r ? 'w' : 'wx';
        const a = n.openSync(e, 'r');
        const c = n.fstatSync(a);
        const f = n.openSync(t, o, c.mode);
        let l = 0;
        while (l < c.size) {
          const e = n.readSync(a, i, 0, u, l);
          n.writeSync(f, i, 0, e);
          l += e;
        }
        n.closeSync(a);
        n.closeSync(f);
        return n.unlinkSync(e);
      }
      function moveDirSyncAcrossDevice(e, t, r) {
        const n = { overwrite: false };
        if (r) {
          o(t);
          tryCopySync();
        } else {
          tryCopySync();
        }
        function tryCopySync() {
          i(e, t, n);
          return o(e);
        }
      }
      function isSrcSubdir(e, t) {
        try {
          return (
            n.statSync(e).isDirectory() &&
            e !== t &&
            t.indexOf(e) > -1 &&
            t.split(u.dirname(e) + u.sep)[1].split(u.sep)[0] === u.basename(e)
          );
        } catch (e) {
          return false;
        }
      }
      e.exports = { moveSync: moveSync };
    },
    function(e, t, r) {
      'use strict';
      var n = r(49);
      e.exports = function(e, t) {
        e.compiler
          .set('bos', function() {
            if (this.output) return;
            this.ast.queue = isEscaped(this.ast) ? [this.ast.val] : [];
            this.ast.count = 1;
          })
          .set('bracket', function(e) {
            var t = e.close;
            var r = !e.escaped ? '[' : '\\[';
            var u = e.negated;
            var i = e.inner;
            i = i.replace(/\\(?=[\\\w]|$)/g, '\\\\');
            if (i === ']-') {
              i = '\\]\\-';
            }
            if (u && i.indexOf('.') === -1) {
              i += '.';
            }
            if (u && i.indexOf('/') === -1) {
              i += '/';
            }
            var o = r + u + i + t;
            var a = e.parent.queue;
            var s = n.arrayify(a.pop());
            a.push(n.join(s, o));
            a.push.apply(a, []);
          })
          .set('brace', function(e) {
            e.queue = isEscaped(e) ? [e.val] : [];
            e.count = 1;
            return this.mapVisit(e.nodes);
          })
          .set('brace.open', function(e) {
            e.parent.open = e.val;
          })
          .set('text', function(e) {
            var r = e.parent.queue;
            var u = e.escaped;
            var i = [e.val];
            if (e.optimize === false) {
              t = n.extend({}, t, { optimize: false });
            }
            if (e.multiplier > 1) {
              e.parent.count *= e.multiplier;
            }
            if (t.quantifiers === true && n.isQuantifier(e.val)) {
              u = true;
            } else if (e.val.length > 1) {
              if (isType(e.parent, 'brace') && !isEscaped(e)) {
                var o = n.expand(e.val, t);
                i = o.segs;
                if (o.isOptimized) {
                  e.parent.isOptimized = true;
                }
                if (!i.length) {
                  var a = o.val || e.val;
                  if (t.unescape !== false) {
                    a = a.replace(/\\([,.])/g, '$1');
                    a = a.replace(/["'`]/g, '');
                  }
                  i = [a];
                  u = true;
                }
              }
            } else if (e.val === ',') {
              if (t.expand) {
                e.parent.queue.push(['']);
                i = [''];
              } else {
                i = ['|'];
              }
            } else {
              u = true;
            }
            if (u && isType(e.parent, 'brace')) {
              if (e.parent.nodes.length <= 4 && e.parent.count === 1) {
                e.parent.escaped = true;
              } else if (e.parent.length <= 3) {
                e.parent.escaped = true;
              }
            }
            if (!hasQueue(e.parent)) {
              e.parent.queue = i;
              return;
            }
            var s = n.arrayify(r.pop());
            if (e.parent.count > 1 && t.expand) {
              s = multiply(s, e.parent.count);
              e.parent.count = 1;
            }
            r.push(n.join(n.flatten(s), i.shift()));
            r.push.apply(r, i);
          })
          .set('brace.close', function(e) {
            var r = e.parent.queue;
            var u = e.parent.parent;
            var i = u.queue.pop();
            var o = e.parent.open;
            var a = e.val;
            if (o && a && isOptimized(e, t)) {
              o = '(';
              a = ')';
            }
            var s = n.last(r);
            if (e.parent.count > 1 && t.expand) {
              s = multiply(r.pop(), e.parent.count);
              e.parent.count = 1;
              r.push(s);
            }
            if (a && typeof s === 'string' && s.length === 1) {
              o = '';
              a = '';
            }
            if ((isLiteralBrace(e, t) || noInner(e)) && !e.parent.hasEmpty) {
              r.push(n.join(o, r.pop() || ''));
              r = n.flatten(n.join(r, a));
            }
            if (typeof i === 'undefined') {
              u.queue = [r];
            } else {
              u.queue.push(n.flatten(n.join(i, r)));
            }
          })
          .set('eos', function(e) {
            if (this.input) return;
            if (t.optimize !== false) {
              this.output = n.last(n.flatten(this.ast.queue));
            } else if (Array.isArray(n.last(this.ast.queue))) {
              this.output = n.flatten(this.ast.queue.pop());
            } else {
              this.output = n.flatten(this.ast.queue);
            }
            if (e.parent.count > 1 && t.expand) {
              this.output = multiply(this.output, e.parent.count);
            }
            this.output = n.arrayify(this.output);
            this.ast.queue = [];
          });
      };
      function multiply(e, t, r) {
        return n.flatten(n.repeat(n.arrayify(e), t));
      }
      function isEscaped(e) {
        return e.escaped === true;
      }
      function isOptimized(e, t) {
        if (e.parent.isOptimized) return true;
        return isType(e.parent, 'brace') && !isEscaped(e.parent) && t.expand !== true;
      }
      function isLiteralBrace(e, t) {
        return isEscaped(e.parent) || t.optimize !== false;
      }
      function noInner(e, t) {
        if (e.parent.queue.length === 1) {
          return true;
        }
        var r = e.parent.nodes;
        return (
          r.length === 3 &&
          isType(r[0], 'brace.open') &&
          !isType(r[1], 'text') &&
          isType(r[2], 'brace.close')
        );
      }
      function isType(e, t) {
        return typeof e !== 'undefined' && e.type === t;
      }
      function hasQueue(e) {
        return Array.isArray(e.queue) && e.queue.length;
      }
    },
    function(e, t, r) {
      'use strict';
      const n = r(323).fromCallback;
      const u = r(622);
      const i = r(729);
      const o = r(467);
      const a = r(780).pathExists;
      function createFile(e, t) {
        function makeFile() {
          i.writeFile(e, '', e => {
            if (e) return t(e);
            t();
          });
        }
        i.stat(e, (r, n) => {
          if (!r && n.isFile()) return t();
          const i = u.dirname(e);
          a(i, (e, r) => {
            if (e) return t(e);
            if (r) return makeFile();
            o.mkdirs(i, e => {
              if (e) return t(e);
              makeFile();
            });
          });
        });
      }
      function createFileSync(e) {
        let t;
        try {
          t = i.statSync(e);
        } catch (e) {}
        if (t && t.isFile()) return;
        const r = u.dirname(e);
        if (!i.existsSync(r)) {
          o.mkdirsSync(r);
        }
        i.writeFileSync(e, '');
      }
      e.exports = { createFile: n(createFile), createFileSync: createFileSync };
    },
    function(e, t, r) {
      var n = r(229);
      var u = Object.prototype.toString;
      e.exports = function kindOf(e) {
        if (typeof e === 'undefined') {
          return 'undefined';
        }
        if (e === null) {
          return 'null';
        }
        if (e === true || e === false || e instanceof Boolean) {
          return 'boolean';
        }
        if (typeof e === 'string' || e instanceof String) {
          return 'string';
        }
        if (typeof e === 'number' || e instanceof Number) {
          return 'number';
        }
        if (typeof e === 'function' || e instanceof Function) {
          return 'function';
        }
        if (typeof Array.isArray !== 'undefined' && Array.isArray(e)) {
          return 'array';
        }
        if (e instanceof RegExp) {
          return 'regexp';
        }
        if (e instanceof Date) {
          return 'date';
        }
        var t = u.call(e);
        if (t === '[object RegExp]') {
          return 'regexp';
        }
        if (t === '[object Date]') {
          return 'date';
        }
        if (t === '[object Arguments]') {
          return 'arguments';
        }
        if (t === '[object Error]') {
          return 'error';
        }
        if (n(e)) {
          return 'buffer';
        }
        if (t === '[object Set]') {
          return 'set';
        }
        if (t === '[object WeakSet]') {
          return 'weakset';
        }
        if (t === '[object Map]') {
          return 'map';
        }
        if (t === '[object WeakMap]') {
          return 'weakmap';
        }
        if (t === '[object Symbol]') {
          return 'symbol';
        }
        if (t === '[object Int8Array]') {
          return 'int8array';
        }
        if (t === '[object Uint8Array]') {
          return 'uint8array';
        }
        if (t === '[object Uint8ClampedArray]') {
          return 'uint8clampedarray';
        }
        if (t === '[object Int16Array]') {
          return 'int16array';
        }
        if (t === '[object Uint16Array]') {
          return 'uint16array';
        }
        if (t === '[object Int32Array]') {
          return 'int32array';
        }
        if (t === '[object Uint32Array]') {
          return 'uint32array';
        }
        if (t === '[object Float32Array]') {
          return 'float32array';
        }
        if (t === '[object Float64Array]') {
          return 'float64array';
        }
        return 'object';
      };
    },
    ,
    function(e, t, r) {
      'use strict';
      const n = r(323).fromCallback;
      const u = r(622);
      const i = r(729);
      const o = r(983);
      const a = o.mkdirs;
      const s = o.mkdirsSync;
      const c = r(867);
      const f = c.symlinkPaths;
      const l = c.symlinkPathsSync;
      const p = r(775);
      const h = p.symlinkType;
      const d = p.symlinkTypeSync;
      const y = r(917).pathExists;
      function createSymlink(e, t, r, n) {
        n = typeof r === 'function' ? r : n;
        r = typeof r === 'function' ? false : r;
        y(t, (o, s) => {
          if (o) return n(o);
          if (s) return n(null);
          f(e, t, (o, s) => {
            if (o) return n(o);
            e = s.toDst;
            h(s.toCwd, r, (r, o) => {
              if (r) return n(r);
              const s = u.dirname(t);
              y(s, (r, u) => {
                if (r) return n(r);
                if (u) return i.symlink(e, t, o, n);
                a(s, r => {
                  if (r) return n(r);
                  i.symlink(e, t, o, n);
                });
              });
            });
          });
        });
      }
      function createSymlinkSync(e, t, r, n) {
        n = typeof r === 'function' ? r : n;
        r = typeof r === 'function' ? false : r;
        const o = i.existsSync(t);
        if (o) return undefined;
        const a = l(e, t);
        e = a.toDst;
        r = d(a.toCwd, r);
        const c = u.dirname(t);
        const f = i.existsSync(c);
        if (f) return i.symlinkSync(e, t, r);
        s(c);
        return i.symlinkSync(e, t, r);
      }
      e.exports = { createSymlink: n(createSymlink), createSymlinkSync: createSymlinkSync };
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(87);
      const u = r(804);
      const i = process.env;
      let o;
      if (u('no-color') || u('no-colors') || u('color=false')) {
        o = false;
      } else if (u('color') || u('colors') || u('color=true') || u('color=always')) {
        o = true;
      }
      if ('FORCE_COLOR' in i) {
        o = i.FORCE_COLOR.length === 0 || parseInt(i.FORCE_COLOR, 10) !== 0;
      }
      function translateLevel(e) {
        if (e === 0) {
          return false;
        }
        return { level: e, hasBasic: true, has256: e >= 2, has16m: e >= 3 };
      }
      function supportsColor(e) {
        if (o === false) {
          return 0;
        }
        if (u('color=16m') || u('color=full') || u('color=truecolor')) {
          return 3;
        }
        if (u('color=256')) {
          return 2;
        }
        if (e && !e.isTTY && o !== true) {
          return 0;
        }
        const t = o ? 1 : 0;
        if (process.platform === 'win32') {
          const e = n.release().split('.');
          if (
            Number(process.versions.node.split('.')[0]) >= 8 &&
            Number(e[0]) >= 10 &&
            Number(e[2]) >= 10586
          ) {
            return Number(e[2]) >= 14931 ? 3 : 2;
          }
          return 1;
        }
        if ('CI' in i) {
          if (
            ['TRAVIS', 'CIRCLECI', 'APPVEYOR', 'GITLAB_CI'].some(e => e in i) ||
            i.CI_NAME === 'codeship'
          ) {
            return 1;
          }
          return t;
        }
        if ('TEAMCITY_VERSION' in i) {
          return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(i.TEAMCITY_VERSION) ? 1 : 0;
        }
        if (i.COLORTERM === 'truecolor') {
          return 3;
        }
        if ('TERM_PROGRAM' in i) {
          const e = parseInt((i.TERM_PROGRAM_VERSION || '').split('.')[0], 10);
          switch (i.TERM_PROGRAM) {
            case 'iTerm.app':
              return e >= 3 ? 3 : 2;
            case 'Apple_Terminal':
              return 2;
          }
        }
        if (/-256(color)?$/i.test(i.TERM)) {
          return 2;
        }
        if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(i.TERM)) {
          return 1;
        }
        if ('COLORTERM' in i) {
          return 1;
        }
        if (i.TERM === 'dumb') {
          return t;
        }
        return t;
      }
      function getSupportLevel(e) {
        const t = supportsColor(e);
        return translateLevel(t);
      }
      e.exports = {
        supportsColor: getSupportLevel,
        stdout: getSupportLevel(process.stdout),
        stderr: getSupportLevel(process.stderr),
      };
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(729);
      const u = r(87);
      const i = r(622);
      function hasMillisResSync() {
        let e = i.join(
          'millis-test-sync' +
            Date.now().toString() +
            Math.random()
              .toString()
              .slice(2)
        );
        e = i.join(u.tmpdir(), e);
        const t = new Date(1435410243862);
        n.writeFileSync(e, 'https://github.com/jprichardson/node-fs-extra/pull/141');
        const r = n.openSync(e, 'r+');
        n.futimesSync(r, t, t);
        n.closeSync(r);
        return n.statSync(e).mtime > 1435410243e3;
      }
      function hasMillisRes(e) {
        let t = i.join(
          'millis-test' +
            Date.now().toString() +
            Math.random()
              .toString()
              .slice(2)
        );
        t = i.join(u.tmpdir(), t);
        const r = new Date(1435410243862);
        n.writeFile(t, 'https://github.com/jprichardson/node-fs-extra/pull/141', u => {
          if (u) return e(u);
          n.open(t, 'r+', (u, i) => {
            if (u) return e(u);
            n.futimes(i, r, r, r => {
              if (r) return e(r);
              n.close(i, r => {
                if (r) return e(r);
                n.stat(t, (t, r) => {
                  if (t) return e(t);
                  e(null, r.mtime > 1435410243e3);
                });
              });
            });
          });
        });
      }
      function timeRemoveMillis(e) {
        if (typeof e === 'number') {
          return Math.floor(e / 1e3) * 1e3;
        } else if (e instanceof Date) {
          return new Date(Math.floor(e.getTime() / 1e3) * 1e3);
        } else {
          throw new Error('fs-extra: timeRemoveMillis() unknown parameter type');
        }
      }
      function utimesMillis(e, t, r, u) {
        n.open(e, 'r+', (e, i) => {
          if (e) return u(e);
          n.futimes(i, t, r, e => {
            n.close(i, t => {
              if (u) u(e || t);
            });
          });
        });
      }
      function utimesMillisSync(e, t, r) {
        const u = n.openSync(e, 'r+');
        n.futimesSync(u, t, r);
        return n.closeSync(u);
      }
      e.exports = {
        hasMillisRes: hasMillisRes,
        hasMillisResSync: hasMillisResSync,
        timeRemoveMillis: timeRemoveMillis,
        utimesMillis: utimesMillis,
        utimesMillisSync: utimesMillisSync,
      };
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      var n = r(669);
      var u = r(870);
      var i = r(192);
      var o = r(360);
      var a = r(475);
      function fillRange(e, t, r, o) {
        if (typeof e === 'undefined') {
          return [];
        }
        if (typeof t === 'undefined' || e === t) {
          var a = typeof e === 'string';
          if (u(e) && !toNumber(e)) {
            return [a ? '0' : 0];
          }
          return [e];
        }
        if (typeof r !== 'number' && typeof r !== 'string') {
          o = r;
          r = undefined;
        }
        if (typeof o === 'function') {
          o = { transform: o };
        }
        var s = i({ step: r }, o);
        if (s.step && !isValidNumber(s.step)) {
          if (s.strictRanges === true) {
            throw new TypeError('expected options.step to be a number');
          }
          return [];
        }
        s.isNumber = isValidNumber(e) && isValidNumber(t);
        if (!s.isNumber && !isValid(e, t)) {
          if (s.strictRanges === true) {
            throw new RangeError('invalid range arguments: ' + n.inspect([e, t]));
          }
          return [];
        }
        s.isPadded = isPadded(e) || isPadded(t);
        s.toString =
          s.stringify ||
          typeof s.step === 'string' ||
          typeof e === 'string' ||
          typeof t === 'string' ||
          !s.isNumber;
        if (s.isPadded) {
          s.maxLength = Math.max(String(e).length, String(t).length);
        }
        if (typeof s.optimize === 'boolean') s.toRegex = s.optimize;
        if (typeof s.makeRe === 'boolean') s.toRegex = s.makeRe;
        return expand(e, t, s);
      }
      function expand(e, t, r) {
        var n = r.isNumber ? toNumber(e) : e.charCodeAt(0);
        var u = r.isNumber ? toNumber(t) : t.charCodeAt(0);
        var i = Math.abs(toNumber(r.step)) || 1;
        if (r.toRegex && i === 1) {
          return toRange(n, u, e, t, r);
        }
        var o = { greater: [], lesser: [] };
        var a = n < u;
        var s = new Array(Math.round((a ? u - n : n - u) / i));
        var c = 0;
        while (a ? n <= u : n >= u) {
          var f = r.isNumber ? n : String.fromCharCode(n);
          if (r.toRegex && (f >= 0 || !r.isNumber)) {
            o.greater.push(f);
          } else {
            o.lesser.push(Math.abs(f));
          }
          if (r.isPadded) {
            f = zeros(f, r);
          }
          if (r.toString) {
            f = String(f);
          }
          if (typeof r.transform === 'function') {
            s[c++] = r.transform(f, n, u, i, c, s, r);
          } else {
            s[c++] = f;
          }
          if (a) {
            n += i;
          } else {
            n -= i;
          }
        }
        if (r.toRegex === true) {
          return toSequence(s, o, r);
        }
        return s;
      }
      function toRange(e, t, r, n, u) {
        if (u.isPadded) {
          return a(r, n, u);
        }
        if (u.isNumber) {
          return a(Math.min(e, t), Math.max(e, t), u);
        }
        var r = String.fromCharCode(Math.min(e, t));
        var n = String.fromCharCode(Math.max(e, t));
        return '[' + r + '-' + n + ']';
      }
      function toSequence(e, t, r) {
        var n = '',
          u = '';
        if (t.greater.length) {
          n = t.greater.join('|');
        }
        if (t.lesser.length) {
          u = '-(' + t.lesser.join('|') + ')';
        }
        var i = n && u ? n + '|' + u : n || u;
        if (r.capture) {
          return '(' + i + ')';
        }
        return i;
      }
      function zeros(e, t) {
        if (t.isPadded) {
          var r = String(e);
          var n = r.length;
          var u = '';
          if (r.charAt(0) === '-') {
            u = '-';
            r = r.slice(1);
          }
          var i = t.maxLength - n;
          var a = o('0', i);
          e = u + a + r;
        }
        if (t.stringify) {
          return String(e);
        }
        return e;
      }
      function toNumber(e) {
        return Number(e) || 0;
      }
      function isPadded(e) {
        return /^-?0\d/.test(e);
      }
      function isValid(e, t) {
        return (isValidNumber(e) || isValidLetter(e)) && (isValidNumber(t) || isValidLetter(t));
      }
      function isValidLetter(e) {
        return typeof e === 'string' && e.length === 1 && /^\w+$/.test(e);
      }
      function isValidNumber(e) {
        return u(e) && !/\./.test(e);
      }
      e.exports = fillRange;
    },
    function(e, t, r) {
      var n = r(641);
      var u = r(352);
      var i = r(191);
      var o = r(246);
      e.exports = function(e) {
        var t = 0,
          r,
          a,
          s = { type: u.ROOT, stack: [] },
          c = s,
          f = s.stack,
          l = [];
        var p = function(t) {
          n.error(e, 'Nothing to repeat at column ' + (t - 1));
        };
        var h = n.strToChars(e);
        r = h.length;
        while (t < r) {
          a = h[t++];
          switch (a) {
            case '\\':
              a = h[t++];
              switch (a) {
                case 'b':
                  f.push(o.wordBoundary());
                  break;
                case 'B':
                  f.push(o.nonWordBoundary());
                  break;
                case 'w':
                  f.push(i.words());
                  break;
                case 'W':
                  f.push(i.notWords());
                  break;
                case 'd':
                  f.push(i.ints());
                  break;
                case 'D':
                  f.push(i.notInts());
                  break;
                case 's':
                  f.push(i.whitespace());
                  break;
                case 'S':
                  f.push(i.notWhitespace());
                  break;
                default:
                  if (/\d/.test(a)) {
                    f.push({ type: u.REFERENCE, value: parseInt(a, 10) });
                  } else {
                    f.push({ type: u.CHAR, value: a.charCodeAt(0) });
                  }
              }
              break;
            case '^':
              f.push(o.begin());
              break;
            case '$':
              f.push(o.end());
              break;
            case '[':
              var d;
              if (h[t] === '^') {
                d = true;
                t++;
              } else {
                d = false;
              }
              var y = n.tokenizeClass(h.slice(t), e);
              t += y[1];
              f.push({ type: u.SET, set: y[0], not: d });
              break;
            case '.':
              f.push(i.anyChar());
              break;
            case '(':
              var v = { type: u.GROUP, stack: [], remember: true };
              a = h[t];
              if (a === '?') {
                a = h[t + 1];
                t += 2;
                if (a === '=') {
                  v.followedBy = true;
                } else if (a === '!') {
                  v.notFollowedBy = true;
                } else if (a !== ':') {
                  n.error(e, "Invalid group, character '" + a + "' after '?' at column " + (t - 1));
                }
                v.remember = false;
              }
              f.push(v);
              l.push(c);
              c = v;
              f = v.stack;
              break;
            case ')':
              if (l.length === 0) {
                n.error(e, 'Unmatched ) at column ' + (t - 1));
              }
              c = l.pop();
              f = c.options ? c.options[c.options.length - 1] : c.stack;
              break;
            case '|':
              if (!c.options) {
                c.options = [c.stack];
                delete c.stack;
              }
              var D = [];
              c.options.push(D);
              f = D;
              break;
            case '{':
              var m = /^(\d+)(,(\d+)?)?\}/.exec(h.slice(t)),
                A,
                g;
              if (m !== null) {
                if (f.length === 0) {
                  p(t);
                }
                A = parseInt(m[1], 10);
                g = m[2] ? (m[3] ? parseInt(m[3], 10) : Infinity) : A;
                t += m[0].length;
                f.push({ type: u.REPETITION, min: A, max: g, value: f.pop() });
              } else {
                f.push({ type: u.CHAR, value: 123 });
              }
              break;
            case '?':
              if (f.length === 0) {
                p(t);
              }
              f.push({ type: u.REPETITION, min: 0, max: 1, value: f.pop() });
              break;
            case '+':
              if (f.length === 0) {
                p(t);
              }
              f.push({ type: u.REPETITION, min: 1, max: Infinity, value: f.pop() });
              break;
            case '*':
              if (f.length === 0) {
                p(t);
              }
              f.push({ type: u.REPETITION, min: 0, max: Infinity, value: f.pop() });
              break;
            default:
              f.push({ type: u.CHAR, value: a.charCodeAt(0) });
          }
        }
        if (l.length !== 0) {
          n.error(e, 'Unterminated group');
        }
        return s;
      };
      e.exports.types = u;
    },
    ,
    ,
    ,
    function(e) {
      e.exports = require('http');
    },
    ,
    function(e, t, r) {
      'use strict';
      const n = r(323).fromCallback;
      const u = r(914);
      e.exports = {
        readJson: n(u.readFile),
        readJsonSync: u.readFileSync,
        writeJson: n(u.writeFile),
        writeJsonSync: u.writeFileSync,
      };
    },
    function(e, t, r) {
      'use strict';
      var n =
        (this && this.__importDefault) ||
        function(e) {
          return e && e.__esModule ? e : { default: e };
        };
      Object.defineProperty(t, '__esModule', { value: true });
      const u = n(r(799));
      function resolveModule(e, t, r) {
        const n = r.nodeModulesPath ? r.nodeModulesPath : t;
        return u.default(n, e);
      }
      t.resolveModule = resolveModule;
      function projectHasModule(e, t, r) {
        const n = r.nodeModulesPath ? r.nodeModulesPath : t;
        return u.default.silent(n, e);
      }
      t.projectHasModule = projectHasModule;
      function moduleNameFromPath(e) {
        if (e.startsWith('@')) {
          const [t, r] = e.split('/');
          if (t && r) {
            return [t, r].join('/');
          }
          return e;
        }
        const [t] = e.split('/');
        return t ? t : e;
      }
      t.moduleNameFromPath = moduleNameFromPath;
    },
    function(e, t, r) {
      var n = r(107);
      function listCacheSet(e, t) {
        var r = this.__data__,
          u = n(r, e);
        if (u < 0) {
          ++this.size;
          r.push([e, t]);
        } else {
          r[u][1] = t;
        }
        return this;
      }
      e.exports = listCacheSet;
    },
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    function(e, t, r) {
      var n = r(311),
        u = r(868);
      var i = '[object Symbol]';
      function isSymbol(e) {
        return typeof e == 'symbol' || (u(e) && n(e) == i);
      }
      e.exports = isSymbol;
    },
    function(e, t, r) {
      'use strict';
      var n = r(669);
      var u = r(548);
      var i = r(785);
      var o = r(888);
      var a = r(58);
      var s = e.exports;
      s.isObject = function isObject(e) {
        return a(e) || typeof e === 'function';
      };
      s.has = function has(e, t) {
        t = s.arrayify(t);
        var r = t.length;
        if (s.isObject(e)) {
          for (var n in e) {
            if (t.indexOf(n) > -1) {
              return true;
            }
          }
          var u = s.nativeKeys(e);
          return s.has(u, t);
        }
        if (Array.isArray(e)) {
          var i = e;
          while (r--) {
            if (i.indexOf(t[r]) > -1) {
              return true;
            }
          }
          return false;
        }
        throw new TypeError('expected an array or object.');
      };
      s.hasAll = function hasAll(e, t) {
        t = s.arrayify(t);
        var r = t.length;
        while (r--) {
          if (!s.has(e, t[r])) {
            return false;
          }
        }
        return true;
      };
      s.arrayify = function arrayify(e) {
        return e ? (Array.isArray(e) ? e : [e]) : [];
      };
      s.noop = function noop() {
        return;
      };
      s.identity = function identity(e) {
        return e;
      };
      s.hasConstructor = function hasConstructor(e) {
        return s.isObject(e) && typeof e.constructor !== 'undefined';
      };
      s.nativeKeys = function nativeKeys(e) {
        if (!s.hasConstructor(e)) return [];
        var t = Object.getOwnPropertyNames(e);
        if ('caller' in e) t.push('caller');
        return t;
      };
      s.getDescriptor = function getDescriptor(e, t) {
        if (!s.isObject(e)) {
          throw new TypeError('expected an object.');
        }
        if (typeof t !== 'string') {
          throw new TypeError('expected key to be a string.');
        }
        return Object.getOwnPropertyDescriptor(e, t);
      };
      s.copyDescriptor = function copyDescriptor(e, t, r) {
        if (!s.isObject(e)) {
          throw new TypeError('expected receiving object to be an object.');
        }
        if (!s.isObject(t)) {
          throw new TypeError('expected providing object to be an object.');
        }
        if (typeof r !== 'string') {
          throw new TypeError('expected name to be a string.');
        }
        var n = s.getDescriptor(t, r);
        if (n) Object.defineProperty(e, r, n);
      };
      s.copy = function copy(e, t, r) {
        if (!s.isObject(e)) {
          throw new TypeError('expected receiving object to be an object.');
        }
        if (!s.isObject(t)) {
          throw new TypeError('expected providing object to be an object.');
        }
        var n = Object.getOwnPropertyNames(t);
        var u = Object.keys(t);
        var o = n.length,
          a;
        r = s.arrayify(r);
        while (o--) {
          a = n[o];
          if (s.has(u, a)) {
            i(e, a, t[a]);
          } else if (!(a in e) && !s.has(r, a)) {
            s.copyDescriptor(e, t, a);
          }
        }
      };
      s.inherit = function inherit(e, t, r) {
        if (!s.isObject(e)) {
          throw new TypeError('expected receiving object to be an object.');
        }
        if (!s.isObject(t)) {
          throw new TypeError('expected providing object to be an object.');
        }
        var n = [];
        for (var u in t) {
          n.push(u);
          e[u] = t[u];
        }
        n = n.concat(s.arrayify(r));
        var i = t.prototype || t;
        var o = e.prototype || e;
        s.copy(o, i, n);
      };
      s.extend = function() {
        return o.apply(null, arguments);
      };
      s.bubble = function(e, t) {
        t = t || [];
        e.bubble = function(r, n) {
          if (Array.isArray(n)) {
            t = u([], t, n);
          }
          var i = t.length;
          var o = -1;
          while (++o < i) {
            var a = t[o];
            e.on(a, r.emit.bind(r, a));
          }
          s.bubble(r, t);
        };
      };
    },
    ,
    function(e, t, r) {
      var n = r(211);
      function set(e, t, r) {
        return e == null ? e : n(e, t, r);
      }
      e.exports = set;
    },
    ,
    function(e, t, r) {
      'use strict';
      var n = r(755);
      e.exports = function isExtendable(e) {
        return n(e) || typeof e === 'function' || Array.isArray(e);
      };
    },
    function(e, t, r) {
      'use strict';
      var n = r(964);
      var u = r(14);
      e.exports =
        Object.assign ||
        function(e) {
          if (e === null || typeof e === 'undefined') {
            throw new TypeError('Cannot convert undefined or null to object');
          }
          if (!isObject(e)) {
            e = {};
          }
          for (var t = 1; t < arguments.length; t++) {
            var r = arguments[t];
            if (isString(r)) {
              r = toObject(r);
            }
            if (isObject(r)) {
              assign(e, r);
              u(e, r);
            }
          }
          return e;
        };
      function assign(e, t) {
        for (var r in t) {
          if (hasOwn(t, r)) {
            e[r] = t[r];
          }
        }
      }
      function isString(e) {
        return e && typeof e === 'string';
      }
      function toObject(e) {
        var t = {};
        for (var r in e) {
          t[r] = e[r];
        }
        return t;
      }
      function isObject(e) {
        return (e && typeof e === 'object') || n(e);
      }
      function hasOwn(e, t) {
        return Object.prototype.hasOwnProperty.call(e, t);
      }
      function isEnum(e, t) {
        return Object.prototype.propertyIsEnumerable.call(e, t);
      }
    },
    function(e, t, r) {
      'use strict';
      const n = r(323).fromCallback;
      const u = r(946);
      u.outputJson = n(r(102));
      u.outputJsonSync = r(5);
      u.outputJSON = u.outputJson;
      u.outputJSONSync = u.outputJsonSync;
      u.writeJSON = u.writeJson;
      u.writeJSONSync = u.writeJsonSync;
      u.readJSON = u.readJson;
      u.readJSONSync = u.readJsonSync;
      e.exports = u;
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(323).fromCallback;
      const u = r(622);
      const i = r(729);
      const o = r(467);
      const a = o.mkdirs;
      const s = o.mkdirsSync;
      const c = r(663);
      const f = c.symlinkPaths;
      const l = c.symlinkPathsSync;
      const p = r(442);
      const h = p.symlinkType;
      const d = p.symlinkTypeSync;
      const y = r(780).pathExists;
      function createSymlink(e, t, r, n) {
        n = typeof r === 'function' ? r : n;
        r = typeof r === 'function' ? false : r;
        y(t, (o, s) => {
          if (o) return n(o);
          if (s) return n(null);
          f(e, t, (o, s) => {
            if (o) return n(o);
            e = s.toDst;
            h(s.toCwd, r, (r, o) => {
              if (r) return n(r);
              const s = u.dirname(t);
              y(s, (r, u) => {
                if (r) return n(r);
                if (u) return i.symlink(e, t, o, n);
                a(s, r => {
                  if (r) return n(r);
                  i.symlink(e, t, o, n);
                });
              });
            });
          });
        });
      }
      function createSymlinkSync(e, t, r) {
        const n = i.existsSync(t);
        if (n) return undefined;
        const o = l(e, t);
        e = o.toDst;
        r = d(o.toCwd, r);
        const a = u.dirname(t);
        const c = i.existsSync(a);
        if (c) return i.symlinkSync(e, t, r);
        s(a);
        return i.symlinkSync(e, t, r);
      }
      e.exports = { createSymlink: n(createSymlink), createSymlinkSync: createSymlinkSync };
    },
    function(e) {
      (function() {
        var t;
        function MurmurHash3(e, r) {
          var n = this instanceof MurmurHash3 ? this : t;
          n.reset(r);
          if (typeof e === 'string' && e.length > 0) {
            n.hash(e);
          }
          if (n !== this) {
            return n;
          }
        }
        MurmurHash3.prototype.hash = function(e) {
          var t, r, n, u, i;
          i = e.length;
          this.len += i;
          r = this.k1;
          n = 0;
          switch (this.rem) {
            case 0:
              r ^= i > n ? e.charCodeAt(n++) & 65535 : 0;
            case 1:
              r ^= i > n ? (e.charCodeAt(n++) & 65535) << 8 : 0;
            case 2:
              r ^= i > n ? (e.charCodeAt(n++) & 65535) << 16 : 0;
            case 3:
              r ^= i > n ? (e.charCodeAt(n) & 255) << 24 : 0;
              r ^= i > n ? (e.charCodeAt(n++) & 65280) >> 8 : 0;
          }
          this.rem = (i + this.rem) & 3;
          i -= this.rem;
          if (i > 0) {
            t = this.h1;
            while (1) {
              r = (r * 11601 + (r & 65535) * 3432906752) & 4294967295;
              r = (r << 15) | (r >>> 17);
              r = (r * 13715 + (r & 65535) * 461832192) & 4294967295;
              t ^= r;
              t = (t << 13) | (t >>> 19);
              t = (t * 5 + 3864292196) & 4294967295;
              if (n >= i) {
                break;
              }
              r =
                (e.charCodeAt(n++) & 65535) ^
                ((e.charCodeAt(n++) & 65535) << 8) ^
                ((e.charCodeAt(n++) & 65535) << 16);
              u = e.charCodeAt(n++);
              r ^= ((u & 255) << 24) ^ ((u & 65280) >> 8);
            }
            r = 0;
            switch (this.rem) {
              case 3:
                r ^= (e.charCodeAt(n + 2) & 65535) << 16;
              case 2:
                r ^= (e.charCodeAt(n + 1) & 65535) << 8;
              case 1:
                r ^= e.charCodeAt(n) & 65535;
            }
            this.h1 = t;
          }
          this.k1 = r;
          return this;
        };
        MurmurHash3.prototype.result = function() {
          var e, t;
          e = this.k1;
          t = this.h1;
          if (e > 0) {
            e = (e * 11601 + (e & 65535) * 3432906752) & 4294967295;
            e = (e << 15) | (e >>> 17);
            e = (e * 13715 + (e & 65535) * 461832192) & 4294967295;
            t ^= e;
          }
          t ^= this.len;
          t ^= t >>> 16;
          t = (t * 51819 + (t & 65535) * 2246770688) & 4294967295;
          t ^= t >>> 13;
          t = (t * 44597 + (t & 65535) * 3266445312) & 4294967295;
          t ^= t >>> 16;
          return t >>> 0;
        };
        MurmurHash3.prototype.reset = function(e) {
          this.h1 = typeof e === 'number' ? e : 0;
          this.rem = this.k1 = this.len = 0;
          return this;
        };
        t = new MurmurHash3();
        if (true) {
          e.exports = MurmurHash3;
        } else {
        }
      })();
    },
    ,
    function(e) {
      e.exports = require('@expo/image-utils');
    },
    ,
    function(e, t, r) {
      var n = r(462);
      function toString(e) {
        return e == null ? '' : n(e);
      }
      e.exports = toString;
    },
    function(e, t, r) {
      'use strict';
      var n = r(60);
      e.exports = function defineProperty(e, t, r) {
        if (typeof e !== 'object' && typeof e !== 'function') {
          throw new TypeError('expected an object or function.');
        }
        if (typeof t !== 'string') {
          throw new TypeError('expected `prop` to be a string.');
        }
        if (n(r) && ('set' in r || 'get' in r)) {
          return Object.defineProperty(e, t, r);
        }
        return Object.defineProperty(e, t, {
          configurable: true,
          enumerable: false,
          writable: true,
          value: r,
        });
      };
    },
    function(e, t, r) {
      var n = r(311),
        u = r(868);
      var i = '[object Arguments]';
      function baseIsArguments(e) {
        return u(e) && n(e) == i;
      }
      e.exports = baseIsArguments;
    },
    ,
    ,
    ,
    function(e, t, r) {
      var n = r(835);
      function resolveUrl() {
        return Array.prototype.reduce.call(arguments, function(e, t) {
          return n.resolve(e, t);
        });
      }
      e.exports = resolveUrl;
    },
    ,
    ,
    function(e, t, r) {
      'use strict';
      const n = r(323).fromCallback;
      const u = n(r(611));
      const i = r(666);
      e.exports = {
        mkdirs: u,
        mkdirsSync: i,
        mkdirp: u,
        mkdirpSync: i,
        ensureDir: u,
        ensureDirSync: i,
      };
    },
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    function(e, t, r) {
      var n = r(702);
      var u = Object.prototype.hasOwnProperty;
      var i = typeof Map !== 'undefined';
      function ArraySet() {
        this._array = [];
        this._set = i ? new Map() : Object.create(null);
      }
      ArraySet.fromArray = function ArraySet_fromArray(e, t) {
        var r = new ArraySet();
        for (var n = 0, u = e.length; n < u; n++) {
          r.add(e[n], t);
        }
        return r;
      };
      ArraySet.prototype.size = function ArraySet_size() {
        return i ? this._set.size : Object.getOwnPropertyNames(this._set).length;
      };
      ArraySet.prototype.add = function ArraySet_add(e, t) {
        var r = i ? e : n.toSetString(e);
        var o = i ? this.has(e) : u.call(this._set, r);
        var a = this._array.length;
        if (!o || t) {
          this._array.push(e);
        }
        if (!o) {
          if (i) {
            this._set.set(e, a);
          } else {
            this._set[r] = a;
          }
        }
      };
      ArraySet.prototype.has = function ArraySet_has(e) {
        if (i) {
          return this._set.has(e);
        } else {
          var t = n.toSetString(e);
          return u.call(this._set, t);
        }
      };
      ArraySet.prototype.indexOf = function ArraySet_indexOf(e) {
        if (i) {
          var t = this._set.get(e);
          if (t >= 0) {
            return t;
          }
        } else {
          var r = n.toSetString(e);
          if (u.call(this._set, r)) {
            return this._set[r];
          }
        }
        throw new Error('"' + e + '" is not in the set.');
      };
      ArraySet.prototype.at = function ArraySet_at(e) {
        if (e >= 0 && e < this._array.length) {
          return this._array[e];
        }
        throw new Error('No element indexed by ' + e);
      };
      ArraySet.prototype.toArray = function ArraySet_toArray() {
        return this._array.slice();
      };
      t.ArraySet = ArraySet;
    },
    function(e, t, r) {
      'use strict';
      var n = r(58);
      var u = r(490);
      e.exports = function unset(e, t) {
        if (!n(e)) {
          throw new TypeError('expected an object.');
        }
        if (e.hasOwnProperty(t)) {
          delete e[t];
          return true;
        }
        if (u(e, t)) {
          var r = t.split('.');
          var i = r.pop();
          while (r.length && r[r.length - 1].slice(-1) === '\\') {
            i = r.pop().slice(0, -1) + '.' + i;
          }
          while (r.length) e = e[(t = r.shift())];
          return delete e[i];
        }
        return true;
      };
    },
    function(e) {
      e.exports = require('tty');
    },
    ,
    function(e, t, r) {
      var n = r(582);
      var u = r(622).join;
      var i = r(654);
      var o = '/etc';
      var a = process.platform === 'win32';
      var s = a ? process.env.USERPROFILE : process.env.HOME;
      e.exports = function(e, t, c, f) {
        if ('string' !== typeof e) throw new Error('rc(name): name *must* be string');
        if (!c) c = r(261)(process.argv.slice(2));
        t = ('string' === typeof t ? n.json(t) : t) || {};
        f = f || n.parse;
        var l = n.env(e + '_');
        var p = [t];
        var h = [];
        function addConfigFile(e) {
          if (h.indexOf(e) >= 0) return;
          var t = n.file(e);
          if (t) {
            p.push(f(t));
            h.push(e);
          }
        }
        if (!a) [u(o, e, 'config'), u(o, e + 'rc')].forEach(addConfigFile);
        if (s)
          [
            u(s, '.config', e, 'config'),
            u(s, '.config', e),
            u(s, '.' + e, 'config'),
            u(s, '.' + e + 'rc'),
          ].forEach(addConfigFile);
        addConfigFile(n.find('.' + e + 'rc'));
        if (l.config) addConfigFile(l.config);
        if (c.config) addConfigFile(c.config);
        return i.apply(
          null,
          p.concat([l, c, h.length ? { configs: h, config: h[h.length - 1] } : undefined])
        );
      };
    },
  ],
  function(e) {
    'use strict';
    !(function() {
      e.nmd = function(e) {
        e.paths = [];
        if (!e.children) e.children = [];
        Object.defineProperty(e, 'loaded', {
          enumerable: true,
          get: function() {
            return e.l;
          },
        });
        Object.defineProperty(e, 'id', {
          enumerable: true,
          get: function() {
            return e.i;
          },
        });
        return e;
      };
    })();
  }
);
