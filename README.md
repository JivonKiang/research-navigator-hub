# Jivon Research Navigator

新的综合科研导航仓库，整合 ORCID 学术画像、疾病方向、科研套路、主线路线图和自动核验参考文献。

## 页面

GitHub Pages: https://jivonkiang.github.io/research-navigator-hub/

## 当前设计

- 左侧半透明轴线导航：总览、主线、路线图、Idea、套路文献、核实、数据。
- 主线界面：只显示下一步判断，不把参考文献细节直接铺满首页。
- 路线图：用分层卡片替代拥挤的力导向网络图，兼顾桌面和手机端阅读。
- Idea 详情：研究设计、数据源、产出物和文献证据默认折叠，需要时展开。
- 文献核实：用 PubMed 与 Crossref 自动执行 title、PMID、DOI 三重核验。
- 核验状态：`✓` 表示 title/PMID/DOI 三重通过，`△` 表示 title+DOI 通过但缺 PMID，`i` 表示非论文元数据。
- 结核多组学 + MR：已从新主线推荐改为“已完成 · 投稿复盘”。

## 数据文件

- `data/research-data.json`: 领域、方法、idea、参考文献、论文与数据库数据。
- `data/verification.json`: 自动文献真实性核验结果。

## 维护原则

- 正式证据区不展示 `GEN...` 伪 PMID。
- 无 PMID 的文献保留 DOI 或 PubMed 标题检索入口。
- 自动核验优先使用 PubMed PMID 取回论文记录，再用 Crossref DOI 取回出版信息，最后比较标题相似度。
- 核验结果直接随仓库数据更新，页面端只负责展示。
