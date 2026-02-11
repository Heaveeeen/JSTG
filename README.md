<p align="center">
  <a href="https://github.com/Heaveeeen/JSTG">
    <img style="height: 120px" alt="JSTG-logo" src="./assets/jstg-icon/jstg-logo-2.svg">
  </a>
</p>

# J-STG ⛩️

JSTG 是一个用于制作类似《东方Project》的弹幕射击游戏的游戏框架。

## 概述

本框架的设计目标是成为与 [simple 的弹幕引擎模板](https://www.ccw.site/detail/66b599236d94eb6335e33779) 并列的另一种选择，提供更强大的功能、更好的性能、更舒适的编程体验。目前设想的目标包括但不限于：

* 在同一个作品中，包含多个道中和 Boss 关卡。
* 将不同的内容（例如不同关卡和不同符卡）分散在多个文件中，以便管理大型项目。
* 为关卡添加《东方》原作风格的背景。
* 允许更多弹幕同屏共存。
  * *（simple 的弹幕引擎中，整个画面相比原作都等比放大了约4/3倍，弹幕和自机判定点都更大了，主要就是为了减少同屏的弹幕数量，照顾一下 Scratch 可怜的性能。因此那里边很难做太密集的弹幕。）*
* Replay 功能。

本框架不打算做成一个封闭的包（因为本人水平不足，设计不出足够通用的接口），而是打算做成一个可供自由修改的开放式框架，每个用户都可以按需修改框架的内容。换句话说，本项目可能会更像是一个“模板”而非“框架”。但这部分具体该怎么样还有待商榷。。。*（我自己跟自己商榷是吗）*

⚠️目前该项目仅处于早期探索阶段，接口随时可能发生更改！注释和文档都可能是不准确或过时的！⚠️

## 版权声明

本框架准备采用 MIT 开源协议，但我暂且不想管这个。

本框架引用了 pixi.js 和 howler.js 。部分素材借用自 Simple 的弹幕引擎模板（以250724版为主）和《东方Project》系列作品。LOGO 中使用了思源黑体作为字体。

如果您想要利用此框架制作自己的作品或者进行修改、分发等等，请注意不要侵犯我的上游版权方。请认真阅读 `./lib` 中的相关说明。

## 相关链接

[JSTG - github](https://github.com/Heaveeeen/JSTG)  
[pixi.js](https://pixijs.com)  
[pixi.js v8.14.3 官方文档](https://pixijs.download/v8.14.3/docs/index.html)  
[howler.js](https://howlerjs.com/)  
[simple 的弹幕引擎模板](https://www.ccw.site/detail/66b599236d94eb6335e33779)  
[东方Project使用规定](https://www.bilibili.com/opus/400555526272745308)  
