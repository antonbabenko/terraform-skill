# [1.16.0](https://github.com/antonbabenko/terraform-skill/compare/v1.15.0...v1.16.0) (2026-05-24)


### Features

* treat AWS/Azure/GCP equally with cross-cloud equivalence map and progressive cloud routing ([#33](https://github.com/antonbabenko/terraform-skill/issues/33)) ([75619bc](https://github.com/antonbabenko/terraform-skill/commit/75619bccc1f9876a4032115c8c7672370431fb7b))



# [1.15.0](https://github.com/antonbabenko/terraform-skill/compare/v1.14.0...v1.15.0) (2026-05-23)


### Features

* Provisioners as Last Resort (closes row 16) ([#31](https://github.com/antonbabenko/terraform-skill/issues/31)) ([cc78c5a](https://github.com/antonbabenko/terraform-skill/commit/cc78c5a4347dec85ac405082b38e139fccb67b0e))



# [1.14.0](https://github.com/antonbabenko/terraform-skill/compare/v1.0.0...v1.14.0) (2026-05-18)


### Bug Fixes

* Allow optional frontmatter fields in SKILL.md validation ([e4393cb](https://github.com/antonbabenko/terraform-skill/commit/e4393cbf953a821e459cca8acf54601509505c23)), closes [#21146856119](https://github.com/antonbabenko/terraform-skill/issues/21146856119)
* **changelog:** prevent regeneration from losing intermediate releases ([b81b57d](https://github.com/antonbabenko/terraform-skill/commit/b81b57d29b2f22aac457932360d335f5ba773758))
* **ci:** sync versions in release pre-commit hook so tags are not stale ([#29](https://github.com/antonbabenko/terraform-skill/issues/29)) ([6ca340d](https://github.com/antonbabenko/terraform-skill/commit/6ca340d45f854cdb599896cf1a5435e6f6ec2851))
* restore release version source (dedicated version.json) ([77db3a3](https://github.com/antonbabenko/terraform-skill/commit/77db3a380005ce7dedbc50ffb37a2f341d86cab2))
* revert conventional-changelog-action to v5 due to tag detection bug ([9ba8215](https://github.com/antonbabenko/terraform-skill/commit/9ba821546f45ec7f7067686c870e0c284a53ea86))


### Features

* add terraform-ls code intelligence guidance ([7ad926c](https://github.com/antonbabenko/terraform-skill/commit/7ad926c8733be341e3b56dd499877e79a2975dd4))
* Added plugin install command to docs ([c400b18](https://github.com/antonbabenko/terraform-skill/commit/c400b184a6ef695a1dc7ebb38eff8adac2ea5874))
* **code-intelligence:** cross-reference code-intelligence plugin + host setup ([#27](https://github.com/antonbabenko/terraform-skill/issues/27)) ([908d562](https://github.com/antonbabenko/terraform-skill/commit/908d562625d64093a44d4573c46b8814dcd6204a))
* **codex:** add plugin manifest ([#23](https://github.com/antonbabenko/terraform-skill/issues/23)) ([cfbafe4](https://github.com/antonbabenko/terraform-skill/commit/cfbafe41dd11226a2d45c19f84b26c7557ac7d3d))
* Enhance skill with comprehensive best practices from original guide ([f32fc3b](https://github.com/antonbabenko/terraform-skill/commit/f32fc3b1c9856fcb6fd30c5f6fc50885c8ba5117))
* umbrella update (plugin autodiscovery, full skill rewrite, LLM hallucination guards, fact-checks) ([#14](https://github.com/antonbabenko/terraform-skill/issues/14)) ([deba6e8](https://github.com/antonbabenko/terraform-skill/commit/deba6e80c0efa6c0a4e0989941f9cf76b138c435))



# [1.0.0](https://github.com/antonbabenko/terraform-skill/compare/4f1a017efb63283fc4499dc5328505d4a7829671...v1.0.0) (2026-01-18)


### Bug Fixes

* **claude-plugin:** Update marketplace.json version and source structure ([2bca71c](https://github.com/antonbabenko/terraform-skill/commit/2bca71c90817c9b29da161fd4339d2acf4abdaeb))
* Fixed marketplace.json ([2b12e4e](https://github.com/antonbabenko/terraform-skill/commit/2b12e4eae82cab2063734d8f5d49dc8c10436a3c))


* feat!: migrate to marketplace-only architecture ([f32de12](https://github.com/antonbabenko/terraform-skill/commit/f32de1253af5e62c159c85c5016afa4557978d67))


### Features

* initial release of terraform-skill v1.0.0 ([4f1a017](https://github.com/antonbabenko/terraform-skill/commit/4f1a017efb63283fc4499dc5328505d4a7829671))


### BREAKING CHANGES

* Removed plugin.json in favor of marketplace.json.

Changes:
- Migrate source type from 'local' to 'github'
- Add version synchronization (marketplace, plugin, git ref)
- Update workflows for marketplace.json validation and releases
- Update documentation references

Users must reinstall:
  /plugin marketplace remove terraform-skill
  /plugin marketplace add antonbabenko/terraform-skill



