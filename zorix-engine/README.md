# Zorix Engine

一个可运行的网页版 3D 游戏引擎 / Zorix 风格编辑器原型。

## 运行方式

解压 zip 后进入 `zorix-engine` 目录，任选一种方式启动本地静态服务器：

```bash
python3 -m http.server 8080
```

然后打开：

```text
http://localhost:8080
```

也可以用 VS Code Live Server、任意 Nginx/Apache 静态目录或其他本地 HTTP server。

## 功能

- Zorix Engine 风格布局：Hierarchy、Scene/Game、Inspector、Project、Console
- WebGL 3D 视口，内置网格、灯光、相机、阴影
- 顶部创建菜单：cube、sphere、capsule、cylinder、cone、torus、ico、dodeca、ring、wall、ramp、stairs、tree、rock、crate、vehicle、terrain、water、particles、point light、spot light、camera marker
- 鼠标点选、Orbit 相机、TransformControls 移动/旋转/缩放
- Inspector 编辑名称、启用状态、锁定、位置、旋转、缩放、颜色、粗糙度、金属度
- 字体选择：Arial、Georgia、Courier、Verdana、Trebuchet、Impact 等
- Runtime Play/Pause/Stop
- ZorixScript 脚本组件：`spin`、`bob`、`orbit`、`move`、`pulse`、`lookAtCamera`
- 可导入天空图片，支持常见图片作为背景/环境贴图
- 可导入 `.glb` / `.gltf` 3D 模型
- 默认启动显示 `Made by Zorix Engine`
- 场景 JSON 导出
- Three.js 已随包附带，不依赖 CDN
- 画质档位：Ultra、High、Balanced、Low
- 画面增强：ACES tone mapping、sRGB 输出、柔和阴影、天空球、指数雾、程序化地形和透明水面

## 黑屏修复说明

新版 Three.js 的 `three.module.js` 依赖同目录下的 `three.core.js`。本版本已经把 `three.core.js` 一并打包到 `vendor/three/`，浏览器不会再因为模块缺失而黑屏。

## 说明

Zorix Engine 是一个可运行的 Web 3D 编辑器原型，适合继续扩展成自己的网页游戏引擎。
