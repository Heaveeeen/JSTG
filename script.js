import * as JSTG from "./dist/jstg.js";
import * as PIXI from "pixi";

(async () => {

    const game = await JSTG.LaunchGame();
    const { LoadAsset, LoadSVG, Key } = JSTG;
    const { forever, coDo, Entity } = game;
    const { isDown, isUp, isHold, isIdle } = game.input;

    console.log("game:", game);

    const txt = new PIXI.Text({
        text: "Hello, PIXI & JSTG! \n你好你好你好说的道理",
        x: 320,
        y: 240,
    });
    txt.anchor = 0.5;
    game.app.stage.addChild(txt);

    const fooTexture = await LoadSVG("assets/images/foo.svg", 2); // 这是小 simple，她很可爱，我借来用用，而且她很可爱

    const fooSpr = new PIXI.Sprite(fooTexture);
    fooSpr.x = 320;
    fooSpr.y = 240;
    fooSpr.anchor = 0.5;
    const fooEnt = new Entity(fooSpr);

    fooEnt.forever(() => {
        if (isHold(Key.ArrowLeft)) fooSpr.x -= 2 * game.ts;
        if (isHold(Key.ArrowRight)) fooSpr.x += 2 * game.ts;
        if (isHold(Key.ArrowUp)) fooSpr.y -= 2 * game.ts;
        if (isHold(Key.ArrowDown)) fooSpr.y += 2 * game.ts;
        if (isHold(Key.KeyL)) fooEnt.die();
    });

})();