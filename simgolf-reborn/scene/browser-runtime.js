// Linux CI uses Mesa/llvmpipe under Xvfb rather than Chromium's Vulkan
// SwiftShader backend. Tests retain their real viewport and scene rendering.
export const browserRuntime = process.env.CI ? {
 headless: false,
 launchOptions: {args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--ozone-platform=x11', '--disable-gpu-sandbox']},
} : {};
