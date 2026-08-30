---
title: KDE-Wayland插件開發
published: 2026-08-30
pinned: false
description: kwin開發。
tags: [Markdown, "Kwin"]
category: 文章示例
image: ./images/IMG_20260806_160843_128.jpg
slug: kpluginhow
---

# 如何開發 KWin 插件

KWin 是 KDE Plasma 桌面環境內建的視窗合成器與視窗管理員，支援在 X11 與 Wayland 兩種顯示協定下運作。KWin 提供了相當彈性的插件架構，讓開發者能在不修改核心程式碼的情況下擴充功能，例如特效（Effects）、腳本（Scripts）、視窗裝飾（Window Decorations）等。本文將介紹兩種主要的開發方式：**KWin Scripts（QML/JavaScript）** 與 **KWin C++ 原生插件（Effects/Plugins）**。

## 一、開發方式概覽

KWin 的擴充機制大致分為三類：

1. **KWin Scripts**：使用 JavaScript 撰寫，透過 KWin 提供的腳本 API 操作視窗、工作區、輸出裝置等，開發門檻低，適合快速原型與簡易自動化邏輯。
2. **KWin Effects（特效插件）**：使用 C++ 撰寫，可直接存取合成器的渲染管線，適合實作視覺特效（如模糊、縮放動畫、轉場效果）。
3. **視窗裝飾（Decoration）插件**：使用 C++ 與 QML 撰寫，用來自訂視窗標題列、按鈕樣式等外觀。

以下分別說明前兩種最常見的開發方式。


## 二. 撰寫 metadata.json

`metadata.json` 定義插件的基本資訊，KWin 會依此辨識並載入腳本：

```json
{
    "KPlugin": {
        "Id": "my-kwin-script",
        "Name": "My KWin Script",
        "Description": "示範用的 KWin 腳本插件",
        "Authors":  "你的名字",
        "Version": "1.0",
        "License": "GPL-3.0-or-later"
    }
}
```
## 三、開發 KWin Effect（C++ 原生特效插件）

### 1. 環境需求

- KDE Frameworks（KF6）與 Qt6 開發套件
- KWin 原始碼與標頭檔（建議使用發行版提供的 `kwin-devel` 或自行編譯 KWin）
- CMake、extra-cmake-modules

### 2. 基本 CMakeLists.txt 範例

```cmake
cmake_minimum_required(VERSION 3.19)
project({your_project_name} VERSION 6.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
find_package(ECM 6.0.0 REQUIRED NO_MODULE)
set(CMAKE_MODULE_PATH ${ECM_MODULE_PATH})

include(KDEInstallDirs)
include(KDECMakeSettings)
include(KDECompilerSettings NO_POLICY_SCOPE)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

set(QT_NO_CREATE_VERSIONLESS_FUNCTIONS TRUE)
find_package(Qt6 REQUIRED COMPONENTS Core Gui Network Widgets)
find_package(KF6 REQUIRED COMPONENTS CoreAddons)
find_package(KWin REQUIRED)

set(project_SRCS
    main.cpp
)

kcoreaddons_add_plugin({your_project_name}
    SOURCES ${project_SRCS}
    INSTALL_NAMESPACE "kwin/effects/plugins"
)

target_link_libraries({your_project_name}
    Qt::Core
    Qt::Gui
    Qt::Network
    KF6::CoreAddons
    KWin::kwin
)
```

### 3. 示範

```cpp
// workspace_tracker.hpp
#pragma once

#include <effect/effect.h>
#include <effect/effecthandler.h>
#include <QLocalSocket>
#include <QPointer>
#include <QObject>
#include <QPointF>
#include <kwin/virtualdesktops.h>

namespace kde {

struct DesktopTransition {
    int desktop;
    float x;
    float y;
};

class WorkspaceTrackerEffect : public KWin::Effect
{
    Q_OBJECT
public:
    WorkspaceTrackerEffect();
    ~WorkspaceTrackerEffect() override;

private Q_SLOTS:
    void onDesktopChanging(KWin::VirtualDesktop* desktop, QPointF offset);
    void onDesktopChangingCancelled();
    void onDesktopChanged(KWin::VirtualDesktop* oldDesktop, KWin::VirtualDesktop* newDesktop);
    void connectSocket();

private:
    void sendPayload(int desktop, float x, float y);

    QLocalSocket* m_socket;
};

} // namespace caelestia
```

