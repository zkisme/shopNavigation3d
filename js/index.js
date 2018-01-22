var webshop = WebShop({
    objUrl:['./models/dsdsdsds03.3ds', './models/dsdsdsds03.3ds'],
    infoUrl:['./js/a.json','./js/a.json']
}).done(function(obj){
    addNavigation.call(this, obj);
})


function addNavigation(arr){
    var _this = this;
    var navigation = document.createElement('ul');
    navigation.style.cssText = 'position:fixed;left:10px;bottom:50px;z-index:9;overflow-x:hidden;overflow-y:scroll;width:30px;background:#fff;border-radius:4px;padding:0;margin:0;list-style:none;';

    arr.forEach(function(item,index){
        var li = document.createElement('li');
        li.style.cssText = 'display:block;width:100%;height:30px;text-align:center;line-height:30px;'+ (index !== 0 ? 'border-top:1px solid #ddd;' : '');
        li.innerText = index + 'F';
        li.onclick = function(e){
            e.stopPropagation();
            _this.lookAt(index);
        }
        navigation.appendChild(li);
    })
    document.body.appendChild(navigation);
}

