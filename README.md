# BiliSub

一键下载 Bilibili 视频 AI 字幕（JSON + TXT），支持合集批量下载。

## 安装

1. 下载本仓库 ZIP 或 `git clone`
2. 打开 Chrome → `chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」→ 选择本目录
5. 打开任意 Bilibili 视频页即可使用

## 使用

### 单个视频
打开视频页 → 播放器右下角出现 **⬇ AI字幕** 按钮 → 点击自动下载 JSON + TXT

### 合集批量下载
打开合集页 → 标题旁出现 **⬇ 批量下载字幕** 按钮 → 点击逐个下载全部视频字幕

## 原理

相同于 [BiliSub Python 版](https://github.com/skelitalynn/BiliSub) 的核心逻辑：

```
BV → view API (aid+cid)
     → WBI 签名 → player/wbi/v2 (subtitle_url + auth_key)
     → 下载字幕 JSON
     → 输出 JSON + TXT
```

关键：使用 `player/wbi/v2` + WBI 签名获取带 `auth_key` 的完整字幕 URL，
而非 `player/v2`（返回的字幕 URL 缺少 `auth_key` 会导致 CDN 返回错误内容）。

## 文件结构

```
BiliSub/
├── manifest.json      # Chrome Extension Manifest V3
├── content.js          # 核心：注入按钮 + WBI 签名 + 字幕提取
├── content.css         # 动画样式
├── background.js       # Service Worker（下载触发）
├── popup.html          # 弹窗 UI
├── popup.js            # 弹窗逻辑
├── icons/              # 图标 (16/48/128)
└── README.md
```

## License

MIT