```cpp
// workspace_tracker.cpp
#include "workspace_tracker.hpp"
#include <QTimer>
#include <KPluginFactory>
#include <QStandardPaths>
#include <QDir>
#include <QDebug>
#include <QStandardPaths>
#include <QDir>

namespace kde {

WorkspaceTrackerEffect::WorkspaceTrackerEffect()
    : m_socket(new QLocalSocket(this))
{
    connect(KWin::effects, &KWin::EffectsHandler::desktopChanging,
            this, &WorkspaceTrackerEffect::onDesktopChanging);
    connect(KWin::effects, &KWin::EffectsHandler::desktopChangingCancelled,
            this, &WorkspaceTrackerEffect::onDesktopChangingCancelled);
    connect(KWin::effects, &KWin::EffectsHandler::desktopChanged,
            this, &WorkspaceTrackerEffect::onDesktopChanged);

    connect(m_socket, &QLocalSocket::disconnected, this, [this]() {
        qDebug() << "WorkspaceTracker: Socket disconnected, retrying...";
        QTimer::singleShot(2000, this, &WorkspaceTrackerEffect::connectSocket);
    });

    connect(m_socket, &QLocalSocket::errorOccurred, this, [this](QLocalSocket::LocalSocketError err) {
        qDebug() << "WorkspaceTracker: Socket error:" << err << "- retrying in 2s";
        QTimer::singleShot(2000, this, &WorkspaceTrackerEffect::connectSocket);
    });

    connect(m_socket, &QLocalSocket::connected, this, [this]() {
        qDebug() << "WorkspaceTracker: Socket connected!";
    });

    connectSocket();
}

WorkspaceTrackerEffect::~WorkspaceTrackerEffect()
{
    if (m_socket->isOpen()) {
        m_socket->close();
    }
}

void WorkspaceTrackerEffect::connectSocket()
{
    if (m_socket->state() == QLocalSocket::UnconnectedState) {
        QString socketPath = QStandardPaths::writableLocation(QStandardPaths::RuntimeLocation) + QStringLiteral("/caelestia-workspace-tracker");
        qDebug() << "WorkspaceTracker: Connecting to socket:" << socketPath;
        m_socket->connectToServer(socketPath);
    }
}

void WorkspaceTrackerEffect::sendPayload(int desktop, float x, float y)
{
    if (m_socket->state() == QLocalSocket::ConnectedState) {
        DesktopTransition payload{desktop, x, y};
        m_socket->write(reinterpret_cast<const char*>(&payload), sizeof(payload));
    }
}

void WorkspaceTrackerEffect::onDesktopChanging(KWin::VirtualDesktop* desktop, QPointF offset)
{
    if (desktop && m_socket->state() == QLocalSocket::ConnectedState) {
        qDebug() << "WorkspaceTracker: sending offset" << offset << "for desktop" << desktop->x11DesktopNumber();
        sendPayload(desktop->x11DesktopNumber(), static_cast<float>(offset.x()), static_cast<float>(offset.y()));
    } else {
        qDebug() << "WorkspaceTracker: not connected or desktop is null. Socket state:" << m_socket->state();
    }
}

void WorkspaceTrackerEffect::onDesktopChangingCancelled()
{
    sendPayload(0, 0.0f, 0.0f);
}

void WorkspaceTrackerEffect::onDesktopChanged(KWin::VirtualDesktop* oldDesktop, KWin::VirtualDesktop* newDesktop)
{
    if (newDesktop && m_socket->state() == QLocalSocket::ConnectedState) {
        sendPayload(newDesktop->x11DesktopNumber(), 0.0f, 0.0f);
    }
}

} // namespace kde

KWIN_EFFECT_FACTORY(kde::WorkspaceTrackerEffect, "metadata.json") //要記得有他就好:)

#include "workspace_tracker.moc"
```

特效插件可覆寫 `paintScreen()`、`paintWindow()` 等函式來介入合成器的繪製流程，實作模糊、透明度漸變、位移動畫等效果。

### 4. 編譯與安裝

```bash
mkdir build && cd build
cmake -DCMAKE_INSTALL_PREFIX=/usr .. 
make
sudo make install
```

安裝完成後，於系統設定的「桌面特效」清單中應可看到新插件並啟用。

## 四、除錯建議

- 使用 `journalctl --user -f | grep kwin` (若在程式碼用qDebug()的話)來觀察log 與錯誤訊息。
- 修改 C++ 插件後務必重新編譯並重啟 KWin（或登出重登），避免載入到舊版本的動態函式庫。

## 五、參考資源

- KDE 官方開發者文件（develop.kde.org）中的 KWin 章節
- KWin 原始碼倉庫內的 `src/scripting/` 與 `src/effects/` 目錄，內含大量官方特效與腳本範例可供參考
- KDE Bugzilla 與 invent.kde.org 上的 KWin 專案，可觀察社群提交的合併請求（Merge Request）學習實際開發流程

~~當然你也可以來給我的垃圾專案星星https://github.com/LuYishan-4/Animated_UltralightWeb_Cursor~~
