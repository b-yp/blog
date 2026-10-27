// @ts-check

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";

/**
 * Umami 统计集成
 * @param {object} [options]
 * @param {string} [options.scriptUrl]
 * @param {string} [options.websiteId]
 * @param {boolean} [options.enableInDev] 是否在本地开发环境生效，默认 false
 * @returns {import('astro').AstroIntegration}
 */
function umami({
  scriptUrl = process.env.PUBLIC_UMAMI_SCRIPT_URL || "https://umami.baiyapeng.cc/script.js",
  websiteId = process.env.PUBLIC_UMAMI_WEBSITE_ID || "eb809e84-ba25-4e39-9e5b-a893055d609c",
  enableInDev = false,
} = {}) {
  return {
    name: "astro-umami-integration",
    hooks: {
      "astro:config:setup": ({ injectScript, command }) => {
        // 本地开发时不注入统计代码（避免产生测试污染），仅在生产构建时注入
        if (command === "dev" && !enableInDev) {
          return;
        }
        if (!websiteId || !scriptUrl) {
          return;
        }
        injectScript(
          "head-inline",
          `(()=>{const s=document.createElement('script');s.defer=true;s.src='${scriptUrl}';s.setAttribute('data-website-id','${websiteId}');document.head.appendChild(s);})();`
        );
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: "https://baiyapeng.cc",
  integrations: [mdx(), sitemap(), umami()],

  fonts: [
    {
      provider: fontProviders.local(),
      name: "Atkinson",
      cssVariable: "--font-atkinson",
      fallbacks: ["sans-serif"],
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/atkinson-regular.woff"],
            weight: 400,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./src/assets/fonts/atkinson-bold.woff"],
            weight: 700,
            style: "normal",
            display: "swap",
          },
        ],
      },
    },
  ],
});
