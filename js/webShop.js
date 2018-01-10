( function(win, factory){
    if(typeof module === 'object' && typeof module.exports === 'function'){
        module.exports = factory(win)
    }else{
        window.webShop = factory(win);
    }
})(window ? window : this, function(win){
    var doc,canvas,
        container = document.body,
        camera, renderer, scene,
        object,
        cameraGroup,
        boundingBox,
        defaults = {
            objUrl:null
        }
    ;

    if(!(doc = win.document)) throw new Error('此插件必须运行在有document的浏览器环境下');

    var WebShop = function(params){
        return new WebShop.prototype.init(params);
    }

    WebShop.prototype = {
        init: function(params){
            defaults = Object.assign({}, defaults, params);

            scene = new THREE.Scene();

            camera = new THREE.PerspectiveCamera(45, win.innerWidth / win.innerHeight, 1, 20000);
            camera.position.set(0,1000,2000);
            cameraGroup = new THREE.Group();
            cameraGroup.add(camera);
            scene.add(cameraGroup);

            var light = new THREE.AmbientLight( 0xffffff ); // soft white light
            scene.add( light );
            var pointLight = new THREE.PointLight(0xffffff);
            pointLight.position.set(100,200,500);
            scene.add(pointLight);

            renderer = new THREE.WebGLRenderer();
            // renderer.setClearColor(0xffffff);
            renderer.setPixelRatio(win.devicePixelRatio);
            renderer.setSize(win.innerWidth, win.innerHeight);
            container.appendChild(renderer.domElement);
            container.style.cssText = 'margin:0;padding:0;overflow:hidden;';

            this.loadObj();
            this.addAxes();

            this.animate();
        },
        loadObj:function(url){
            var self = this;
            var url = [];
            if(!defaults.objUrl){
                throw new Error('没有传入obj模型')
            }else if( typeof defaults.objUrl === 'string'){
                url.push(defaults.objUrl);
            }else if( Object.prototype.toString.call(defaults.objUrl) === '[object Array]'){
                url = defaults.objUrl;
            }else{
                throw new Error('objUrl类型错误，请传入字符串或数组对象')
            }

            var manager = new THREE.LoadingManager();
            manager.onProgress = function(item, loaded, total){
                console.log(item, loaded, total);
            };
            var loader = new THREE.OBJLoader(manager);


            function load(){
                var p = [];
                url.forEach(function(item, index){
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

            Promise.all(load())
                .then(function(obj){
                    obj.forEach(function(item, index){
                        var size = null;
                        item.traverse( function ( child ) {
                            if ( child instanceof THREE.Mesh ) {
                                child.material.color.set(0x156289);
                                child.geometry.center();
                                child.geometry.computeBoundingBox();
                                size = child.geometry.boundingBox.getSize();
                            }
                        } );
                        // item.rotation.x = -Math.PI / 2;
                        item.position.set(size.x / 2, index * 200 + size.y/2, size.z / 2);
                        var helper = new THREE.BoxHelper(item, 0x000000);
                        helper.update();
                        scene.add(helper)
                        scene.add(item);
                    });
                    object = obj;
                    cameraGroup.position.set(obj[0].position.x, obj[0].position.y, obj[0].position.z);
                    console.log(cameraGroup.position)
                })
                .catch(function(err){
                    throw new Error('模型加载失败')
                })
        },
        addAxes:function(){
            var axisHelper = new THREE.AxesHelper(2000);
            scene.add(axisHelper);

            var helper = new THREE.CameraHelper( camera );
            scene.add( helper );
        },
        animate:function(){
            var self = this;
            requestAnimationFrame(function(){
                self.animate.call(self);
            });
            self.render();
        },
        render:function(){
            cameraGroup.rotation.y += 0.005;
            camera.lookAt( scene.position );
            renderer.render( scene, camera );
        }
    }
    WebShop.prototype.init.prototype = WebShop.prototype;

    return WebShop;
} )