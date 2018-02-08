// var webshop = WebShop({
//     objUrl:['./models/dsdsdsds03.3ds', './models/dsdsdsds03.3ds'],
//     infoUrl:['./js/a.json','./js/a.json']
// }).done(function(obj){
//     document.getElementById('load').style.display = 'none';
//     webshop.setLocal(0,100,0);
// })

var webshop = WebShop({
    objUrl: ["./models/dsdsdsds03.3ds", "./models/dsdsdsds03.3ds","./models/dsdsdsds03.3ds", "./models/dsdsdsds03.3ds","./models/dsdsdsds03.3ds", "./models/dsdsdsds03.3ds"],
    infoUrl: ["./js/a.json", "./js/a.json","./js/a.json", "./js/a.json","./js/a.json", "./js/a.json"]
});

webshop.done(function(obj) {
    document.getElementById("load").style.display = "none";
    webshop.setLocal(100, 0, 0);
    webshop.lineStart(-15, 0)
    webshop.lineTo(30, 50)
    webshop.lineEnd(-15, 100)
    webshop.lineTo(100,100)

    webshop.onselect(function(obj){
        console.log(obj)
        webshop.lineTo(obj.peak.x, obj.peak.z)
    })
    // webshop.lineEnd(30, 0)
});
