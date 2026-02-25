import * as pixi from "pixi";

/* 复制自 advanced-blend-modes.js */
export class DifferenceBlendFilter extends pixi.BlendModeFilter {
    constructor() {
        super({
            gl: {
                functions: `
                    vec3 blendDifference(vec3 base, vec3 blend,  float opacity)
                    {
                        return (abs(blend - base) * opacity + base * (1.0 - opacity));
                    }
                `,
                main: `
                    finalColor = vec4(blendDifference(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `
            },
            gpu: {
                functions: `
                    fn blendDifference(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                    {
                        return (abs(blend - base) * opacity + base * (1.0 - opacity));
                    }
                `,
                main: `
                    out = vec4<f32>(blendDifference(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
                `
            },
        });
        // 这条貌似就是 issue-#6 的元凶，不加上这条就会导致分辨率爆炸。虽然我早就看出来了好像分辨率有点问题但是没想到这么简单。。。
        this.resolution = "inherit";
    }
}