# mvvm-router

mvvm-router 是一个 基于 url hash 和 html5 history 的一个前端路由小轮子

## 使用方法

### 第一步 导入路由js文件到页面并创建html容器

```html
    <body>
        <div id="template"></div>
        <div id="name"></div>
        <script src="router.js"></script>
    </body>
```

### 第二步 初始化路由信息

```js

    let router = new Router({
        // 配置路由根路径
        base: '/',

        // 设置路由类型为 history
        type: 'history', 

        // 配置需要识别的 router 列表
        routes: [{

            // 目标路径
            path: '/',

            // 目标对应的组件
            component: {

                // 模板内容填充容器ID（可选，默认为查找 template ）
                id: 'template',

                // 目标模板内容
                template: `<h1>hello word</h1>`,

                // 前置回调函数
                beforeRouteUpdate: params => {
                    console.log('开始执行');
                },

                // 后置回调函数
                afterRouteUpdate: params => {
                    console.log('执行结束');
                }
            },

            // 深层子组件嵌套
            children: [{
                path: 'login',
                component: {
                    template: `<h1>login</h1>`
                },
                children: [{
                    path: 'name',
                    component: {
                        template: `<h1>main</h1>`
                    }
                }, {
                    path: 'name2',
                    component: {
                        id: 'name',

                        // 子渲染模板嵌套
                        template: `<h1>name</h1><div id='name2'></div>`
                    },
                    children: [{
                        path: 'name3',
                        component: {
                            id: 'name2',
                            template: `<h1>name2</h1>`
                        }
                    }]
                }]
            }, 
            
            // 同级节点测试
            {
                path: 'register',
                component: {
                    template: `<h1>register</h1>`
                }
            }]
        }]
    });
```

## 使用js的方式进行跳转
```js

    // 字符串
    router.push('/login');

    // 对象
    router.push({
        path: '/'
    });

```

## 在页面上使用hash的方式跳转
```html
    <body>
        <a href="#/main">main</a>

        <a href="#/main/page">main/page</a>
    </body>
```

## 在页面上使用html5History的方式跳转
```html
    <head>
        <base href="/">
    </head>
    <body>
        <a href="/main">main</a>

        <a href="/main/page">main/page</a>
    </body>
```
