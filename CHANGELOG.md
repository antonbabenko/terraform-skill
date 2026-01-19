# [1.5.0](https://github.com/antonbabenko/terraform-skill/compare/v1.0.0...v1.5.0) (2026-01-19)


### Bug Fixes

* Allow optional frontmatter fields in SKILL.md validation ([e4393cb](https://github.com/antonbabenko/terraform-skill/commit/e4393cbf953a821e459cca8acf54601509505c23)), closes [#21146856119](https://github.com/antonbabenko/terraform-skill/issues/21146856119)
* **changelog:** prevent regeneration from losing intermediate releases ([b81b57d](https://github.com/antonbabenko/terraform-skill/commit/b81b57d29b2f22aac457932360d335f5ba773758))
* revert conventional-changelog-action to v5 due to tag detection bug ([9ba8215](https://github.com/antonbabenko/terraform-skill/commit/9ba821546f45ec7f7067686c870e0c284a53ea86))


### Features

* Added plugin install command to docs ([c400b18](https://github.com/antonbabenko/terraform-skill/commit/c400b184a6ef695a1dc7ebb38eff8adac2ea5874))
* Enhance skill with comprehensive best practices from original guide ([f32fc3b](https://github.com/antonbabenko/terraform-skill/commit/f32fc3b1c9856fcb6fd30c5f6fc50885c8ba5117))



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



