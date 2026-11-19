# Known-broken snippets

The snippet linter must flag every block here. CI fails if it does not.

```rego
package main

deny[msg] {
  msg := "Rego v0 rule head"
}
```

```yaml
on: push
concurrency:
  group: tf-${{ matrix.environment }}
jobs:
  tf:
    runs-on: ubuntu-latest
    steps:
      - run: terraform plan
```

```hcl
environments/prod/
  main.tf
```

```json
// comment
{"a": 1}
```

```bash
mcp__terraform__search_provider_docs({ provider_name: "aws" })
```
