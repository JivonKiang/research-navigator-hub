# Jivon Research Navigator

新的综合科研导航仓库，整合：

- ORCID 学术画像
- 疾病方向与结核病因果分析
- 医学热点/科研套路
- 交互网络图可行性分析
- 每个 idea 的可人工核实参考文献
- PubMed / DOI / ORCID 跳转链接

## 页面

GitHub Pages: https://jivonkiang.github.io/research-navigator-hub/

## 核心原则

1. 结核因果分析不再作为孤立仓展示，而是作为交互分析网络的一部分。
2. 所有 idea 必须绑定参考文献。
3. 未人工核实的参考文献默认显示 `?`。
4. 人工核实后可在页面点选为 `✓`；被否决可标记为 `×`。
5. 核实状态保存在浏览器本地 `localStorage`，不会自动写回 GitHub。

## 数据文件

- `data/research-data.json`: 领域、方法、idea、参考文献、论文与数据库数据。

## 后续建议

- 增加 GitHub Action，定期从 ORCID、PubMed、源仓库同步数据。
- 对所有 PMID/DOI 做自动校验，避免伪 PMID 或生成型参考文献进入正式证据库。
- 将已人工核实的证据导出为 JSON，再提交回仓库。
