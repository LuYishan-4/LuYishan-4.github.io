---
title: OpenGL如何使用自製glad
published: 2026-08-30
pinned: false
description: 包含常見安裝擴充。
tags: [Markdown, "OpenGL"]
category: 文章示例
image: ./images/1787624700704.jpg
slug: OpenGLglad
---

## 為什麼需要 glad？

OpenGL 本身只是一份「規格」（specification），實際的函式進入點（function pointer）必須在執行期由驅動程式提供，作業系統只會內建非常舊版本的 OpenGL 標頭（例如 Windows 只內建到 OpenGL 1.1）。如果想使用比較新的 OpenGL 版本或擴充功能（extension），就必須自己在程式啟動時，透過 `wglGetProcAddress` / `glXGetProcAddress` 之類的函式，把每一個新函式的位址抓出來。

這件事如果手動做非常繁瑣，而且每個平台的作法都不一樣，於是就有了「OpenGL Loader Generator」這類工具，**glad** 就是其中最常見、使用度最高的一款。

## glad 是什麼

[glad](https://github.com/Dav1dde/glad) 是由 Dav1dde 開發的一個 loader 產生器，它會直接讀取 Khronos 官方釋出的 XML 規格檔，依照你指定的 API、版本與擴充功能，「客製化」產生出對應的載入程式碼（source + header）。

它的特色大致如下：

- 支援多種圖形 API：OpenGL、OpenGL ES、EGL、GLX、WGL，新版（glad2）甚至加入了 Vulkan
- 支援多種語言：C/C++、D、Nim、Pascal、Volt 等
- 因為是直接從官方 XML 規格產生，正確性與更新速度都有保障
- 提供線上網頁生成器

## glad.dav1d.de：線上生成器

[https://glad.dav1d.de/](https://glad.dav1d.de/) 是 glad 專案官方提供的網頁版生成器，對大多數只想「產生一份 glad 檔案來用」的人來說，完全不需要安裝 Python 版的 glad，直接在網頁上勾選好選項、按下產生按鈕，下載 zip 即可。


進入頁面後會看到幾個區塊：

### 1. Language（輸出語言）

決定產生出來的程式碼是哪種語言，選項包含：

- **C/C++**：最常用，也是絕大多數 OpenGL 教學採用的版本
- **C/C++ Debug**：在一般 C/C++ 版本的基礎上加入除錯用的包裝（wrapper），每次呼叫 OpenGL 函式前後都會插入額外檢查（例如自動呼叫 `glGetError`），方便開發階段抓錯，但效能會比正式版差一些
- **D / Volt / Nim / Pascal**：給使用這些語言開發的人使用

一般使用 C/C++ 開發、正式發布時，選 **C/C++** 即可；開發階段想抓 OpenGL 錯誤，可以先用 **C/C++ Debug** 版本。

### 2. Specification（規格 / API）

這裡選的是你要用哪一套圖形 API 規格，包含：

- **OpenGL (gl)**：桌面版 OpenGL，也是最常見的選擇
- **EGL**：用來在各平台（尤其是嵌入式、行動裝置、Linux 上不透過 GLX/WGL）建立繪圖 context 的介面
- **GLX**：Linux/X11 平台下，讓 OpenGL 與視窗系統溝通的介面
- **WGL**：Windows 平台下，讓 OpenGL 與視窗系統溝通的介面

大部分情況下，只需要勾選 **gl**（OpenGL 本體）；如果你是透過 GLFW、SDL 等函式庫來開窗，視窗系統相關的 context 建立已經被這些函式庫包好了，通常不需要額外勾 EGL / GLX / WGL，而且另外講一下若你之後會開發像Kwin插件那類直接在系統的不需要用到glad跟創glfw因爲它本身已經創好了。

### 3. API 版本（Version）

每個 API 下面會列出可選的版本號，例如 gl 從 1.0 一路到目前最新的 4.6。這裡的邏輯是：**選了某個版本，glad 就會把「該版本以前（含）所有核心函式」都包進去**，版本越高涵蓋的函式越多。

實務上的建議：

- 不確定要用到多新的功能時，選 **4.6**（目前桌面 OpenGL 的最新版）最保險，之後程式裡只呼叫你用得到的函式即可，不會有額外負擔
- 如果目標平台比較舊（例如某些教學或相容性考量），才需要刻意選較低版本，例如 3.3

### 4. Profile（描述檔）

這是 OpenGL 3.2 之後才有的概念，只影響 gl 這個 API：

- **Core**：只包含現代、精簡的固定管線之後的 API，移除掉舊式（fixed-function pipeline，例如 `glBegin`/`glEnd`）的函式。現在幾乎所有新專案、教學都建議用這個
- **Compatibility**：向下相容，保留舊版固定管線的函式，通常只有在需要與舊程式碼相容，或某些教學特別要求時才會用

一般新專案的建議：**Core**。

### 5. Extensions（擴充功能）

這一大串清單就是所有 Khronos 登記在案的擴充功能（例如 `GL_ARB_*`、`GL_EXT_*`、`GL_NV_*` 等），代表某些顯示卡廠商或延伸規格額外提供、還沒被收進核心版本的功能。

**常見會另外勾選的擴充**（也就是說明裡提到的「常見安裝擴充」）：

- `GL_ARB_texture_filter_anisotropic`（或舊版的 `GL_EXT_texture_filter_anisotropic`）：非等向性過濾，改善貼圖在斜角觀看時的清晰度
- `GL_ARB_debug_output` / `GL_KHR_debug`：提供更完整的除錯訊息回呼機制，開發階段非常實用
- `GL_ARB_direct_state_access`：DSA，讓你不用先 bind 物件就能直接操作，能簡化不少程式碼
- `GL_ARB_bindless_texture`：bindless 貼圖，進階效能優化才會用到

不確定要不要勾，通常的原則是：**先不要全選**（全選會讓產生的檔案變得龐大、也會失去 glad「客製化、輕量」的意義），等到專案真的需要某個擴充功能時，再回來這裡加選、重新產生即可。

### 6. Options（其他選項）

- **Generate a loader**：勾選後才會產生 `gladLoadGL()` 這類「初始化 / 載入所有函式指標」的程式碼；如果你已經有自己的載入邏輯，可以不勾，只拿函式宣告
- **Omit KHR**：省略 KHR 平台標頭（`khrplatform.h`），適合已經有自己一份 khrplatform.h、或用某些精簡環境時使用；官方註記這個選項可能因規格變動而不一定能正常運作
- **Local files**：使用本機快取的規格檔而非即時下載最新版，主要差異在於「產生速度」與「規格新舊」

## 實際使用流程

1. 打開 [glad.dav1d.de](https://glad.dav1d.de/)
2. Language 選 **C/C++**
3. Specification 只勾 **gl**，版本選你需要的（例如 4.6）
4. Profile 選 **Core**
5. Extensions 依需求加選（不確定就先不加）
6. Options 記得勾 **Generate a loader**
7. 按下 **GENERATE**，下載產生出來的壓縮檔
8. 把裡面的 `include/` 和 `src/glad.c` 加進你的專案，並確保 `#include <glad/glad.h>` **在任何其他 OpenGL 相關標頭（例如 GLFW）之前引入**
9. 在建立好繪圖 context 之後，呼叫產生的載入函式，例如：

```c
#include <glad/glad.h>
#include <GLFW/glfw3.h>

int main(void) {
    // ... 建立視窗與 context ...
    glfwMakeContextCurrent(window);

    if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress)) {
        printf("Failed to initialize GLAD\n");
        return -1;
    }

    printf("Loaded OpenGL %d.%d\n", GLVersion.major, GLVersion.minor);
    // ... 開始使用 OpenGL 函式 ...
}
```

## 小結

- **glad 本身**：一個依規格「客製化產生」OpenGL/EGL/GLX/WGL 載入程式碼的工具
- **glad.dav1d.de**：官方提供的免安裝網頁版生成器
- 選項核心邏輯：**Language**（輸出語言）→ **Specification + Version**（要哪個 API、多新的版本）→ **Profile**（Core / Compatibility）→ **Extensions**（額外擴充功能）→ **Options**（要不要產生 loader、省略檔案等）
- 新專案的推薦組合：C/C++、gl、最新版本（如 4.6）、Core、視需求加擴充、勾選 Generate a loader
