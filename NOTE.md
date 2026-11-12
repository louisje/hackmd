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

## 第 0 階段執行紀錄（2026-11-11）

- 已執行 npm install；npm ls --depth=0 未回報 missing/invalid，但不能據此認定安裝完整。
- npm run jsonlint 通過。
- 初次 lint/build 因 node_modules/.bin 不存在而無法啟動。
- npm rebuild --bin-links 建立了 .bin，但執行安裝腳本時發生 MODULE_NOT_FOUND（@hackmd/pandoc.js → pump）。
- 再次執行 lint/build 仍發生 MODULE_NOT_FOUND（inflight/glob 與 cross-env/which 依賴鏈）。
- 後續於 Primary Session 執行 `npm ci --ignore-scripts --no-audit --no-fund --loglevel=error` 成功：added 2257 packages in 1m。
- Node.js v26.13.0：`npm run lint` 通過、`npm run jsonlint` 通過、`npm run coverage:ci` 通過（129 passing，Exit 0）。
- `npm run build` 失敗（Exit 1）：Webpack 4 的 `createHash` 在 Node.js 26／OpenSSL 報 `ERR_OSSL_EVP_UNSUPPORTED`。
- 下一步：優先盤點 webpack 設定、loader/plugin，將建置鏈升級至可正式支援 Node.js 26 的版本；不以 `--openssl-legacy-provider` 作為正式解法。
- 測試時出現 domain 與 sessionSecret 未設定警告，屬測試環境設定，後續部署驗證時需確認。

## Webpack 5 遷移盤點（2026-11-11）

- 現有版本：webpack 4.39、webpack-cli 3、webpack-merge 4；production build 因 MD4/OpenSSL `ERR_OSSL_EVP_UNSUPPORTED` 失敗。
- `webpack.prod.js` 使用舊 CLI 旗標 `--display errors-only -p`、`optimize-css-assets-webpack-plugin`；須改用 Webpack 5 CLI 與 CSS minimizer。
- `webpack.dev.js` 使用已過時的 `cheap-module-eval-source-map`，須改成新版支援的 devtool。
- `webpack.common.js` 使用 `copy-webpack-plugin` 陣列式建構子、舊版 `html-webpack-plugin`、`mini-css-extract-plugin`；須更新設定 API。
- `webpack.common.js` 含大量內嵌 `script-loader!`、`imports-loader?`、`expose-loader?` 語法；升級後逐項檢查模組載入與全域變數暴露。
- CSS/Sass/Less、字型與圖片使用舊版 css-loader、less-loader、file-loader、url-loader；優先維持輸出相容，再考慮遷移至 Webpack 5 asset modules。
- `webpack.common.js` 的 `node: { fs: "empty", os: "empty" }` 是 Webpack 4 設定，Webpack 5 須改成 `resolve.fallback` 或明確排除。
- 有兩組 webpack config（主程式及 `webpack.htmlexport.js`），須同時驗證 HTML 匯出。
- 遷移步驟：先調整 webpack/cli/merge 與必要 plugin/loader → 修正 config schema → 執行 build → 修正模組相容性 → 執行 lint、129 項測試、HTML 匯出及前端人工驗證。

## 每階段完成條件

1. 記錄修改前後版本與原因，以及必要的程式碼調整。
2. 對應測試與 build 成功；無法驗證的部分明確列出。
3. 更新本文件的勾選狀態、剩餘問題及下一步；每個階段單獨提交，經確認再推進。

## 注意事項

- `npm outdated` 的 wanted/latest 不等於已安裝 current；須以重新安裝後結果為準。
- audit 的數量不代表可利用漏洞數；必須確認實際使用路徑與部署環境。
- 不能為了降低 audit 數字而任意降級主要功能套件或採用破壞性 `--force`。

## Webpack 5 建置驗證（2026-11-11）

- 已升級 Webpack 5、webpack-cli 6、webpack-merge 6，以及相容的 HTML/CSS/loader/plugin；更新 production/dev 設定與舊式 inline loader 語法。
- 修復 resolve.alias 被覆蓋問題，並補上 path-browserify、util 的 resolve.fallback。
- Node.js 26.13.0 執行 `env -u DEBUG npm run build`：Exit 0（production build 成功）。
- `env -u DEBUG npm run lint`：Exit 0。
- `env -u DEBUG npm run coverage:ci`：Exit 0，129 passing。
- 尚未驗證獨立 `webpack.htmlexport.js`、瀏覽器實際執行、CI／Docker／Helm 的 Node.js 26 一致性；第 1 階段尚未完全完成。
- npm install 使用 `--legacy-peer-deps`，後續須消除舊版相依套件的 peer dependency 衝突，並檢查安裝腳本核准狀態。
