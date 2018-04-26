(function() {
    var _router = {};

    /*
    
    qs-router-link

    无论是 HTML5 history 模式还是 hash 模式，它的表现行为一致，所以，当你要切换路由模式，或者在 IE9 降级使用 hash 模式，无须作任何变动。

    在 HTML5 history 模式下，router-link 会守卫点击事件，让浏览器不再重新加载页面。

    当你在 HTML5 history 模式下使用 base 选项之后，所有的 to 属性都不需要写（基路径）了。
    
    */
    var util = {
        getParamsUrl: mode => {
            // TODO
            // /
            // /user/:username/post/:post_id	/user/evan/post/123	{ username: 'evan', post_id: 123 }
            // /foo?user=1

        },

        /**
         * 序列化一个对象
         * param({'a':1, 'b':2}) -----> a=1&b=2
         * param({'result': () => { return 1 + 2; }}) -----> result=3
         * param({ ids: [1,2,3] }) ------> ids=1&ids=2&ids=3 
         * @params {object} obj - 需要序列化的对象
         */
        param: obj => {
            var params = [];

            params.add = function(key, value) {
                if (typeof value === 'function') value = value();
                if (value == null) value = "";
                this.push(encodeURIComponent(key) + '=' + encodeURIComponent(value))
            }

            var foreach = function(elements, callback) {
                var i, key
                if (Array.isArray(elements)) {
                    for (i = 0; i < elements.length; i++)
                        if (callback.call(elements[i], i, elements[i]) === false) return elements;
                } else {
                    for (key in elements)
                        if (callback.call(elements[key], key, elements[key]) === false) return elements;
                }

                return elements;
            }

            var serialize = function(params, obj, traditional, scope) {
                var type,
                    array = Array.isArray(obj),
                    hash = Object.getPrototypeOf(obj) == Object.prototype;

                foreach(obj, function(key, value) {
                    type = toString.call(value);

                    if (scope)
                        key = traditional ? scope : scope + '[' + (hash || type == '[object Object]' || type == '[object Array]' ? key : '') + ']';

                    if (!scope && array)
                        params.add(value.name, value.value)
                    else if (type == '[object Array]' || (!traditional && type == '[object Object]'))
                        serialize(params, value, traditional, key)
                    else
                        params.add(key, value)
                });

            }

            serialize(params, obj, true);

            foreach = null;
            serialize = null;
            return params.join('&').replace(/%20/g, '+');
        },

        /**
         * 转换URL参数为对象
         * @params {string} query - URL参数字符串
         */
        parseQuery: query => {
            var reg = /([^=&\s]+)[=\s]*([^&\s]*)/g;
            var obj = {};

            // 如果没有?就直接忽略当前传入的字符串
            if (query.indexOf('?') > -1) {
                query = query.split('?')[1];
                while (reg.exec(query)) {
                    obj[RegExp.$1] = RegExp.$2;
                }
            }

            return obj;
        },

        /**
         * 根据传入的路径，返回参数列表
         * @param {string} path - 源路径
         * @param {string} url - 获取到的url
         * @return {object} 参数列表
         */
        regExp: (path, url) => {
            let keys = [];
            let PATH_REGEXP = /(\\.)|(?:\:(\w+)(?:\(((?:\\.|[^\\()])+)\))?|\(((?:\\.|[^\\()])+)\))([+*?])?/g;

            let escapeString = function(str) {
                return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, '\\$1');
            }

            /**
             * 根据传入的参数返回匹配到的路径结果，用于生成匹配的正则表达式
             * @param {string} str - 源路径
             * @return {object} 匹配到的结果对象 
             */
            let parse = function(str) {
                var tokens = []
                var key = 0
                var index = 0
                var path = ''
                var defaultDelimiter = './'
                var delimiters = './'
                var pathEscaped = false
                var res

                while ((res = PATH_REGEXP.exec(str)) !== null) {
                    var m = res[0]
                    var escaped = res[1]
                    var offset = res.index
                    path += str.slice(index, offset)
                    index = offset + m.length

                    if (escaped) {
                        path += escaped[1]
                        pathEscaped = true
                        continue
                    }

                    var prev = ''
                    var next = str[index]
                    var name = res[2]
                    var capture = res[3]
                    var group = res[4]
                    var modifier = res[5]

                    if (!pathEscaped && path.length) {
                        var k = path.length - 1

                        if (delimiters.indexOf(path[k]) > -1) {
                            prev = path[k]
                            path = path.slice(0, k)
                        }
                    }

                    if (path) {
                        tokens.push(path)
                        path = ''
                        pathEscaped = false
                    }

                    var repeat = modifier === '+' || modifier === '*'
                    var delimiter = prev || defaultDelimiter
                    var pattern = capture || group
                    var optional = modifier === '?' || modifier === '*'

                    tokens.push({
                        name: name || key++,
                        prefix: prev,
                        delimiter: delimiter,
                        repeat: repeat,
                        optional: optional,
                        pattern: pattern ? escapeGroup(pattern) : '[^' + escapeString(delimiter) + ']+?'
                    })
                }

                if (path || index < str.length) {
                    tokens.push(path + str.substr(index))
                }

                return tokens
            }

            /**
             * 根据传递的tokens对象返回匹配的正则表达式
             * @param {object} tokens - 使用parse方法获取到的路径对象
             * @param {array} keys - 传入的存储匹配到的路径key的值
             * @return {regexp} 用于匹配的正则表达式
             */
            let tokensToRegExp = function(tokens, keys) {

                var delimiter = escapeString('./')
                var delimiters = './'
                var route = ''
                var isEndDelimited = false

                for (var i = 0; i < tokens.length; i++) {
                    var token = tokens[i]

                    if (typeof token === 'string') {
                        route += escapeString(token)
                        isEndDelimited = i === tokens.length - 1 && delimiters.indexOf(token[token.length - 1]) > -1
                    } else {
                        var prefix = escapeString(token.prefix)
                        var capture = token.repeat ?
                            '(?:' + token.pattern + ')(?:' + prefix + '(?:' + token.pattern + '))*' :
                            token.pattern

                        if (keys) keys.push(token)

                        if (token.optional) {
                            if (token.partial) {
                                route += prefix + '(' + capture + ')?'
                            } else {
                                route += '(?:' + prefix + '(' + capture + '))?'
                            }
                        } else {
                            route += prefix + '(' + capture + ')'
                        }
                    }
                }

                return new RegExp('^' + route)
            }

            let pathValue = tokensToRegExp(parse(path), keys).exec(url);
            let result = {};

            if (pathValue) {
                for (let i = 0; i < keys.length; i++) {
                    result[keys[i].name] = pathValue[i + 1];
                }
            } else {
                console.error(`源路径配置参数与URL传递参数个数不符！${path} -> ${url}`);
            }

            return result;
        },

        /**
         * history模式更改状态
         * @params {string} url - 需要更改的url
         * @params {boolen} replace - 区分是替换还是新增的方式
         */
        pushState: function(url, replace) {
            const history = window.history;

            try {

                if (replace) {
                    history.replaceState({ key: this.getKey() }, '', url);
                } else {
                    history.pushState({ key: this.getKey() }, '', url);
                }

            } catch (e) {
                window.location[replace ? 'replace' : 'assign'](url);
            }
        },

        pushHash: hash => {
            window.location.hash = hash;
        },

        // 生成一个唯一KEY
        getKey: () => {
            const Time = window.performance && window.performance.now ? window.performance : Date;
            return parseInt(Time.now());
        },

        /**
         * 根据用户配置生成路由映射map
         * @params {object} object - 用户配置的路由信息对象
         * @params {string} key - 二级路径 
         */
        map: (object, key) => {
            object.forEach(item => {
                let router = key;
                if ("object" === typeof item.component) {
                    let routerItem = {
                        id: '',
                        template: '',
                        before: function() {},
                        after: function() {}
                    }

                    routerItem.id = item.component.id || 'template';
                    routerItem.template = item.component.template;

                    'function' === typeof item.component.beforeRouteUpdate ? routerItem.before = item.component.beforeRouteUpdate : '';
                    'function' === typeof item.component.afterRouteUpdate ? routerItem.after = item.component.afterRouteUpdate : '';

                    if (item.path.charAt(item.path.length - 1) !== '/' && router.charAt(router.length - 1) !== '/') {
                        router = `${key}/${item.path}`;
                    } else if (key != item.path) {
                        router = `${key}${item.path}`;
                    } else {
                        router = `${item.path}`
                    }

                    _router[router] = routerItem;
                }

                if (item.hasOwnProperty('children') && item.children.length) {
                    util.map(item.children, router);
                }

            });
        },

        getLocation: base => {
            let path = window.location.pathname;
            if (base && path.indexOf(base) === 0) {
                path = path.slice(base.length);
            }
            return (path || '/') + window.location.search + window.location.hash;
        },

        cleanPath: path => {
            return path.replace(/\/\//g, '/');
        },

        replaceHash: path => {
            window.location.replace(this.getHashUrl(path))
        },

        getHashUrl: path => {
            const href = window.location.href;
            const i = href.indexOf('#');
            const base = i >= 0 ? href.slice(0, i) : href;
            return `${base}#${path}`;
        },

        /**
         * 渲染函数
         * @params {string} id - 容器id
         * @params {string} template - 模板内容
         * @params {function} callback - 回调函数
         */
        render: (id, template, callback) => {
            let dom = document.getElementById(id);

            if (dom) {
                if ('string' !== typeof template) {
                    dom.innerHTML = '';
                    dom.appendChild(template);
                } else {
                    dom.innerHTML = template;
                }
                callback();
            } else {
                console.error('容器id未找到');
            }
        }
    }

    function HTML5History(base) {
        this.base = base;
    }

    HTML5History.prototype = {
        init: function() {
            window.addEventListener('popstate', e => {
                this.listen();
            });

            // 这里初始化一次路由识别，防止页面刷新后首次无渲染
            this.listen();
        },

        listen: function() {
            let url = window.location.pathname;

            if (_router.hasOwnProperty(url)) {
                let item = _router[url];
                item.before();
                util.render(item.id, item.template, item.after)
            }
        },

        go: index => {
            window.history.go(index);
        },

        replace: url => {
            if ('string' === typeof params) {
                util.pushState(util.cleanPath(this.base + params), true);
                return;
            } else {
                console.warn('请传入正确的值！');
            }
        },

        push: function(params) {

            if ('string' === typeof params) {
                util.pushState(util.cleanPath(this.base + params))
                return;
            }

            if (params.hasOwnProperty('path')) {
                util.pushState(util.cleanPath(this.base + params.path))
            } else {
                console.warn('请传入正确的数据结构');
            }
        }
    }

    function HashHistory(base) {
        this.base = base;
    }

    HashHistory.prototype = {
        init: function() {

            const location = util.getLocation(this.base)
            if (!/^\/#/.test(location)) {
                window.location.replace(util.cleanPath(this.base + '/#' + location))
            } else {
                this.listen();
            }

            window.addEventListener('hashchange', () => {
                this.listen();
            });
        },

        listen: function() {
            // TODO 处理URL带参数的情况 /aaa?aaa=b
            let url = `${this.base}${location.hash.split('#')[1]}`;

            if (_router.hasOwnProperty(url)) {
                let item = _router[url];
                item.before();
                util.render(item.id, item.template, item.after)
            }
        },

        go: index => {
            window.history.go(index);
        },

        replace: url => {
            util.replaceHash(url);
        },

        push: params => {
            if ('string' === typeof params) {
                util.pushHash(params);
                return;
            }

            if (params.hasOwnProperty('path')) {
                let query = '';

                // 带查询参数，变成 /register?plan=private
                // router.push({ path: 'register', query: { plan: 'private' }})
                if (params.hasOwnProperty('query')) {
                    query = `?${util.param(params.query)}`;
                }

                util.pushHash(`${params.path}${query}`);
            } else {
                console.warn('请传入正确的数据结构');
            }
        }
    }

    /**
     * qs-router 路由根对象
     * @params {Object} - Router
     */
    function Router(params) {

        if ('undefined' === typeof params) {
            console.warn('请传递基本参数信息！');
            return
        }

        let mode = params.hasOwnProperty('type') ? params.type : 'hash';

        this.base = params.hasOwnProperty('base') ? params.base : '/';
        this.routes = params.hasOwnProperty('routes') ? params.routes : [];
        this.mode = mode;

        switch (mode) {
            case 'hash':
                this.history = new HashHistory(this.base);
                break;

            case 'history':
                this.history = new HTML5History(this.base);
                break;
        }

        // 开始初始化路由映射
        util.map(this.routes, this.base);
        this.history.init();
    }

    Router.prototype = {

        /**
         * 替换掉当前的history记录
         * @params {string} url - 需要替换的URL
         */
        replace: function(url) {
            this.history.replace(url, true);
        },

        /**
         * 跳转到目标id
         * @params {number} index - 需要跳转到的目标索引
         */
        go: function(index) {
            this.history.go(index);
        },

        back: function() {
            this.go(-1);
        },

        forward: function() {
            this.go(1);
        },

        /**
         * 通过JS的方式跳转到目标页面
         * '/' 或者 {path: '/'}
         * @params {object | string} params - 传入的跳转的参数
         */
        push: function(params) {
            this.history.push(params);
        }
    }

    window.Router = Router;
})()