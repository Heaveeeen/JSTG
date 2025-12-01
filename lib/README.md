此文件夹存放的是 JSTG 所引用的第三方库。

这些库都不是完整 npm 包的形式，因为我嫌 npm 包太臃肿了，而且我猜能用上我这小破框架的人大概也没几个会装 npm 的。

*（pixi 跟 howler 加起来 60 多 MB ，真服了，隔壁 simple 的弹幕引擎才 8 MB 多点）*

笔者不是非常了解版权相关的问题。我想，用我这个框架的各位用户朋友，多半也不是非常了解。建议仔细阅读以下我给出的相关提示。

## pixi

pixi（或 pixi.js）是一个图形库，JSTG 依靠 pixi 来加载资源、绘制画面、维护基本的游戏循环。

* [./pixi/pixi.min.js](./pixi/pixi.min.js) 包含了 pixi 的主要功能，程序运行的时候须导入这个文件。
* [./pixi/pixi.min.mjs.map](./pixi/pixi.min.mjs.map) 是辅助调试用的，不想要的话可以删掉。
* [./pixi/pixi.d.ts](./pixi/pixi.d.ts) 是 pixi 的类型注释，能在编程时提示你各个功能的用法，非常有用。
* [./pixi/README.md](./pixi/README.md) 是 pixi 的自述文档。
* [./pixi/LICENSE](./pixi/LICENSE) 是 pixi 的版权信息。pixi 采用 MIT 开源许可证：
  * 我们有权利使用、复制、修改、合并、出版发行、散布、再授权及贩售软件及软件的副本。
  * 我们 **有义务** 在软件和软件的所有副本中包含版权声明和许可声明。
  * 也就是说，如果你基于 JSTG 做了个游戏出来，**必须** 在你的游戏中包含这个文件。

总之：

* 程序运行 **必须依赖** [./pixi/pixi.min.js](./pixi/pixi.min.js) 。
* [./pixi/pixi.min.mjs.map](./pixi/pixi.min.mjs.map) 和 [./pixi/pixi.d.ts](./pixi/pixi.d.ts) 仅供开发和调试用，发布时可以不包含
* 自述文档 [./pixi/README.md](./pixi/README.md) 为了确保版权信息的完整， **应当保留**。
* 版权声明 [./pixi/LICENSE](./pixi/LICENSE) 在原则上 **必须保留**。

## howler

howler（或 howler.js）是一个音频库，可以用它来低延迟地播放音乐或音效。

* [./howler/howler.min.js](./howler/howler.min.js) 包含了 howler 的主要功能，程序运行的时候须导入这个文件。
* [./howler/README.md](./howler/README.md) 是 howler 的自述文档。
* [./howler/LICENSE.md](./howler/LICENSE.md) 是 howler 的版权信息。howler 采用 MIT 开源许可证。（参见上文）

总之：

* 程序运行 **必须依赖** [./howler/howler.min.js](./howler/howler.min.js) 。
* 自述文档 [./howler/README.md](./howler/README.md) 为了确保版权信息的完整， **应当保留**。
* 版权声明 [./howler/LICENSE](./howler/LICENSE.md) 在原则上 **必须保留**。