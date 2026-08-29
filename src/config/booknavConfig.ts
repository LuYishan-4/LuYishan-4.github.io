import type { BooknavGroup, BooknavPageConfig } from "../types/booknavConfig";

// 书签导航页面配置
export const booknavPageConfig: BooknavPageConfig = {
  // 页面标题，如果留空则使用 i18n 中的翻译
  title: "",

  // 页面描述文本，如果留空则使用 i18n 中的翻译
  description: "",

  // favicon 自动获取配置
  favicon: {
    // 书签未填写 icon 时，是否自动获取目标站点的 favicon 图标
    enabled: true,

    // favicon 接口地址，{domain} 为占位符，会被替换成目标站点域名
    // 更换接口只需保证地址里含有 {domain}，例如：
    //   https://a.favicon.im/{domain}
    //   https://favicon.im/{domain}
    api: "https://a.favicon.im/{domain}",
  },
};

// 书签导航配置
// 每个数组项是一个分类组，分类组内的 items 是该分类下的书签
export const booknavConfig: BooknavGroup[] = [
  {
    id: "opensource",
    name: "项目",
    icon: "material-symbols:code-rounded",
    desc: "好用的开源项目",
    weight: 90,
    items: [
      {
        title: "Caelestia-dots-kde",
        url: "https://github.com/ladybug-me/caelestia-dots-kde",
        desc: "KDE 桌面环境的平铺窗口管理器",
        weight: 10,
      },
    ],
  },
  {
    id: "tools",
    name: "工具",
    icon: "material-symbols:build-outline-rounded",
    desc: "顺手的在线小工具",
    weight: 80,
    items: [
      {
        title: "Censys",
        url: "https://platform.censys.io/home",
        desc: "好用搜尋引擎",
        weight: 8,
      },
    ],
  },
  {
    id: "resources",
    name: "資源",
    icon: "material-symbols:auto-stories-outline-rounded",
    desc: "文檔",
    weight: 70,
    items: [
      {
        title: "OpenGL",
        url: "https://www.opengl.org",
        desc: "OpenGL 官方文檔",
        icon: "https://www.opengl.org/favicon.ico",
        weight: 10,
      },
      {
        title: "KDE API",
        url: "https://api.kde.org/",
        desc: "KDE 官方 API 文檔",
        weight: 9,
      },
    ],
  },
];
