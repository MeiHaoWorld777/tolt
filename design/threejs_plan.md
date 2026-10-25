# three.js 升级计划（未来可选）

> 前提：当前游戏（Build 3031）已稳定——Blender 预渲染背景 + Canvas 2D 动效层。
> 本计划仅在新对话中、用户确认后实施。切勿在当前架构未回归测试时直接替换。

## 原则
- 不替换现有渲染管线，**增量叠加**：three.js 只做新演出层
- 移动端优先：弱网（3MB 全站）与低端 GPU 是硬约束
- 每步可独立回滚（版本号 ?v= 递增，SW 缓存 tolt-vN 递增）

## 阶段 1：视差纵深（1 次会话可完成，性价比最高）
1. 把每个背景 JPG 用深度估算拆两层：整图 + 模糊远层（PIL 高斯 + 中心偏移即可，无需 AI）
2. three.js（或纯 CSS transform）双平面视差：
   - 桌面：跟随鼠标 ±1.5% 位移
   - 手机：deviceorientation 陀螺仪（需 HTTPS，github.io 满足）
3. 立绘层反向微移，产生"人物浮于场景"感
4. 验收：800×360 模拟器 + 真机，帧率 ≥55fps

## 阶段 2：真结局线「潮汐」全 3D 演出（独立场景，不影响主线）
1. 仅 route_true 的高潮场景（七帆同渡）用 three.js：
   - 夜海平面（反射 shader）+ 七艘纸船（低模）+ 灯塔体积光
   - 模型用 Blender 现有管线导出 glTF（单文件 < 2MB，Draco 压缩）
2. 加载策略：进入真结局线时才异步加载 three.js 与模型，主线路径零开销
3. 降级：WebGL 不可用 → 回退到现有 CG 静帧

## 阶段 3（远期，需用户明确要求）：全场景 3D 化
- 仅在前面两阶段稳定运行一个月后再评估
- 参考：three.js 场景图直接复用 tools/blender/make_bgs.py 的建模函数（改用 bpy 导出 glTF）

## 技术要点
- three.js 引入方式：本地 vendor（`js/vendor/three.min.js`，r160+，勿用 CDN——弱网会挂）
- 现有 Canvas 动效层（bgkit/particles）保留，叠加顺序：three canvas → bg-canvas → sprite-layer
- SW 缓存版本每次 +1；APK 流水线无需改动（www 目录自动包含）
- 回归清单：主页/序章/夏祭/branches/结局卡/存读档/设置面板，全部要过一遍 800×360 与 1440×900
