(function() {
    var _router = {};
    var util = {
        getParamsUrl: mode => {
            // TODO
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
            }

            ['load', 'hashchange'].map(item => {
                window.addEventListener(item, () => {
                    this.listen();
                });
            });
        },

        listen: function() {
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
                util.pushHash(params.path);
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