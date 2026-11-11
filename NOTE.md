# HackMD / CodiMD 升級工作計畫

更新日期：2026-11-11
工作分支：`feat/security-upgrade`

## 目標與原則

- **最終目標為正式支援 Node.js 26**（開發、CI、建置與正式執行環境一致）；逐步更新老舊相依套件、修補已知安全漏洞，維持現有 Markdown 編輯、登入、檔案上傳與 Helm/Kubernetes 部署功能。
- 每次只處理一個可驗證的套件群組；先建立基準、修改、測試，再進行下一組。避免直接執行 `npm audit fix --force`。
- 區分 production 與 development 相依套件，依可利用性及影響範圍排序；記錄不能修補的問題與替代方案。
- 不改動既有部署配置（PostgreSQL、PVC uploads）除非升級確實需要，變更前先檢查相容性。

## 目前盤點（2026-11-11）

- `package.json`：75 個 dependencies、106 個 devDependencies；Node engines 為 `>=14.0.0 <17.0.0`。
- 本機 Node.js v26.13.0、npm 11.20.0；與 engines 不符，`npm install` 顯示 EBADENGINE 警告。
- 初次 `npm audit`：214 vulnerabilities（25 critical、99 high、72 moderate、18 low），需安裝後重新取得基準並分 production/dev 核對。
- 初次 `npm outdated --depth=0`：76 個回報項目；當時依賴未完整安裝，`current` 欄位缺失，須重跑以取得可靠對照。
- 已執行 `npm install`；須確認安裝退出狀態、lockfile 差異、完整測試及可重現性。

## 待辦清單（依序推進）

- [ ] **0. 建立基準**：確認 `npm install` 結果、`git diff`、`npm ls`、`npm outdated`、`npm audit --omit=dev` 與完整 audit；記錄 npm scripts、CI、Helm 建置方式；執行現有 lint/test/build 並保存失敗原因。
- [ ] **1. Node.js 26 與建置環境**：以 Node.js 26 為不可變更的升級目標，檢查 webpack 4、Babel、native modules 與 Node 26 的相容性；逐步升級建置鏈，完成測試後將 engines、CI、Docker 基底映像與部署執行環境統一至 Node.js 26。舊版 Node 僅可作為診斷基準，不作為最終方案。
- [ ] **2. 低風險安全修補**：在不跨 major 的前提下更新可修補的直接／間接套件（如 lodash、yaml、jws、html-minifier），逐項測試並重跑 audit。
- [ ] **3. 身分驗證與 Session**：檢查 passport、passport-saml、passport-twitter、xml-crypto/xmldom、express-session、connect-session-sequelize；優先處理簽章驗證與 XML 解析風險，逐種登入方式驗證。
- [ ] **4. HTTP 與安全中介層**：規劃 Express 4→5、Helmet 3→8、body-parser、cookie、csurf 替代方案；驗證 CSRF、Proxy、Cookie、路由與錯誤處理。
- [ ] **5. 即時協作**：Socket.IO 2→4、ws 7→8，檢查前後端協定、連線、同步、重連、權限與相容性。
- [ ] **6. Markdown 呈現**：markdown-it、linkify-it、KaTeX、Mermaid、Vega、markdown-pdf 等；檢查 XSS、HTML sanitization、圖表、公式、匯出與預覽。
- [ ] **7. 資料庫**：Sequelize 5→6、sequelize-cli、pg、mysql2、session store；以 PostgreSQL 為優先，驗證 migrations、Model 與資料存取。
- [ ] **8. 雲端儲存與上傳**：評估舊版 azure-storage、minio、檔案類型辨識、S3 與本機 uploads；維持現有 PVC 路徑與資料相容性。
- [ ] **9. 淘汰套件**：評估 request→fetch/HTTP client、shortid→nanoid/uuid、其他已封存或不再維護套件；逐一替換呼叫端。
- [ ] **10. 整合驗證與收尾**：完整測試、lint、production build、Helm 部署、資料庫連線、登入、編輯、協作、上傳、匯出；重跑 audit 並記錄殘餘風險。

## 每階段完成條件

1. 記錄修改前後版本與原因，以及必要的程式碼調整。
2. 對應測試與 build 成功；無法驗證的部分明確列出。
3. 更新本文件的勾選狀態、剩餘問題及下一步；每個階段單獨提交，經確認再推進。

## 注意事項

- `npm outdated` 的 wanted/latest 不等於已安裝 current；須以重新安裝後結果為準。
- audit 的數量不代表可利用漏洞數；必須確認實際使用路徑與部署環境。
- 不能為了降低 audit 數字而任意降級主要功能套件或採用破壞性 `--force`。
