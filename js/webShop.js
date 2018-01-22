( function(win, factory){
    if(typeof module === 'object' && typeof module.exports === 'function'){
        module.exports = factory(win)
    }else{
        window.WebShop = factory(win);
    }
})(window ? window : this, function(win){

    var doc,scope,
        container = document.body,
        camera, renderer, scene, control,
        // 加载的obj模型的集合
        object = new THREE.Group(),
        // 存放camera摄像机，用于平滑旋转
        cameraGroup,
        // 射线，用于鼠标交互
        raycaster = new THREE.Raycaster(),OBJECT,OBJECTS,
        // 记录点击或移动的鼠标的位置
        mouse,
        // 需要进行交互的物体的集合
        raycasterGroup = [],
        // 当前交互的对象
        INTERSECTED,
        // 当前缩放倍数和旋转角度 , 按下时旋转角度
        currentScale,currentRotation, startScale, prevRotation,
        DOM,
        HANDLES = {},
        // 默认参数
        defaults = {
            objUrl:null,
            infoUrl:null,
            done:null
        }
    ;

    if(!(doc = win.document)) throw new Error('此插件必须运行在有document的浏览器环境下');

    var WebShop = function(params){
        return new WebShop.prototype.init(params);
    };

    WebShop.getObjList = function(){
        return OBJECTS;
    };

    WebShop.prototype = {
        // 初始化
        init: function(params){
            scope = this;
            defaults = Object.assign({}, defaults, params);
            // 定义场景
            scene = new THREE.Scene();
            scene.updateMatrixWorld(true);
            // 定义摄像机
            camera = new THREE.PerspectiveCamera(45, win.innerWidth / win.innerHeight, 1, 20000);
            camera.position.set(0,100,400); // 设置相机位置
            cameraGroup = new THREE.Group();
            cameraGroup.add(camera);
            scene.add(cameraGroup);
            // 定义灯光
            var light = new THREE.AmbientLight( 0xb5b5b5 ); // 定义环境光
            scene.add( light );
            var pointLight = new THREE.PointLight(0x444444); // 定义点光
            pointLight.position.set(-100,1500,100); // 设置点光位置
            cameraGroup.add(pointLight);
            // 定义渲染器
            renderer = new THREE.WebGLRenderer({
                antialias: true
            });
            
            renderer.setClearColor(0xffffff); // 设置背景颜色
            renderer.setPixelRatio(win.devicePixelRatio); // 设置高分屏下的显示效果(在手机屏幕上会出现位置错误，比如原点不在屏幕中心)
            renderer.setSize(win.innerWidth, win.innerHeight); // 设置画布大小
            console.log(win.innerWidth, win.innerHeight, window.innerWidth)
            container.appendChild(renderer.domElement); // 添加画布
            container.style.cssText = 'margin:0;padding:0;overflow:hidden;position:fixed;width:100vw;height:100vh;'; // 设置画布css

            DOM = document.createElement('div');
            DOM.style.cssText = 'position:absolute;left:0;top:0;height:0;color:#000000;';
            document.body.appendChild(DOM);

            control = new THREE.OrbitControls(camera, renderer.domElement);
            control.dispose();
            control.update();

            this.loadObj();
            this.addAxes();
            this.bindEvent();

            this.animate();
        },
        // 加载obj模型
        loadObj:function(url){
            var self = this;
            var url = []; // 定义要加载的模型的地址集合
            var infoUrl = [];
            if(!defaults.objUrl){
                throw new Error('没有传入obj模型')
            }else if( typeof defaults.objUrl === 'string'){
                url.push(defaults.objUrl);
            }else if( Object.prototype.toString.call(defaults.objUrl) === '[object Array]'){
                url = defaults.objUrl;
            }else{
                throw new Error('objUrl类型错误，请传入字符串或数组对象')
            }
            if( typeof defaults.infoUrl === 'string'){
                infoUrl.push(defaults.infoUrl);
            }else if( Object.prototype.toString.call(defaults.infoUrl) === '[object Array]'){
                infoUrl = defaults.infoUrl;
            }
            // 加载状态
            var manager = new THREE.LoadingManager();
            manager.onProgress = function(item, loaded, total){
                console.log(item, loaded, total);
            };
            // 启用OBJLoader插件
            var loader = new THREE.TDSLoader(manager);
            // 加载函数，返回promise对象的集合
            function load(data){
                var p = []; // 定义返回的promise对象集合
                data = data.map(function(item){
                    return JSON.parse(item);
                })
                url.forEach(function(item, index){ // 遍历加载对象
                    p.push( new Promise(function(resolve, reject){
                        loader.load(item, function(obj){
                            obj.infos = data[index];
                            resolve(obj)
                        },onprogress, function(err){
                            reject(err);
                        })
                    }) )
                });
                return p;
            }
            function loadInfos(){
                var p = [];
                infoUrl.forEach(function(item){
                    p.push( new Promise(function(resolve, reject){
                        fetch(item, resolve, reject)
                    }))
                })
                return p;
            }
            // 并行加载obj模型
            Promise.all(loadInfos())
                .then(function(data){
                    return Promise.all(load(data))
                })
                .then(function(obj){
                    self.loadObjhandler.call(self, obj);
                })
                .catch(function(err){
                    console.log(err);
                    throw new Error('模型加载失败'+ JSON.stringify(err))
                })
        },
        loadObjhandler:function(obj){
            var self = this;
            // obj是模型对象的集合
            // 全部加载完成之后执行
            obj.forEach(function(item, index){
                // 通常item为mesh对象
                var size = null; // 定义mesh中的几何体的大小
                var infos = item.infos;
                // 将模型从 中心点在原点 移动到 边缘在原点
                item.position.y = index * 400;
                item.traverse( function ( child ) {
                    if ( child instanceof THREE.Mesh ) {
                        if(infos[child.name]){
                            var info = infos[child.name]
                            // 设置内部几何体的默认颜色
                            child.material = new THREE.MeshLambertMaterial()
                            child.material.color.setHex('0x'+info.color);

                            if(info.name){
                                // 获取几何体的尺寸
                                child.myName = info.name;
                                child.geometry.computeBoundingBox();
                                size = child.geometry.boundingBox.getSize();
                                child.peak = self.computePeak.call(self, child.geometry.boundingBox, item.position);
                                // 将几何体加入可交互的集合中
                                raycasterGroup.push(child);
                            }
                        }
                        // 设置几何体居中显示
                        // child.geometry.center();
                    }
                } );
                // 添加模型辅助线
                var helper = new THREE.BoxHelper(item, 0xff00ff);
                helper.update();
                OBJECT = obj[0];
                scene.add(helper);

                object.add(item);
            });
            scene.add(object);
            self.updateDom.call(self);
            OBJECTS = obj;
            self.emit('done', obj);
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
                    if(INTERSECTED) INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
                    // 将第一个物体设置为当前交互的物体
                    INTERSECTED = intersects[0].object;
                    // 获取物体的颜色
                    INTERSECTED.currentHex = INTERSECTED.material.color.getHex();
                    // 设置交互时的颜色
                    INTERSECTED.material.color.setHex(0x98e8ff);
                    this.lookAt();
                    OBJECT = INTERSECTED.parent;
                }
            }else{
                // 如果有当前交互对象，将当前交互对象的颜色设置为当前值，这个操作时复位颜色
                if(INTERSECTED) INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
                // 清空当前交互物体
                INTERSECTED = null;
            }
        },
        lookAt:function(index){
            var self = this;
            if(index===undefined && (!INTERSECTED || INTERSECTED.parent === OBJECT)) return;
            this.updateDom(true);
            OBJECT = index !== undefined ? OBJECTS[index] : INTERSECTED.parent;
            createjs.Tween.get(cameraGroup.position)
                .to({x: OBJECT.position.x, y:OBJECT.position.y, z: OBJECT.position.z},600, createjs.Ease.sineInOut)
                .call(function(){
                    self.updateDom.call(self);
                })
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
            control.update();
            self.render();
            // self.updateDom();
        },
        updateDom:function(isHide){
            var self = this;
            if(raycasterGroup.length<=0) return;
            if(isHide){
                DOM.style.display = 'none';
            }else{
                var position = camera.position;
                raycasterGroup.forEach(function(ray){
                    if(ray.dom === false) return;
                    if(ray.parent == OBJECT){
                        if(!ray.dom){
                            var vector = self.toScreen(ray.peak);
                            var dom = document.createElement('div');
                            dom.innerText = ray.myName;
                            dom.style.cssText = 'position:absolute;left:'+vector.x+'px;top:'+vector.y+'px;transform:translate(-50%,-50%);font-size:1.92vw;white-space: nowrap;';
                            DOM.appendChild(dom);
                            ray.dom = dom;
                        }else{
                            var vector = self.toScreen(ray.peak);
                            if(ray.domStyle && vector.x == ray.domStyle.x && vector.y == ray.domStyle.y) return;
                            ray.dom.style.cssText = 'position:absolute;left:'+vector.x+'px;top:'+vector.y+'px;transform:translate(-50%,-50%);font-size:1.92vw;white-space: nowrap;';
                            ray.domStyle = {
                                x: vector.x,
                                y: vector.y
                            }
                        }
                    }else{
                        if(ray.dom){
                            ray.dom.style.display = 'none';
                        }
                    }
                })
                DOM.style.display = 'block';
            } 
        },
        // 渲染每一帧
        render:function(){
            // object.rotation.y += 0.005;
            // camera.lookAt( scene.position );
            // 更新相机位置
            camera.updateMatrixWorld();
            // 执行交互函数

            renderer.render( scene, camera );
        },
        done:function(fn){
            this.on('done', fn);
        },
        bindEvent:function(){
            var self = this;
            var mc = new Hammer(document.body);

            var cameraGroupPostion;
            mc.get('pinch').set({ enable: true });
            mc.get('rotate').set({ enable: true });
            
            document.body.addEventListener('click',function(ev){
                mouse = new THREE.Vector2();
                mouse.x = (ev.pageX / window.innerWidth) * 2 - 1;
                mouse.y = -(ev.pageY / window.innerHeight) * 2 + 1 ;
                self.raycastFn();
            })
            mc.on('panstart', function(ev){
                DOM.style.display = 'none'
                control.panStart(ev);
            })
            mc.on('panmove', function(ev){
                control.panMove(ev);
            });
            mc.on('panend', function(ev){
                control.panEnd(ev);
                self.updateDom.call(self);
                DOM.style.display = 'block';
            })
            mc.on('rotatestart', function(ev){
                DOM.style.display = 'none'
                control.rotateStart(ev)
            })
            mc.on('rotatemove', function(ev){
                control.rotateMove(ev);
            })
            mc.on('rotateend', function(ev){
                control.rotateEnd(ev);
                self.updateDom.call(self);
                DOM.style.display = 'block';
            })
            mc.on('pinchstart', function(ev){
                DOM.style.display = 'none'
                control.scaleStart(ev);
            })
            mc.on('pinchmove', function(ev){
                control.scaleMove(ev);
            })
            mc.on('pinchend', function(ev){
                self.updateDom.call(self);
                DOM.style.display = 'block';
            })

            self.on.call(self, 'done', defaults.done);
        },
        emit:function(name, args){
            if(name && HANDLES[name] && HANDLES[name].length>0){
                HANDLES[name].forEach(function(handle){
                    if(handle) handle.call(scope, args);
                })
            }
        },
        on:function(name,fn){
            if( !HANDLES[name] ) HANDLES[name] = [];
            HANDLES[name].push(fn);
        },
        toScreen:function(peak){
            var vector = new THREE.Vector3(peak.x, peak.y, peak.z);
            var standardVector = vector.project(camera);
            var a = window.innerWidth / 2;
            var b = window.innerHeight / 2;
            return {
                x: Math.round( standardVector.x * a + a),
                y: Math.round( -standardVector.y * b + b)
            }

        },
        computePeak:function(vertex, reference){
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
                y : vector.max.y,
                z : (vertex.max.z + vertex.min.z) / 2
            }
        },
        clone:function(src){
            if(src === undefined || src === null) return null;
            if(typeof src === 'string'|| typeof src === 'number' || typeof src === 'boolean') return src;
            var target = {};
            for(var name in src){
                target[name] = src[name];
            }
            return target;
        }
    };
    WebShop.prototype.init.prototype = WebShop.prototype;

    function fetch(url, onsuccess, onerr){
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        // xhr.responseType = opt.type || '';

        // xhr.onprogress = opt.progress;
        xhr.onerror = onerr;
        xhr.timeout = onerr;
        xhr.onload = function(evt) {
            onsuccess( evt.target.response );
        };
        xhr.send(null);
    }

    return WebShop;
} );