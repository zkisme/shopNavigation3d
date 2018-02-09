// var webshop = WebShop({
//     objUrl:['./models/dsdsdsds03.3ds', './models/dsdsdsds03.3ds'],
//     infoUrl:['./js/a.json','./js/a.json']
// }).done(function(obj){
//     document.getElementById('load').style.display = 'none';
//     webshop.setLocal(0,100,0);
// })

var $location = document.getElementById('location');

var webshop = WebShop({
    objUrl: ["./models/dsdsdsds03.3ds", "./models/dsdsdsds03.3ds","./models/dsdsdsds03.3ds", "./models/dsdsdsds03.3ds","./models/dsdsdsds03.3ds", "./models/dsdsdsds03.3ds"],
    infoUrl: ["./js/a.json", "./js/a.json","./js/a.json", "./js/a.json","./js/a.json", "./js/a.json"],
    lineImg: '../img/jiantou.gif',
    raycasterIcon:$location
});

webshop.done(function(obj) {
    document.getElementById("load").style.display = "none";

    var v1 = webshop.addLocal();
    v1.setLocal(-15, 0, 0)
    v1.moveLocal({
        target:[{x:-15, y:100},{x:50, y:100}],
        time:[2000,5000],
        callback:function(){
            console.log('移动完成')
        }
    })

    var v2 = webshop.addLocal(6, 0xff00ff);
    v2.setLocal(-15, 150)

    // v2.remove();

    var l1 = webshop.addLine([
        [-15, 0, 0],
        [-15, 100, 0],
        [45, 100, 0]
    ]);

    l1.addPoint(-50,200,1)

    var l2 = webshop.addLine([
        [-15, 0, 1],
        [-15, 100, 1],
        [45, 100, 1]
    ])

    webshop.onselect(function(obj){
        console.log(obj)
    })
});
