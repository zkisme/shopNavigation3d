# shopNavigation3d

## 简介
![demo](https://raw.githubusercontent.com/zkisme/shopNavigation3d/master/img/demo.png)

加载3ds模型，生成立体图案，类似3d展示

**功能点**
---
- 加载多个3ds模型，自动生成上下具有一定间距的楼层
- 加载模型对应的物体的名称和颜色信息的json文件
- 信息中的物体如果有name字段则认为是可以交互的模型，鼠标可以点击，改变物体颜色和对应标注
- 点击可交互的物体可以自动定位到所属的模型
- 可以添加路径信息，路径贴图可自定义，默认动画
- 可以添加位置信息，位置显示为一个球体
- 位置信息可以更改， 更改位置可以设置动画
- 默认添加楼层dom，点击楼层dom可以定位到对应楼层，切换楼层时对应的楼层dom高亮显示
- 添加reset重置视角按钮，点击后再当前楼层重置视角
- 添加返回按钮，返回上一个页面，主要是针对全屏浏览器设置
- 添加手势交互，单指滑动平移，双指掐放缩放，双指旋转
- 点击可交互物体返回物体信息，用于自定义
- gulp打包，所用插件库打包成vender.min.js文件，减少http请求和大小

## 2018-2-9更新记录
1. 添加线条和位置点更改为工厂模式，自动返回实例，实例包含方法可操作当前物体

2. 更新scope.addLocal(size, color)， 创建一个位置，
    - size: 位置几何体的大小，
    - color： 几何体的颜色，需 0x开头的16进制色值，如0xffffff

    返回位置的实例， 实例包含如下方法
    - getLocal()  返回此物体的位置坐标
    - setLocal(x, y, index) 设置此物体的坐标
    - moveLocal(x, y, index) 移动此物体的坐标，有过度效果
    - remove() 移除此物体

3. 添加 scope.cleanAllLocal() 移除所有位置物体

4. 添加 scope.addLine(x, y ,index, size, img), 创建一个线条

    - x: x坐标，
    - y：对应z坐标
    - index： 楼层索引
    - size： 线条粗细
    - img：线条贴图

    返回线条实例，实例包含如下方法

    - addPoint(x, y, index) 添加线条点
    - updateLine() 更新线条
    - remove() 移除当前线条

5. 新增 scope.cleanAllLine() 清除所有线条 

## 使用

**引用**
```
<script src="./dist/vendor.min.js"></script>
<script src="./dist/webShop.min.js"></script>
```
**初始化**
```
var webshop = WebShop(params)

// 或
var webshop = WebShop(params);
```

## 默认可自定义参数
```
{
    objUrl: null, // 加载的模型的url， 可以为数组或者字符串
    infoUrl: null, // 加载的模型对应的标注和颜色信息， 可以为数组或者字符串， 顺序要与objUrl相同
    index: 0, // 初始化显示的模型的索引
    gap: 200, // 多个模型之间的高度间距
    isFloor: true, // 是否需要楼层
    isReset: true, // 是否需要重置按钮
    isBack: true, // 是否需要返回按钮
    lineImg: '../img/jiantou.png', // 路径自定义贴图
    cameraPosition: {
        // 相机的位置
        x: 0,
        y: 100,
        z: 400
    },
    selectObjColor: 0x98e8ff, // 选中物体显示的颜色，需要使用16进制 0x开头的色值
    raycasterIcon:null, // 选中物体是显示的标注， dom
    floorBoxStyle: FLOOR_BOX_STYLE, // 楼层容器的样式
    floorStyle: FLOOR_STYLE, // 楼层的样式
    resetBtnStyle: RESET_BTN_STYLE, // 重置按钮的样式
    backBtnStyle: BACK_BTN_STYLE, // 返回按钮的样式
    textStyle: TEXT_STYLE, // 标注文字的样式
    textSelectStyle: TEXT_SELECT_STYLE // 选中物体的标注文字的样式
};
```

## 用户方法
- setLocal(x, y, index)

    设置位置坐标

    x: 世界坐标系中的x坐标， 默认0

    y: 对应世界坐标系中的z轴坐标， 默认0

    index: 可选， 楼层信息，会自动算上楼层之间的间距， 默认0

- getLocal()

    返回位置坐标，返回的是世界坐标，x,y,z

- moveLocal(param)

    移动位置，带有动画效果

    ```
    {
        target:null, // 对象 {x:x, y:y}; 数组：[{x:x,y:y}]
        time:2000, // 可以为对象或者数组
        callback:null // 移动完成后的回调函数
    }
    ```

- addLinePoint(x, y, index)

    添加路径点，会自动连接所添加的路径

    x: 世界坐标系中的x坐标

    y: 对应世界坐标系中的z轴坐标

    index: 可选， 楼层信息，会自动算上楼层之间的间距， 默认0

- cleanLine()

    清除所有路径

- onselect(fn)

    当点击可交互的物体时执行fn回调

    返回所选可交互物体的信息，带有名称myName， 顶点坐标peak

- getSelect()

    获取当前选中的物体，返回物体，带有名称myName， 顶点坐标peak

- setIndex(index)

    设置聚焦楼层，有个动画过度的效果

    index: 所要设置楼层的索引

- hideText()

    隐藏所有标注

- done(fn)

    加载完成执行函数，相当于ready()

- reset()

    重置相机视角，只会在当前楼层重置

- toScreen({x, y, z})

    将世界坐标转换成屏幕坐标

    返回：

    ```
    return {
        x, // 屏幕坐标x坐标
        y, // 屏幕y坐标 
        z, // 距离摄像机的距离的平方
        opacity, // 返回应该显示的透明度(内部使用)
        isInScreen // 是否在屏幕范围内
    };
    ```

## 其他

**世界坐标系**
---
世界坐标系为右手坐标系，简单来所对应到屏幕就是

在没有旋转的情况下

屏幕向右方向为 ==x正轴方向==

屏幕向上方向为 ==y正轴方向==

屏幕向外方向为 ==z正轴方向==





