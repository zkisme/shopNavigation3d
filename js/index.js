// var webshop = WebShop({
//     objUrl:['./models/dsdsdsds03.3ds', './models/dsdsdsds03.3ds'],
//     infoUrl:['./js/a.json','./js/a.json']
// }).done(function(obj){
//     document.getElementById('load').style.display = 'none';
//     webshop.setLocal(0,100,0);
// })

var webshop = WebShop({
    objUrl: ["./models/dsdsdsds03.3ds", "./models/dsdsdsds03.3ds"],
    infoUrl: ["./js/a.json", "./js/a.json"]
});

webshop.done(function(obj) {
    document.getElementById("load").style.display = "none";
    webshop.setLocal(0, 100, 0);
});
