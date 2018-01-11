( function(win, factory){
    if(typeof module === 'object' && typeof module.exports === 'function'){
        module.exports = factory(win)
    }else{
        window.webShop = factory(win);
    }
})(window ? window : this, function(win){

    var doc,
        container = document.body,
        camera, renderer, scene,
        // 加载的obj模型的集合
        object,
        // 存放camera摄像机，用于平滑旋转
        cameraGroup,
        // 射线，用于鼠标交互
        raycaster = new THREE.Raycaster(),
        // 记录点击或移动的鼠标的位置
        mouse,
        // 需要进行交互的物体的集合
        raycasterGroup = [],
        // 当前交互的对象
        INTERSECTED,
        // 当前缩放倍数和旋转角度 , 按下时旋转角度
        currentScale,currentRotation, startScale, startRotation,
        // 默认参数
        defaults = {
            objUrl:null
        }
    ;

    if(!(doc = win.document)) throw new Error('此插件必须运行在有document的浏览器环境下');

    var WebShop = function(params){
        return new WebShop.prototype.init(params);
    };

    WebShop.prototype = {
        // 初始化
        init: function(params){
            defaults = Object.assign({}, defaults, params);
            // 定义场景
            scene = new THREE.Scene();
            // 定义摄像机
            camera = new THREE.PerspectiveCamera(45, win.innerWidth / win.innerHeight, 1, 20000);
            camera.position.set(0,1000,2000); // 设置相机位置
            cameraGroup = new THREE.Group();
            cameraGroup.add(camera);
            scene.add(cameraGroup);
            // 定义灯光
            var light = new THREE.AmbientLight( 0xffffff ); // 定义环境光
            scene.add( light );
            var pointLight = new THREE.PointLight(0xffffff); // 定义点光
            pointLight.position.set(100,200,500); // 设置点光位置
            cameraGroup.add(pointLight);
            // 定义渲染器
            renderer = new THREE.WebGLRenderer();
            // renderer.setClearColor(0xffffff); // 设置背景颜色
            // renderer.setPixelRatio(win.devicePixelRatio); // 设置高分屏下的显示效果(在手机屏幕上会出现位置错误，比如原点不在屏幕中心)
            renderer.setSize(win.innerWidth, win.innerHeight); // 设置画布大小
            container.appendChild(renderer.domElement); // 添加画布
            container.style.cssText = 'margin:0;padding:0;overflow:hidden;'; // 设置画布css

            this.loadObj();
            this.addAxes();
            this.bindEvent();

            this.animate();
        },
        // 加载obj模型
        loadObj:function(url){
            var self = this;
            var url = []; // 定义要加载的模型的地址集合
            if(!defaults.objUrl){
                throw new Error('没有传入obj模型')
            }else if( typeof defaults.objUrl === 'string'){
                url.push(defaults.objUrl);
            }else if( Object.prototype.toString.call(defaults.objUrl) === '[object Array]'){
                url = defaults.objUrl;
            }else{
                throw new Error('objUrl类型错误，请传入字符串或数组对象')
            }
            // 加载状态
            var manager = new THREE.LoadingManager();
            manager.onProgress = function(item, loaded, total){
                console.log(item, loaded, total);
            };
            // 启用OBJLoader插件
            var loader = new THREE.OBJLoader(manager);
            // 加载函数，返回promise对象的集合
            function load(){
                var p = []; // 定义返回的promise对象集合
                url.forEach(function(item, index){ // 遍历加载对象
                    p.push( new Promise(function(resolve, reject){
                        loader.load(item, function(obj){
                            resolve(obj)
                        },onprogress, function(err){
                            reject(err);
                        })
                    }) )
                });
                return p;
            }
            // 并行加载obj模型
            Promise.all(load())
                .then(function(obj){
                    // obj是模型对象的集合
                    // 全部加载完成之后执行
                    obj.forEach(function(item, index){
                        // 通常item为mesh对象
                        var size = null; // 定义mesh中的几何体的大小
                        item.traverse( function ( child ) {
                            if ( child instanceof THREE.Mesh ) {
                                // 设置内部几何体的默认颜色
                                child.material.color.set(0x156289);
                                // 设置几何体居中显示
                                child.geometry.center();
                                // 获取几何体的尺寸
                                child.geometry.computeBoundingBox();
                                size = child.geometry.boundingBox.getSize();
                                // 将几何体加入可交互的集合中
                                raycasterGroup.push(child);
                            }
                        } );
                        // 将模型从 中心点在原点 移动到 边缘在原点
                        item.position.set(size.x / 2, index * 200 + size.y/2, size.z / 2);
                        console.log(item);
                        // 添加模型辅助线
                        var helper = new THREE.BoxHelper(item, 0xff00ff);
                        helper.update();
                        scene.add(helper);

                        scene.add(item);
                    });
                    object = obj;
                    console.log(object);
                    // 将摄像机群的中心点移动到第一个模型的中心点，这样模型的中心点就能放到屏幕中间
                    cameraGroup.position.set(obj[0].position.x, obj[0].position.y, obj[0].position.z);
                })
                .catch(function(err){
                    console.log(err);
                    throw new Error('模型加载失败'+ JSON.stringify(err))
                })
        },
        // 射线交互函数
        raycastFn:function(){
            // 如果没有坐标信息，不继续执行
            if(!mouse) return;
            // 根据坐标和相机来设置射线位置
            raycaster.setFromCamera(mouse, camera);
            // 将需要交互的物体添加到射线配置中，这里接受的是一个数组参数
            var intersects = raycaster.intersectObjects(raycasterGroup);
            if(intersects.length > 0){
                // 如果当前交互的对象就是 射线射到的第一个对象，则不重复处理
                if(INTERSECTED != intersects[ 0 ].object){
                    // 如果有当前交互对象，将当前交互对象的颜色设置为当前值，这个操作时复位颜色
                    if(INTERSECTED) INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
                    // 将第一个物体设置为当前交互的物体
                    INTERSECTED = intersects[0].object;
                    // 获取物体的颜色
                    INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
                    // 设置交互时的颜色
                    INTERSECTED.material.emissive.setHex(0xff0000);
                }
            }else{
                // 如果有当前交互对象，将当前交互对象的颜色设置为当前值，这个操作时复位颜色
                if(INTERSECTED) INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
                // 清空当前交互物体
                INTERSECTED = null;
            }
        },
        // 移动鼠标的操作
        onMouseMove:function(event){
            mouse = new THREE.Vector2();
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
        },
        rotateY:function(deg){
            cameraGroup.rotation.y = deg * 0.01;
        },
        scale:function(num){
            num = Math.max(0.1, num);
            num = Math.min(1.9, num);
            cameraGroup.scale.set(num, num, num);
        },
        // 添加辅助坐标系
        addAxes:function(){
            var axisHelper = new THREE.AxesHelper(2000);
            scene.add(axisHelper);
            // 添加相机辅助线
            var helper = new THREE.CameraHelper( camera );
            scene.add( helper );
        },
        // 执行动画函数
        animate:function(){
            var self = this;
            requestAnimationFrame(function(){
                self.animate.call(self);
            });
            self.render();
        },
        // 渲染每一帧
        render:function(){
            // cameraGroup.rotation.y += 0.005;
            camera.lookAt( scene.position );
            // 更新相机位置
            camera.updateMatrixWorld();
            // 执行交互函数
            this.raycastFn();
            renderer.render( scene, camera );
        },
        bindEvent:function(){
            var self = this;
            var mc = new Hammer(document.body);
            mc.get('pinch').set({ enable: true });
            mc.get('rotate').set({ enable: true });

            mc.on('tap',function(ev){
                mouse = new THREE.Vector2();
                mouse.x = (ev.center.x / window.innerWidth) * 2 - 1;
                mouse.y = -(ev.center.y / window.innerHeight) * 2 + 1 ;
            });
            mc.on('pinchstart',function(ev){
                if(!currentScale) currentScale = 1;
                startScale = ev.scale;
            });
            mc.on('pinchmove',function(ev){
                var _s = -(ev.scale - startScale);
                self.scale( currentScale + _s);
            });
            mc.on('pinchend', function(ev){
                currentScale += -(ev.scale - startScale);
                currentScale = Math.max(0.01, currentScale);
                currentScale = Math.min(1.99, currentScale);
            });
            mc.on('rotatestart', function(ev){
                if(!currentRotation) currentRotation = 0;
                startRotation = ev.rotation;
            });
            mc.on('rotatemove', function(ev){
                var _r = ev.rotation - startRotation;
                self.rotateY(currentRotation + _r);
            });
            mc.on('rotateend',function(ev){
                currentRotation +=  ev.rotation - startRotation;
            })
        }
    };
    WebShop.prototype.init.prototype = WebShop.prototype;

    return WebShop;
} );