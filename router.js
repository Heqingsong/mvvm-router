(function() {
    var _router = {};
    var util = {
        getParamsUrl: mode => {
            // TODO
        },

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

        getKey: () => {
            const Time = window.performance && window.performance.now ? window.performance : Date;
            return parseInt(Time.now());
        },

        map: (object, key) => {
            object.forEach(item => {
                let router = key;
                if ("object" === typeof item.component) {
                    let object = {
                        id: '',
                        template: '',
                        before: function() {},
                        after: function() {}
                    }

                    object.id = item.component.id || 'template';
                    object.template = item.component.template;

                    'function' === typeof item.component.beforeRouteUpdate ? object.before = item.component.beforeRouteUpdate : '';
                    'function' === typeof item.component.afterRouteUpdate ? object.after = item.component.afterRouteUpdate : '';

                    if (item.path.charAt(item.path.length - 1) !== '/' && router.charAt(router.length - 1) !== '/') {
                        router = `${key}/${item.path}`;
                    } else if (key != item.path) {
                        router = `${key}${item.path}`;
                    } else {
                        router = `${item.path}`
                    }

                    _router[router] = object;
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

        render: (id, template, callback) => {
            let dom = document.getElementById(id);

            if (dom) {
                if ('string' !== typeof template) {
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

        onReady: (successCallBack, errorCallBack) => {

        },

        onError: callback => {

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
            let url = location.hash.split('#')[1];

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

        onReady: (successCallBack, errorCallBack) => {

        },

        onError: callback => {

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
     * @params {Object} - Router
     */
    function Router(params) {

        if ('undefined' === typeof params) {
            console.warn('请传递基本参数信息！');
            return
        }

        let mode = params.hasOwnProperty('type') ? params.type : 'hash';

        this.base = '/';
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

        util.map(this.routes, this.base);
        this.history.init();
    }

    Router.prototype = {

        /**
         * 替换掉当前的history记录
         * @params {string} url
         */
        replace: function(url) {
            this.history.replace(url, true);
        },

        go: function(index) {
            this.history.go(index);
        },

        back: function() {
            this.go(-1);
        },

        forward: function() {
            this.go(1);
        },

        onReady: function(successCallBack, errorCallBack) {
            this.history.onReady(successCallBack, errorCallBack);
        },

        onError: function(callback) {
            this.history.onError(callback);
        },

        push: function(params) {
            this.history.push(params);
        }
    }

    window.Router = Router;
})()