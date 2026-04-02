import * as pixi from "pixi";

// 这里的文本格式最好别改
const defaultGlVertex = `in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}`;

const glFragments = `
in vec2 vTextureCoord;

out vec4 finalColor;

uniform vec4 uHsla;
uniform sampler2D uTexture;

// 以下两个函数是 DS 写的，谢谢 DS
// RGB 转 HSL
// 输入: rgb - vec3(r, g, b) 各分量范围 0.0 ~ 1.0
// 输出: vec3(h, s, l)  h 范围 0.0 ~ 360.0, s/l 范围 0.0 ~ 1.0
vec3 rgb2hsl(vec3 rgb) {
    float r = rgb.r;
    float g = rgb.g;
    float b = rgb.b;
    
    float maxC = max(r, max(g, b));
    float minC = min(r, min(g, b));
    float delta = maxC - minC;
    
    // 计算亮度 L
    float L = (maxC + minC) * 0.5;
    
    float H = 0.0;
    float S = 0.0;
    
    if (delta > 0.001) {
        // 计算饱和度 S
        if (L < 0.5)
            S = delta / (maxC + minC);
        else
            S = delta / (2.0 - maxC - minC);
        
        // 计算色相 H
        if (maxC == r)
            H = (g - b) / delta + (g < b ? 6.0 : 0.0);
        else if (maxC == g)
            H = (b - r) / delta + 2.0;
        else
            H = (r - g) / delta + 4.0;
        
        H *= 60.0;
    }
    
    return vec3(H, S, L);
}

// HSL 转 RGB
// 输入: hsl - vec3(h, s, l)  h 范围 0.0 ~ 360.0, s/l 范围 0.0 ~ 1.0
// 输出: vec3(r, g, b) 各分量范围 0.0 ~ 1.0
vec3 hsl2rgb(vec3 hsl) {
    float H = hsl.x;
    float S = hsl.y;
    float L = hsl.z;
    
    if (S < 0.001) {
        // 无饱和度，返回灰度
        return vec3(L, L, L);
    }
    
    float C = (1.0 - abs(2.0 * L - 1.0)) * S;      // 色度
    float Hp = H / 60.0;
    float X = C * (1.0 - abs(mod(Hp, 2.0) - 1.0));
    
    vec3 rgbPrime;
    if (Hp < 1.0)
        rgbPrime = vec3(C, X, 0.0);
    else if (Hp < 2.0)
        rgbPrime = vec3(X, C, 0.0);
    else if (Hp < 3.0)
        rgbPrime = vec3(0.0, C, X);
    else if (Hp < 4.0)
        rgbPrime = vec3(0.0, X, C);
    else if (Hp < 5.0)
        rgbPrime = vec3(X, 0.0, C);
    else
        rgbPrime = vec3(C, 0.0, X);
    
    float m = L - C * 0.5;
    return rgbPrime + m;
}

void main() {
    vec4 textureRgba = texture(uTexture, vTextureCoord);
    vec3 textureHsl = rgb2hsl(textureRgba.rgb);
    float th = textureHsl.x;
    float ts = textureHsl.y;
    float tl = textureHsl.z;
    float ta = textureRgba.w;
    float uh = uHsla.x;
    float us = uHsla.y;
    float ul = uHsla.z;
    float ua = uHsla.w;
    vec3 outHsl = vec3(
        mod(th + uh, 360.0),
        clamp(ts * us, 0.0, 1.0),
        clamp(tl * ul * 2.0, 0.0, 1.0)
    );
    vec3 outRgb = hsl2rgb(outHsl);
    finalColor = vec4(outRgb, ta * ua);
}`;
// TODO: gpuProgram

export type HslaColor = { h: number, s: number, l: number, a: number };
export type RgbaColor = { r: number, g: number, b: number, a: number };

export const rgbaToHsla = (rgbaColor: RgbaColor) => {
    const { r, g, b, a } = rgbaColor;

    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const delta = maxC - minC;

    let h = 0;
    let s = 0;
    let l = (maxC + minC) / 2;

    if (delta !== 0) {
        s = l < 0.5 ? delta / (maxC + minC) : delta / (2 - maxC - minC);

        switch (maxC) {
            case r:
                h = (g - b) / delta + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / delta + 2;
                break;
            case b:
                h = (r - g) / delta + 4;
                break;
        }

        h *= 60;
    }

    return { h, s, l, a };
}

export const makeHsla = (color: HslaOptions = {}) => {
    if (typeof color === "string") {
        return rgbaToHsla(new pixi.Color(color).toRgba());
    } else {
        return { h: color.h ?? 0, s: color.s ?? 1, l: color.l ?? 0.5, a: color.a ?? 1 };
    }
};

export interface PartialHslaColor {
    /**
     * 色相加数，取值为 0 ~ 360 。
     * @default 0
     */
    h?: number;
    /**
     * 饱和度乘数。
     * @default 1
     */
    s?: number;
    /**
     * 亮度乘数的一半。
     * @default 0.5
     */
    l?: number;
    /**
     * 可见度乘数。
     * @default 1
     */
    a?: number;
}

export type HslaOptions = PartialHslaColor | string;

export class HslaFilter extends pixi.Filter {

    private _uHsla: {
        value: Float32Array<ArrayBuffer>;
        type: "vec4<f32>";
    }

    constructor(options: string | PartialHslaColor = {}) {
        const color = makeHsla(options);
        const glProgram = pixi.GlProgram.from({
            vertex: defaultGlVertex,
            fragment: glFragments,
            name: "jstg-hsla-filter",
        });
        const uHsla = { value: new Float32Array([color.h, color.s, color.l, color.a]), type: 'vec4<f32>' as const };
        super({
            glProgram,
            resources: {
                alphaUniforms: new pixi.UniformGroup({
                    uHsla,
                }),
            },
            resolution: "inherit",
        });
        this._uHsla = uHsla;
    }

    /** 色相加数，取值为 0 ~ 360 。 */
    get h() { return this._uHsla.value[0]; }
    set h(n: number) { this._uHsla.value[0] = n; }
    /** 饱和度乘数。 */
    get s() { return this._uHsla.value[1]; }
    set s(n: number) { this._uHsla.value[1] = n; }
    /** 亮度乘数的一半。 */
    get l() { return this._uHsla.value[2]; }
    set l(n: number) { this._uHsla.value[2] = n; }
    /** 可见度乘数。 */
    get a() { return this._uHsla.value[3]; }
    set a(n: number) { this._uHsla.value[3] = n; }

    copy() { return new HslaFilter(this); }

}