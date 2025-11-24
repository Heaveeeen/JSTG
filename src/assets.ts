import * as PIXI from "pixi";

/** @async 加载一个素材（如图像）。加载 svg 时请使用 {@link LoadSVG} */
export function LoadAsset<T = PIXI.Texture>(url: string, options?: PIXI.LoadOptions): Promise<T> {
    return PIXI.Assets.load(url, options);
}

/** @async 加载一个 svg 图像。加载其他图像时请使用 {@link LoadAsset} */
export function LoadSVG(
    /** ⚠️该路径是基于 index.html 的！别问我到底是怎么回事，我也不太懂这玩意。请自行开控制台调试。 */
    svgUrl: string,
    /** 加载分辨率倍数。如果发现图像是糊的，请调高该参数。
     * @default 1 */
    resolution?: number
): Promise<PIXI.Texture> {
    return PIXI.loadSvg.load!("assets/images/foo.svg", {
        data: {
            resolution,
            crossOrigin: null,
            parseAsGraphicsContext: false,
        }
    }) as Promise<PIXI.Texture>;
}
