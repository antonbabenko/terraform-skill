# Quick Reference

> **Part of:** [terraform-skill](../SKILL.md)
> **Purpose:** Command cheat sheets and decision flowcharts

This document provides quick lookup tables, command references, and decision flowcharts for rapid consultation during development.

---

## Table of Contents

1. [Command Cheat Sheet](#command-cheat-sheet)
2. [Decision Flowchart](#decision-flowchart)
3. [Version-Specific Guidance](#version-specific-guidance)
4. [Troubleshooting Guide](#troubleshooting-guide)
5. [Migration Paths](#migration-paths)

---

## Command Cheat Sheet

### Static Analysis

Works with both `terraform` and `tofu` commands:

```bash
# Format and validate
terraform fmt -recursive -check    # or: tofu fmt -recursive -check
terraform validate                 # or: tofu validate

# Linting
tflint --init && tflint

# Security scanning
checkov -d .
```

### Native Tests (1.6+)

```bash
# Run all tests
terraform test                     # or: tofu test

# Run tests in specific directory
terraform test -test-directory=tests/unit/

# Verbose output
terraform test -verbose
```

### Plan Validation

```bash
# Generate and review plan
terraform plan -out tfplan         # or: tofu plan -out tfplan

# Convert plan to pretty JSON
terraform show -json tfplan | jq -r '.' > tfplan.json

# Check for specific changes
terraform show tfplan | grep "will be created"
```

---

## Decision Flowchart

### Testing Approach Selection

```
Need to test Terraform/OpenTofu code?
│
├─ Just syntax/format?
│  └─ terraform/tofu validate + fmt
│
├─ Static security scan?
│  └─ trivy + checkov
│
├─ Terraform/OpenTofu 1.6+?
│  ├─ Simple logic test?
│  │  └─ Native terraform/tofu test
│  │
│  └─ Complex integration?
│     └─ Terratest
│
└─ Pre-1.6?
   ├─ Go team?
   │  └─ Terratest
   │
   └─ Neither?
      └─ Plan to upgrade Terraform/OpenTofu
```

### Module Development Workflow

```
1. Plan
   ├─ Define inputs (variables.tf)
   ├─ Define outputs (outputs.tf)
   └─ Document purpose (README.md)

2. Implement
   ├─ Create resources (main.tf)
   ├─ Pin versions (versions.tf)
   └─ Add examples (examples/simple, examples/complete)

3. Test
   ├─ Static analysis (validate, fmt, lint)
   ├─ Unit tests (native or Terratest)
   └─ Integration tests (examples/)

4. Document
   ├─ Update README with usage
   ├─ Document inputs/outputs
   └─ Add CHANGELOG

5. Publish
   ├─ Tag version (git tag v1.0.0)
   ├─ Push to registry
   └─ Announce changes
```

---

## Version-Specific Guidance

### Terraform 1.0-1.5

- ❌ No native testing framework
- ✅ Use Terratest
- ✅ Focus on static analysis
- ✅ terraform plan validation

### Terraform 1.6+ / OpenTofu 1.6+

- ✅ NEW: Native `terraform test` / `tofu test`
- ✅ Consider migrating simple tests from Terratest
- ✅ Keep Terratest for complex integration
- ✅ All Terraform 1.0+ features available

### Terraform 1.7+ / OpenTofu 1.7+

- ✅ NEW: Mock providers for unit testing
- ✅ Reduce costs with mocking
- ✅ Use real integration tests for final validation
- ✅ Faster test iteration

### Terraform vs OpenTofu Comparison

Both Terraform and OpenTofu are fully supported by this skill. The choice depends on your requirements:

**Quick Decision Matrix:**

| Factor | Terraform | OpenTofu |
|--------|-----------|----------|
| **Licensing** | Business Source License (BSL) 1.1 | Mozilla Public License 2.0 (MPL 2.0) |
| **Governance** | HashiCorp (single vendor) | Linux Foundation (community-driven) |
| **Latest Version** | 1.14+ | 1.11+ |
| **Native Testing** | 1.6+ | 1.6+ |
| **Mock Providers** | 1.7+ | 1.7+ |
| **Feature Parity** | Reference implementation | Compatible fork with some additions |
| **Enterprise Support** | HCP Terraform, Terraform Cloud | Multiple vendors |
| **Migration Path** | N/A | Drop-in replacement for Terraform ≤1.5 |

**When to choose Terraform:**
- Using HashiCorp Terraform Cloud or HCP Terraform
- Enterprise support contract with HashiCorp
- Need absolute latest features first

**When to choose OpenTofu:**
- Prefer open-source governance model
- Want to avoid vendor lock-in concerns
- Building on community-driven development
- BSL 1.1 license doesn't fit your use case

**For this skill:**
- Commands are shown for both: `terraform` and `tofu`
- Most patterns work identically, though differences exist (see release notes)
- Version-specific features noted (1.6+, 1.7+, etc.)
- **Note:** Since OpenTofu 1.6, the platforms have diverged with unique features

**When creating modules, Claude will ask your preference** to generate appropriate commands and documentation.

---

## Troubleshooting Guide

### Issue: Tests fail in CI but pass locally

**Symptoms:**
- Tests pass on your machine
- Same tests fail in GitHub Actions/GitLab CI

**Common Causes:**
1. Different Terraform/provider versions
2. Different environment variables
3. Different AWS credentials/permissions

**Solution:**

```hcl
# versions.tf - Pin versions explicitly
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"  # Pin to major version
    }
  }
}
```

### Issue: Parallel tests conflict

**Symptoms:**
- Tests fail when run in parallel
- Error: "ResourceAlreadyExistsException"

**Cause:** Resource naming collisions

**Solution:**

```go
// Use unique identifiers
import "github.com/gruntwork-io/terratest/modules/random"

uniqueId := random.UniqueId()
bucketName := fmt.Sprintf("test-bucket-%s", uniqueId)
```

### Issue: High test costs

**Symptoms:**
- AWS bill increasing from tests
- Many orphaned resources in test account

**Solutions:**

1. **Use mocking for unit tests** (Terraform 1.7+)
   ```hcl
   mock_provider "aws" { ... }
   ```

2. **Implement resource TTL tags**
   ```go
   Vars: map[string]interface{}{
       "tags": map[string]string{
           "Environment": "test",
           "TTL":         "2h",
       },
   }
   ```

3. **Run integration tests only on main branch**
   ```yaml
   if: github.ref == 'refs/heads/main'
   ```

4. **Use smaller instance types**
   ```hcl
   instance_type = "t3.micro"  # Not "m5.large"
   ```

5. **Share test resources when safe**
   - VPCs, security groups (rarely change)
   - Don't share: instances, databases (change often)

---

## Migration Paths

### From Manual Testing → Automated

**Phase 1:** Static analysis
```bash
terraform validate
terraform fmt -check
```

**Phase 2:** Plan review
```bash
terraform plan -out=tfplan
# Manual review
```

**Phase 3:** Automated tests
- Native tests (1.6+)
- OR Terratest

**Phase 4:** CI/CD integration
- GitHub Actions / GitLab CI
- Automated apply on main branch

### From Terratest → Native Tests (1.6+)

**Strategy:** Gradual migration

1. **Keep Terratest for:**
   - Complex integration tests
   - Multi-step workflows
   - Cross-provider tests

2. **Migrate to native tests:**
   - Simple unit tests
   - Logic validation
   - Mock-friendly tests

3. **During transition:**
   - Maintain both frameworks
   - Gradually increase native test coverage
   - Remove Terratest tests once replaced

**Example:** Mixed approach

```
tests/
├── unit/                    # Native tests
│   └── validation.tftest.hcl
└── integration/             # Terratest
    └── complete_test.go
```

### From Terraform → OpenTofu

**Good news:** OpenTofu is a drop-in replacement!

1. **No code changes needed**
   - All Terraform syntax works
   - Same provider ecosystem
   - Compatible state files

2. **Update CI/CD:**
   ```bash
   # Replace
   terraform init
   terraform plan
   terraform apply

   # With
   tofu init
   tofu plan
   tofu apply
   ```

3. **Update documentation:**
   - README mentions OpenTofu compatibility
   - CI/CD workflows use `tofu` command

---

## Common Patterns

### Resource Naming

```hcl
# ✅ Good: Descriptive, contextual
resource "aws_instance" "web_server" { }
resource "aws_s3_bucket" "application_logs" { }

# ❌ Bad: Generic
resource "aws_instance" "main" { }
resource "aws_s3_bucket" "bucket" { }
```

### Variable Naming

```hcl
# ✅ Good: Context-specific
var.vpc_cidr_block
var.database_instance_class

# ❌ Bad: Generic
var.cidr
var.instance_class
```

### File Organization

```
Standard module structure:
├── main.tf          # Primary resources
├── variables.tf     # Input variables
├── outputs.tf       # Output values
├── versions.tf      # Provider versions
└── README.md        # Documentation
```

---

**Back to:** [Main Skill File](../SKILL.md)
