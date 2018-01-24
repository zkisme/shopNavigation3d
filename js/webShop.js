//
//                       _oo0oo_
//                      o8888888o
//                      88" . "88
//                      (| -_- |)
//                      0\  =  /0
//                    ___/`---'\___
//                  .' \\|     |// '.
//                 / \\|||  :  |||// \
//                / _||||| -:- |||||- \
//               |   | \\\  -  /// |   |
//               | \_|  ''\---/''  |_/ |
//               \  .-\__  '-'  ___/-. /
//             ___'. .'  /--.--\  `. .'___
//          ."" '<  `.___\_<|>_/___.' >' "".
//         | | :  `- \`.;`\ _ /`;.`/ - ` : | |
//         \  \ `_.   \_ __\ /__ _/   .-` /  /
//     =====`-.____`.___ \_____/___.-`___.-'=====
//                       `=---='
//
//
//     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//
//               佛祖保佑         永无BUG
//
//
//

(function(win, factory) {
    if (typeof module === "object" && typeof module.exports === "function") {
        module.exports = factory(win);
    } else {
        window.WebShop = factory(win);
    }
})(window ? window : this, function(win) {
    var doc,
        scope, // 全局变量
        container = document.body, // 存放的容器
        camera, // 摄像机
        renderer, // 渲染器
        scene, // 场景
        control, // 轨道控制器
        OBJECTS, // 模型的集合
        OBJECT, // 当前聚焦的模型
        INDEX, // 聚焦的模型的索引
        LOCAL, // 小人(位置)
        cameraGroup, // 存放camera摄像机，用于平滑旋转
        raycaster = new THREE.Raycaster(), // 射线，用于鼠标交互
        mouse, // 记录点击或移动的鼠标的位置
        raycasterGroup = [], // 可交互的物体的集合
        INTERSECTED, // 当前交互的对象
        DOM, // 存放标注信息的dom
        HANDLES = {}, // 存放观察者模式中的函数
        // 默认参数
        defaults = {
            objUrl: null, // 加载的模型的url， 可以为数组或者字符串
            infoUrl: null, // 加载的模型对应的标注和颜色信息， 可以为数组或者字符串， 顺序要与objUrl相同
            index: 0, // 初始化显示的模型的索引
            gap: 400, // 多个模型之间的高度间距
            isFloor: true, // 是否需要楼层
            isReset: true, // 是否需要重置按钮
            isBack: true, // 是否需要返回按钮
            cameraPosition: {
                // 相机的位置
                x: 0,
                y: 100,
                z: 400
            }
        };

    if (!(doc = win.document))
        throw new Error("此插件必须运行在有document的浏览器环境下");

    var WebShop = function(params) {
        return new WebShop.prototype.init(params);
    };

    WebShop.prototype = {
        // 初始化
        init: function(params) {
            scope = this;
            // 初始化参数
            defaults = Object.assign({}, defaults, params);
            INDEX = defaults.index;
            // 定义场景
            scene = new THREE.Scene();
            scene.updateMatrixWorld(true);
            // 定义透视摄像机
            camera = new THREE.PerspectiveCamera(
                45,
                win.innerWidth / win.innerHeight,
                1,
                20000
            );
            camera.position.set(
                defaults.cameraPosition.x,
                defaults.cameraPosition.y,
                defaults.cameraPosition.z
            ); // 设置相机位置
            cameraGroup = new THREE.Group();
            cameraGroup.add(camera);
            scene.add(cameraGroup);
            // 定义灯光
            var light = new THREE.AmbientLight(0xb5b5b5); // 定义环境光
            scene.add(light);
            var pointLight = new THREE.PointLight(0x444444); // 定义点光
            pointLight.position.set(-100, 1500, 100); // 设置点光位置
            cameraGroup.add(pointLight);
            // 定义渲染器
            renderer = new THREE.WebGLRenderer({
                antialias: true
            });

            renderer.setClearColor(0xffffff); // 设置背景颜色
            renderer.setPixelRatio(win.devicePixelRatio); // 设置高分屏下的显示效果(在手机屏幕上会出现位置错误，比如原点不在屏幕中心)
            renderer.setSize(win.innerWidth, win.innerHeight); // 设置画布大小
            container.appendChild(renderer.domElement); // 添加画布
            container.style.cssText =
                "margin:0;padding:0;overflow:hidden;position:fixed;width:100vw;height:100vh;"; // 设置画布css
            // 添加标注dom容器
            DOM = document.createElement("div");
            DOM.style.cssText =
                "position:absolute;left:0;top:0;height:0;color:#000000;";
            document.body.appendChild(DOM);
            // 初始化轨道控制器
            control = new THREE.OrbitControls(camera, renderer.domElement);
            // 将插件中的绑定的事件移除
            control.dispose();
            control.update();
            // 加载模型
            this.loadObj();
            // this.addAxes();
            // 绑定事件
            this.bindEvent();

            this.animate();
            return scope;
        },
        // 加载obj模型
        loadObj: function(url) {
            var url = []; // 定义要加载的模型的地址集合
            var infoUrl = []; // 定义要加载的info信息
            // 判断传入的模型和标注的参数信息是否正确
            if (!defaults.objUrl) {
                throw new Error("没有传入obj模型");
            } else if (typeof defaults.objUrl === "string") {
                url.push(defaults.objUrl);
            } else if (
                Object.prototype.toString.call(defaults.objUrl) ===
                "[object Array]"
            ) {
                url = defaults.objUrl;
            } else {
                throw new Error("objUrl类型错误，请传入字符串或数组对象");
            }
            if (typeof defaults.infoUrl === "string") {
                infoUrl.push(defaults.infoUrl);
            } else if (
                Object.prototype.toString.call(defaults.infoUrl) ===
                "[object Array]"
            ) {
                infoUrl = defaults.infoUrl;
            } else {
                throw new Error("infoUrl类型错误，请传入字符串或数组对象");
            }
            // 加载状态
            var manager = new THREE.LoadingManager();
            manager.onProgress = function(item, loaded, total) {
                console.log(item, loaded, total);
            };
            // 启用OBJLoader插件
            var loader = new THREE.TDSLoader(manager);
            // 加载函数，返回promise对象的集合
            function load(data) {
                var p = []; // 定义返回的promise对象集合
                data = data.map(function(item) {
                    return JSON.parse(item);
                });
                url.forEach(function(item, index) {
                    // 遍历加载对象
                    p.push(
                        new Promise(function(resolve, reject) {
                            loader.load(
                                item,
                                function(obj) {
                                    // 将info信息添加到模型的infos属性中
                                    obj.infos = data[index];
                                    resolve(obj);
                                },
                                onprogress,
                                function(err) {
                                    reject(err);
                                }
                            );
                        })
                    );
                });
                return p;
            }
            // 加载info信息函数，返回promise对象的集合
            function loadInfos() {
                var p = [];
                infoUrl.forEach(function(item) {
                    p.push(
                        new Promise(function(resolve, reject) {
                            fetch(item, resolve, reject);
                        })
                    );
                });
                return p;
            }
            // 先并行加载info信息
            Promise.all(loadInfos())
                // 然后加载模型
                .then(function(data) {
                    return Promise.all(load(data));
                })
                // 执行模型函数
                .then(function(obj) {
                    scope.loadObjhandler(obj);
                })
                .catch(function(err) {
                    alert("加载模型失败");
                    console.log(err);
                    throw new Error("模型加载失败" + JSON.stringify(err));
                });
        },
        loadObjhandler: function(obj) {
            // obj是模型对象的集合
            // 全部加载完成之后执行
            obj.forEach(function(item, index) {
                // 通常item为mesh对象
                var size = null; // 定义mesh中的几何体的大小
                var infos = item.infos; // 获取模型中的info信息
                item.index = index; // 将索引添加到对应的模型上
                // 设置多个模型的位置
                item.position.y = index * defaults.gap;
                // 遍历模型的children属性
                item.traverse(function(child) {
                    if (child instanceof THREE.Mesh) {
                        // 如果有与child.name对应的info信息，说明需要修改名称和颜色
                        if (infos[child.name]) {
                            var info = infos[child.name];
                            // 更改内部几何体的材质，原先是镜面材质
                            child.material = new THREE.MeshLambertMaterial();
                            // 设置内部几何体的默认颜色
                            child.material.color.setHex("0x" + info.color);
                            // 如果有name的属性，说明这个几何体是可以交互的
                            if (info.name) {
                                // 设置集合提的myName属性，用于后面的标注
                                child.myName = info.name;
                                // 获取几何体的尺寸，并根据模型位置计算值顶点坐标，赋值给peak，也是用于标注的位置计算的
                                child.geometry.computeBoundingBox();
                                size = child.geometry.boundingBox.getSize();
                                child.peak = scope.computePeak(
                                    child.geometry.boundingBox,
                                    item.position
                                );
                                // 将几何体加入可交互的集合中
                                raycasterGroup.push(child);
                            }
                        }
                    }
                });
                // 添加模型辅助线
                // var helper = new THREE.BoxHelper(item, 0xff00ff);
                // helper.update();
                // scene.add(helper);
                // object.add(item);
                scene.add(item);
            });
            OBJECTS = obj;
            // 添加人（位置）几何体
            scope.addLocal();
            // 更新标注
            scope.updateText();
            if (defaults.isFloor) scope.addFloor();
            if (defaults.isReset) scope.addReset();
            if (defaults.isBack) scope.addBack();
            // 加载完成，执行done事件
            scope.emit("done", obj);
        },
        // 添加楼层信息
        addFloor: function() {
            var navigation = document.createElement("ul");
            navigation.style.cssText =
                "position:fixed;left:10px;bottom:50px;z-index:9;overflow-x:hidden;overflow-y:scroll;width:30px;background:#34495E;border-radius:4px;padding:0;margin:0;list-style:none;max-height:120px;color:#fff;";

            OBJECTS.forEach(function(item, index) {
                var li = document.createElement("li");
                li.style.cssText =
                    "display:block;width:100%;height:30px;text-align:center;line-height:30px;" +
                    (index !== 0 ? "border-bottom:1px solid #ddd;" : "");
                li.innerText = index + 1 + "F";
                li.onclick = function(e) {
                    e.stopPropagation();
                    scope.setIndex(index);
                };
                navigation.insertBefore(li, navigation.lastChild);
            });
            document.body.appendChild(navigation);
        },
        // 添加重置按钮
        addReset: function() {
            var $reset = document.createElement("div");
            $reset.style.cssText =
                "position:fixed;right:10px;bottom:100px;background:#34495E;border-radius:50%;width:40px;height:40px;text-align:center;line-height:40px;color:#fff;font-size:10px;";
            $reset.innerText = "重置";
            $reset.onclick = function(e) {
                e.stopPropagation();
                scope.reset();
            };
            document.body.appendChild($reset);
        },
        // 添加返回按钮
        addBack: function() {
            var $back = document.createElement("div");
            $back.style.cssText =
                "position:fixed;right:10px;bottom:50px;background:#34495E;border-radius:50%;width:40px;height:40px;text-align:center;line-height:40px;color:#fff;font-size:10px;";
            $back.innerText = "返回";
            $back.onclick = function() {
                history.go(-1);
            };
            document.body.appendChild($back);
        },
        // 添加位置的几何体
        addLocal: function() {
            var geometry = new THREE.SphereGeometry(3, 64, 64);
            var material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
            LOCAL = new THREE.Mesh(geometry, material);
            LOCAL.position.y = 3 + INDEX * defaults.gap;
            scene.add(LOCAL);
        },
        // 返回位置的物体的坐标
        getLocal: function() {
            return {
                x: LOCAL.position.x,
                y: LOCAL.position.y
            };
        },
        // 设置位置的物体的坐标
        setLocal: function(x, y, index) {
            if (index) scope.setIndex(index);
            LOCAL.position.set(
                x ? x : 0,
                index ? 3 + index * defaults.gap : 3,
                y ? y : 0
            );
        },
        // 射线交互函数
        raycastFn: function() {
            // 如果没有坐标信息，不继续执行
            if (!mouse) return;
            // 根据坐标和相机来设置射线位置
            raycaster.setFromCamera(mouse, camera);
            // 将需要交互的物体添加到射线配置中，这里接受的是一个数组参数
            var intersects = raycaster.intersectObjects(raycasterGroup);
            if (intersects.length > 0) {
                // 如果当前交互的对象就是 射线射到的第一个对象，则不重复处理
                if (INTERSECTED != intersects[0].object) {
                    // 如果有当前交互对象，将当前交互对象的颜色设置为当前值，这个操作时复位颜色
                    if (INTERSECTED)
                        INTERSECTED.material.color.setHex(
                            INTERSECTED.currentHex
                        );
                    // 将第一个物体设置为当前交互的物体
                    INTERSECTED = intersects[0].object;
                    // 获取物体的颜色
                    INTERSECTED.currentHex = INTERSECTED.material.color.getHex();
                    // 设置交互时的颜色
                    INTERSECTED.material.color.setHex(0x98e8ff);
                    scope.setIndex(INTERSECTED.parent.index);
                }
            } else {
                // 如果有当前交互对象，将当前交互对象的颜色设置为当前值，这个操作时复位颜色
                if (INTERSECTED)
                    INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
                // 清空当前交互物体
                INTERSECTED = null;
            }
        },
        // 将视线聚焦到当前INDEX索引的物体上， 有个动画过渡的效果
        lookAt: function(callback) {
            // 先隐藏标注，让动画过程更舒服
            scope.hideText();
            createjs.Tween.get(cameraGroup.position)
                .to(
                    {
                        x: OBJECTS[INDEX].position.x,
                        y: OBJECTS[INDEX].position.y,
                        z: OBJECTS[INDEX].position.z
                    },
                    600,
                    createjs.Ease.sineInOut
                )
                .call(function() {
                    if (callback) callback();
                    scope.updateText();
                    // 动画执行完成之后再显示标注
                    scope.showText();
                });
        },
        // 添加辅助坐标系
        addAxes: function() {
            var axisHelper = new THREE.AxesHelper(2000);
            scene.add(axisHelper);
            // 添加相机辅助线
            var helper = new THREE.CameraHelper(camera);
            scene.add(helper);
        },
        // 执行动画函数
        animate: function() {
            requestAnimationFrame(function() {
                scope.animate();
            });
            control.update();
            scope.render();
            // scope.updateText();
        },
        // 渲染每一帧
        render: function() {
            // 更新相机位置
            camera.updateMatrixWorld();
            // 执行交互函数
            renderer.render(scene, camera);
        },
        // 更新标注
        updateText: function() {
            // 如果可交互的对象中没有成员，说明没有可以交互的对象，也就不需要添加标注了
            if (raycasterGroup.length <= 0) return;
            // 获取相机位置
            var position = camera.position;
            // 遍历可交互对象的数组
            raycasterGroup.forEach(function(ray) {
                // 如果dom的值为false，不需要跟新这个物体的标注信息
                if (ray.dom === false) return;
                // 如果物体的父级，也就是Group的索引是当前索引才显示标注，其他的不显示标注，减少dom开销
                if (ray.parent.index == INDEX) {
                    // 如果没有标注就添加标注
                    if (!ray.dom) {
                        // 将物体的顶点坐标转换成屏幕坐标
                        var vector = scope.toScreen(ray.peak);
                        var dom = document.createElement("div");
                        // 设置标注文本为之前加载到的info.name
                        dom.innerText = ray.myName;
                        // 如果屏幕坐标返回的是false，说明已经在屏幕外了，直接给隐藏掉
                        if (vector === false) {
                            dom.style.display = "none";
                        } else {
                            // 设置标注的css
                            dom.style.cssText =
                                "position:absolute;left:" +
                                vector.x +
                                "px;top:" +
                                vector.y +
                                "px;transform:translate(-50%,-50%);font-size:1.92vw;white-space: nowrap;";
                        }
                        DOM.appendChild(dom);
                        // 将添加的标注html赋值给物体的dom属性
                        ray.dom = dom;
                    } else {
                        // 将物体的顶点坐标转换成屏幕坐标
                        var vector = scope.toScreen(ray.peak);
                        // 如果屏幕坐标返回的是false，说明已经在屏幕外了，直接给隐藏掉
                        if (vector === false)
                            return (ray.dom.style.display = "none");
                        ray.dom.style.cssText =
                            "position:absolute;left:" +
                            vector.x +
                            "px;top:" +
                            vector.y +
                            "px;transform:translate(-50%,-50%);font-size:1.92vw;white-space: nowrap;";
                    }
                } else {
                    // 如果物体的父级的索引不是当前模型的索引，判断这个物体是否有标注的dom，如果有也隐藏掉，因为不需要显示
                    if (ray.dom) {
                        ray.dom.style.display = "none";
                    }
                }
            });
        },
        // 显示所有标注
        showText: function() {
            DOM.style.display = "block";
        },
        // 隐藏所有标注
        hideText: function() {
            DOM.style.display = "none";
        },
        // 设置聚焦的模型的索引，接受索引和回调函数
        setIndex: function(index, callback) {
            // 如果参数中有索引并且索引和当前索引不同才继续执行
            if (index !== undefined && index !== INDEX) {
                INDEX = index;
                scope.lookAt(callback);
            }
        },

        // 完成时执行函数，用于插件的调用
        done: function(fn) {
            this.on("done", fn);
            return scope;
        },
        // 绑定事件
        bindEvent: function() {
            var mc = new Hammer(renderer.domElement);
            var isPan, isRotate, isScale;

            var cameraGroupPostion;
            mc.get("pinch").set({ enable: true });
            mc.get("rotate").set({ enable: true });
            // 添加点击事件，执行可交互函数
            document.body.addEventListener("click", function(ev) {
                mouse = new THREE.Vector2();
                mouse.x = ev.pageX / window.innerWidth * 2 - 1;
                mouse.y = -(ev.pageY / window.innerHeight) * 2 + 1;
                scope.raycastFn();
            });
            // 拖动
            mc.on("panstart", function(ev) {
                isPan = true;
                DOM.style.display = "none";
                control.panStart(ev);
            });
            mc.on("panmove", function(ev) {
                if (!isPan) return;
                control.panMove(ev);
            });
            mc.on("panend", function(ev) {
                if (!isPan) return;
                control.panEnd(ev);
                scope.updateText();
                DOM.style.display = "block";
                isPan = false;
            });
            // 旋转
            mc.on("rotatestart", function(ev) {
                isRotate = true;
                DOM.style.display = "none";
                control.rotateStart(ev);
            });
            mc.on("rotatemove", function(ev) {
                if (!isRotate) return;
                control.rotateMove(ev);
            });
            mc.on("rotateend", function(ev) {
                if (!isRotate) return;
                control.rotateEnd(ev);
                scope.updateText();
                DOM.style.display = "block";
                isRotate = true;
            });
            // 缩放
            mc.on("pinchstart", function(ev) {
                isScale = true;
                DOM.style.display = "none";
                control.scaleStart(ev);
            });
            mc.on("pinchmove", function(ev) {
                if (!isScale) return;
                control.scaleMove(ev);
            });
            mc.on("pinchend", function(ev) {
                if (!isScale) return;
                scope.updateText();
                DOM.style.display = "block";
                isScale = false;
            });
            // 窗口尺寸更改
            window.addEventListener("resize", function() {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
                scope.updateText();
            });
        },
        // 重置摄像机
        reset: function() {
            control.reset();
            control.update();
            if (INDEX === defaults.index) {
                scope.updateText();
            } else {
                INDEX = defaults.index;
                scope.lookAt();
            }
        },
        // 触发自定义事件
        emit: function(name, args) {
            if (name && HANDLES[name] && HANDLES[name].length > 0) {
                HANDLES[name].forEach(function(handle) {
                    if (handle) handle.call(scope, args);
                });
            }
        },
        // 绑定自定义事件
        on: function(name, fn) {
            if (!HANDLES[name]) HANDLES[name] = [];
            HANDLES[name].push(fn);
        },
        // 将三维坐标转换成屏幕坐标
        toScreen: function(peak) {
            var vector = new THREE.Vector3(peak.x, peak.y, peak.z);
            var standardVector = vector.project(camera);
            // 如果超出屏幕，返回false， standardVector.y是让远处的标注不显示
            if (
                standardVector.x >= -1 &&
                standardVector.x <= 1 &&
                standardVector.y <= 0.4 &&
                standardVector.z >= -1 &&
                standardVector.z <= 1
            ) {
                var a = window.innerWidth / 2;
                var b = window.innerHeight / 2;
                return {
                    x: Math.round(standardVector.x * a + a),
                    y: Math.round(-standardVector.y * b + b)
                };
            } else {
                return false;
            }
        },
        // 计算物体的顶点中心坐标
        computePeak: function(vertex, reference) {
            var vector = {
                min: {
                    x: vertex.min.x + reference.x,
                    y: vertex.min.y + reference.y,
                    z: vertex.min.z + reference.z
                },
                max: {
                    x: vertex.max.x + reference.x,
                    y: vertex.max.y + reference.y,
                    z: vertex.max.z + reference.z
                }
            };
            return {
                x: (vertex.max.x + vertex.min.x) / 2,
                y: vector.max.y,
                z: (vertex.max.z + vertex.min.z) / 2
            };
        },
        // 对象的浅拷贝
        clone: function(src) {
            if (src === undefined || src === null) return null;
            if (
                typeof src === "string" ||
                typeof src === "number" ||
                typeof src === "boolean"
            )
                return src;
            var target = {};
            for (var name in src) {
                target[name] = src[name];
            }
            return target;
        }
    };
    WebShop.prototype.init.prototype = WebShop.prototype;
    // ajax封装函数
    function fetch(url, onsuccess, onerr) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        // xhr.responseType = opt.type || '';

        // xhr.onprogress = opt.progress;
        xhr.onerror = onerr;
        xhr.timeout = onerr;
        xhr.onload = function(evt) {
            onsuccess(evt.target.response);
        };
        xhr.send(null);
    }

    return WebShop;
});
