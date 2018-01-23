var webshop = WebShop({
    objUrl:['./models/dsdsdsds03.3ds', './models/dsdsdsds03.3ds'],
    infoUrl:['./js/a.json','./js/a.json']
}).done(function(obj){
    addNavigation.call(this, obj);
    document.getElementById('load').style.display = 'none';
})


function addNavigation(arr){
    var _this = this;
    var navigation = document.createElement('ul');
    navigation.style.cssText = 'position:fixed;left:10px;bottom:50px;z-index:9;overflow-x:hidden;overflow-y:scroll;width:30px;background:#34495E;border-radius:4px;padding:0;margin:0;list-style:none;max-height:120px;color:#fff;';

    arr.forEach(function(item,index){
        var li = document.createElement('li');
        li.style.cssText = 'display:block;width:100%;height:30px;text-align:center;line-height:30px;'+ (index !== 0 ? 'border-top:1px solid #ddd;' : '');
        li.innerText = (index+1) + 'F';
        li.onclick = function(e){
            e.stopPropagation();
            _this.setIndex(index);
        }
        navigation.insertBefore(li,navigation.lastChild);
    })
    document.body.appendChild(navigation);

    var $reset = document.createElement('div');
    $reset.style.cssText = 'position:fixed;right:10px;bottom:50px;background:#34495E;border-radius:50%;width:40px;height:40px;text-align:center;line-height:40px;color:#fff;font-size:10px;';
    $reset.innerText = '重置';
    $reset.onclick = function(e){
        e.stopPropagation();
        _this.reset();
    }
    document.body.appendChild($reset)
}

