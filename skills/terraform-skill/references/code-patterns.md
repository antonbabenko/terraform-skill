# Code Patterns & Structure

> **Part of:** [terraform-skill](../SKILL.md)
> **Purpose:** Comprehensive patterns for Terraform/OpenTofu code structure and modern features

This document provides detailed code patterns, structure guidelines, and modern Terraform features. For high-level principles, see the [main skill file](../SKILL.md).

---

## Table of Contents

1. [Block Ordering & Structure](#block-ordering--structure)
2. [Count vs For_Each Deep Dive](#count-vs-for_each-deep-dive)
3. [Modern Terraform Features (1.0+)](#modern-terraform-features-10)
4. [Version Management](#version-management)
5. [Refactoring Patterns](#refactoring-patterns)
6. [Locals for Dependency Management](#locals-for-dependency-management)

---

## Block Ordering & Structure

### Resource Block Structure

**Strict argument ordering:**

1. `count` or `for_each` FIRST (blank line after)
2. Other arguments (alphabetical or logical grouping)
3. `tags` as last real argument
4. `depends_on` after tags (if needed)
5. `lifecycle` at the very end (if needed)

```hcl
# ✅ GOOD - Correct ordering
resource "aws_nat_gateway" "this" {
  count = var.create_nat_gateway ? 1 : 0

  allocation_id = aws_eip.this[0].id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name        = "${var.name}-nat"
    Environment = var.environment
  }

  depends_on = [aws_internet_gateway.this]

  lifecycle {
    create_before_destroy = true
  }
}

# ❌ BAD - Wrong ordering
resource "aws_nat_gateway" "this" {
  allocation_id = aws_eip.this[0].id

  tags = { Name = "nat" }

  count = var.create_nat_gateway ? 1 : 0  # Should be first

  subnet_id = aws_subnet.public[0].id

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [aws_internet_gateway.this]  # Should be after tags
}
```

### Variable Definition Structure

**Variable block ordering:**

1. `description` (ALWAYS required)
2. `type`
3. `default`
4. `sensitive` (when setting to true)
5. `nullable` (when setting to false)
6. `validation`

```hcl
# ✅ GOOD - Correct ordering and structure
variable "environment" {
  description = "Environment name for resource tagging"
  type        = string
  default     = "dev"
  nullable    = false

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}
```

### Variable Type Preferences

- Prefer **simple types** (`string`, `number`, `list()`, `map()`) over `object()` unless strict validation needed
- Use `optional()` for optional object attributes (Terraform 1.3+)
- Use `any` to disable validation at certain depths or support multiple types

**Modern variable patterns (Terraform 1.3+):**

```hcl
# ✅ GOOD - Using optional() for object attributes
variable "database_config" {
  description = "Database configuration with optional parameters"
  type = object({
    name               = string
    engine             = string
    instance_class     = string
    backup_retention   = optional(number, 7)      # Default: 7
    monitoring_enabled = optional(bool, true)     # Default: true
    tags               = optional(map(string), {}) # Default: {}
  })
}

# Usage - only required fields needed
database_config = {
  name           = "mydb"
  engine         = "mysql"
  instance_class = "db.t3.micro"
  # Optional fields use defaults
}
```

**Complex type example:**

```hcl
# For lists/maps of same type
variable "subnet_configs" {
  description = "Map of subnet configurations"
  type        = map(map(string))  # All values are maps of strings
}

# When types vary, use any
variable "mixed_config" {
  description = "Configuration with varying types"
  type        = any
}
```

### Output Structure

**Pattern:** `{name}_{type}_{attribute}`

```hcl
# ✅ GOOD
output "security_group_id" {  # "this_" should be omitted
  description = "The ID of the security group"
  value       = try(aws_security_group.this[0].id, "")
}

output "private_subnet_ids" {  # Plural for list
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

# ❌ BAD
output "this_security_group_id" {  # Don't prefix with "this_"
  value = aws_security_group.this[0].id
}

output "subnet_id" {  # Should be plural "subnet_ids"
  value = aws_subnet.private[*].id  # Returns list
}
```

---

## Count vs For_Each Deep Dive

### When to use count

✓ **Simple numeric replication:**
```hcl
resource "aws_subnet" "public" {
  count = 3

  cidr_block = cidrsubnet(var.vpc_cidr, 8, count.index)
}
```

✓ **Boolean conditions (create or don't):**
```hcl
# ✅ GOOD - Boolean condition
resource "aws_nat_gateway" "this" {
  count = var.create_nat_gateway ? 1 : 0
}

# Less preferred - length check
resource "aws_nat_gateway" "this" {
  count = length(var.public_subnets) > 0 ? 1 : 0
}
```

✓ **When order doesn't matter and items won't change**

### When to use for_each

✓ **Reference resources by key:**
```hcl
resource "aws_subnet" "private" {
  for_each = toset(var.availability_zones)

  vpc_id            = aws_vpc.this.id
  availability_zone = each.key
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, index(var.availability_zones, each.key))
}

# Reference by key: aws_subnet.private["us-east-1a"]
```

✓ **Items may be added/removed from middle:**
```hcl
# ❌ BAD with count - removing middle item recreates all subsequent resources
resource "aws_subnet" "private" {
  count = length(var.availability_zones)

  availability_zone = var.availability_zones[count.index]
  # If var.availability_zones[1] removed, all resources after recreated!
}

# ✅ GOOD with for_each - removal only affects that one resource
resource "aws_subnet" "private" {
  for_each = toset(var.availability_zones)

  availability_zone = each.key
  # Removing one AZ only destroys that subnet
}
```

✓ **Creating multiple named resources:**
```hcl
variable "environments" {
  default = {
    dev = {
      instance_type = "t3.micro"
    }
    prod = {
      instance_type = "t3.large"
    }
  }
}

resource "aws_instance" "app" {
  for_each = var.environments

  instance_type = each.value.instance_type

  tags = {
    Environment = each.key  # "dev" or "prod"
  }
}
```

### Count to For_Each Migration

**When to migrate:** When you need stable resource addressing or items might be added/removed from middle of list.

**Migration steps:**

1. Add `for_each` to resource
2. Use `moved` blocks to preserve existing resources
3. Remove `count` after verifying with `terraform plan`

**Complete example:**

```hcl
# Before (using count)
variable "availability_zones" {
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

resource "aws_subnet" "private" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "private-${var.availability_zones[count.index]}"
  }
}

# Reference: aws_subnet.private[0].id

# After (using for_each)
resource "aws_subnet" "private" {
  for_each = toset(var.availability_zones)

  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, index(var.availability_zones, each.key))
  availability_zone = each.key

  tags = {
    Name = "private-${each.key}"
  }
}

# Reference: aws_subnet.private["us-east-1a"].id

# Migration blocks (prevents resource recreation)
moved {
  from = aws_subnet.private[0]
  to   = aws_subnet.private["us-east-1a"]
}

moved {
  from = aws_subnet.private[1]
  to   = aws_subnet.private["us-east-1b"]
}

moved {
  from = aws_subnet.private[2]
  to   = aws_subnet.private["us-east-1c"]
}

# Verify migration:
# terraform plan should show "moved" operations, not destroy/create
```

After migration: removing `us-east-1b` destroys only that subnet; adding an AZ does not churn existing resources; addresses are stable by AZ name.

### `for_each` keys must be known at plan time

`for_each` (0.12+) requires its key set resolvable during plan.

| Case | Use | Why |
|------|-----|-----|
| stable key set known at plan | `for_each` over static map/var | avoids count index churn on insert/remove |
| key set unknowable at plan | `count = bool ? 1 : 0` for singleton | keys derived from values unknown until apply |

- ❌ `depends_on` does NOT fix `Invalid for_each argument` — it orders applies, not plan-time value resolution
- ❌ deriving `for_each` keys from another resource's computed attrs (IDs, ARNs)
- ✅ drive `for_each` from user-supplied variables or static locals

```hcl
# ❌ BAD - keys derived from computed IDs; plan fails
resource "aws_eip" "web" {
  for_each = toset([for i in aws_instance.web : i.id])
  instance = each.key
}

# ✅ GOOD - drive for_each from user-supplied keys
variable "instances" {
  type = map(object({ instance_type = string }))
}

resource "aws_instance" "web" {
  for_each      = var.instances
  ami           = "ami-0123"
  instance_type = each.value.instance_type
}

resource "aws_eip" "web" {
  for_each = var.instances
  instance = aws_instance.web[each.key].id
}

# ✅ GOOD - singleton when exact ID not known at plan
resource "aws_eip" "bastion" {
  count    = var.create_bastion ? 1 : 0
  instance = aws_instance.bastion[0].id
}
```

---

## Modern Terraform Features (1.0+)

### Feature Guard Table — Version Floor & Common LLM Errors

Before emitting a feature, verify the runtime floor. Each feature here is also a known hallucination surface — the error pattern column names the mistake to avoid.

| Feature | Min version | Common LLM error pattern |
|---------|-------------|--------------------------|
| `for_each` over `count` for stable identities | 0.12+ | defaults to `count` for every collection, causing index churn |
| `try()` function | 0.12.20+ | falls back to `element(concat())` legacy pattern |
| `nonsensitive()` function | 0.15+ | used to 'unwrap' sensitive outputs into plan artifacts, effectively laundering secrets into logs |
| `nullable = false` | 1.1+ | omits it, letting `null` silently override defaults |
| `moved` blocks | 1.1+ | omitted during refactor, causing destroy/create |
| `optional()` with defaults | 1.3+ | emits wrapper variables and loose `map(any)` contracts |
| declarative `import` blocks | 1.5+ | recommends ad-hoc CLI `terraform import` only |
| `check` blocks | 1.5+ | ignores runtime assertions entirely |
| native `terraform test` | 1.6+ | treats mocked-provider tests as full integration coverage |
| mock providers | 1.7+ | asserts computed values in `command = plan` mode |
| `removed` blocks | 1.7+ | deletes resources with no lifecycle transition |
| provider-defined functions | 1.8+ | overuses data sources for simple transformations |
| cross-variable validation | 1.9+ | pushes checks into postconditions only |
| S3 native lock-file | 1.10+ | recommends DynamoDB lock table even on 1.10+ |
| `ephemeral` values | 1.10+ | treats as interchangeable with `sensitive`; ephemeral values are scrubbed from state, `sensitive` only masks display |
| `write_only` arguments | 1.11+ | uses `sensitive = true` and assumes state is safe |

If target runtime is below a feature floor, emit the pre-floor fallback explicitly instead of silently downgrading.

### try() Function (Terraform 0.12.20+)

**Use try() instead of element(concat()):**

```hcl
# ✅ GOOD - Modern try() function
output "security_group_id" {
  description = "The ID of the security group"
  value       = try(aws_security_group.this[0].id, "")
}

output "first_subnet_id" {
  description = "ID of first subnet with multiple fallbacks"
  value       = try(
    aws_subnet.public[0].id,
    aws_subnet.private[0].id,
    ""
  )
}

# ❌ BAD - Legacy pattern
output "security_group_id" {
  value = element(concat(aws_security_group.this[*].id, [""]), 0)
}
```

### nullable = false (Terraform 1.1+)

**Set nullable = false for non-null variables:**

```hcl
# ✅ GOOD (Terraform 1.1+)
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  nullable    = false  # Passing null uses default, not null
  default     = "10.0.0.0/16"
}
```

### optional() with Defaults (Terraform 1.3+)

**Use optional() for object attributes:**

```hcl
# ✅ GOOD - Using optional() for object attributes
variable "database_config" {
  description = "Database configuration with optional parameters"
  type = object({
    name               = string
    engine             = string
    instance_class     = string
    backup_retention   = optional(number, 7)      # Default: 7
    monitoring_enabled = optional(bool, true)     # Default: true
    tags               = optional(map(string), {}) # Default: {}
  })
}

# Usage - only required fields needed
database_config = {
  name           = "mydb"
  engine         = "mysql"
  instance_class = "db.t3.micro"
  # Optional fields use defaults
}
```

### Moved Blocks (Terraform 1.1+)

**Rename resources without destroy/recreate.** Omitting `moved` during a refactor is one of the most common LLM mistakes — the model renames the address and silently turns the rename into destroy/create. Always emit `moved` in the same change as the rename, then verify `terraform plan` shows a move operation, not replacement.

```hcl
# Rename a resource
moved {
  from = aws_instance.web_server
  to   = aws_instance.web
}

# Rename a module
moved {
  from = module.old_module_name
  to   = module.new_module_name
}

# Move resource into for_each
moved {
  from = aws_subnet.private[0]
  to   = aws_subnet.private["us-east-1a"]
}
```

**Limits of `moved` (1.1+):**

| Limit | Can `moved` cross this? | Alternative |
|-------|-------------------------|-------------|
| Provider boundary | No | use `removed` (1.7+) + `import` (1.5+) |
| State file / backend key | No | `state mv` across backends + pre-migration backup |
| Module removal (module deleted from config) | `moved` block inside removed module silently stops working | add `moved` in the **parent**, not the removed module |

### ignore_changes (Lifecycle Escape Hatch)

- ✅ attribute-level `ignore_changes = [tags["X"]]` with a comment naming the external system
- ❌ `ignore_changes = all` — hides real drift, turns every attribute unmanaged
- ❌ use `ignore_changes` to silence noisy plans instead of diagnosing root cause

```hcl
# ❌ BAD - blanket ignore hides all drift
resource "aws_db_instance" "this" {
  lifecycle {
    ignore_changes = all
  }
}

# ✅ GOOD - narrow ignore with justification
resource "aws_db_instance" "this" {
  lifecycle {
    # External compliance scanner rewrites this tag hourly
    ignore_changes = [tags["LastScanned"]]
  }
}
```

### Provider-Defined Functions (Terraform 1.8+)

**Use provider-specific functions for data transformation:**

```hcl
# AWS provider function example
locals {
  # provider::aws::arn_build(partition, service, region, account_id, resource)
  # S3 ARNs are global: region and account_id are empty strings.
  bucket_arn = provider::aws::arn_build("aws", "s3", "", "", "my-bucket")
}

# Check provider documentation for available functions
# Common providers adding functions: AWS, Azure, Google Cloud
```

### Cross-Variable Validation (Terraform 1.9+)

**Reference other variables in validation blocks:**

```hcl
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
}

variable "storage_size" {
  description = "Storage size in GB"
  type        = number

  validation {
    # Can reference var.instance_type in Terraform 1.9+
    condition = !(
      var.instance_type == "db.t3.micro" &&
      var.storage_size > 1000
    )
    error_message = "Micro instances cannot have storage > 1000 GB"
  }
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "backup_retention" {
  description = "Backup retention period in days"
  type        = number

  validation {
    # Production requires longer retention
    condition = (
      var.environment == "prod" ? var.backup_retention >= 7 : true
    )
    error_message = "Production environment requires backup_retention >= 7 days"
  }
}
```

### Validation Mechanism Timing

Four mechanisms look similar and are routinely confused. Only three actually gate apply.

| Mechanism | When it runs | Can reference | Blocks apply? |
|-----------|--------------|---------------|---------------|
| `validation` (in `variable`) | var evaluation, before plan | the variable's own value; other vars on 1.9+ | yes |
| `precondition` (in `lifecycle`) | before resource create/update | other resources, data sources, vars | yes |
| `postcondition` (in `lifecycle`) | after apply | the resource's own computed attrs | yes |
| `check` block (1.5+) | every plan + apply | anything | **NO — advisory only, warnings not errors** |

### Write-Only Arguments (Terraform 1.11+)

**Always use write-only arguments or external secret management.** A common LLM mistake is to mark a variable `sensitive = true` and assume the value is kept out of state — it is not. `sensitive` only masks display; write-only arguments (or external secret lookups at runtime) are what actually keep material out of state. Verify on 1.11+: prefer `*_wo` arguments for credentials; on older runtimes, source secrets from a secret manager and never store them in variables or tfvars.

```hcl
# ✅ GOOD - External secret with write-only argument
data "aws_secretsmanager_secret" "db_password" {
  name = "prod-database-password"
}

data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = data.aws_secretsmanager_secret.db_password.id
}

resource "aws_db_instance" "this" {
  engine         = "mysql"
  instance_class = "db.t3.micro"
  username       = "admin"

  # password_wo keeps the resource argument out of state (1.11+),
  # but the data source still reads secret_string into state on refresh.
  # For true state exclusion: use ephemeral (1.10+), manage_master_user_password,
  # or inject via CI env var outside Terraform.
  password_wo = data.aws_secretsmanager_secret_version.db_password.secret_string
}

# ❌ BAD - Secret ends up in state file
resource "random_password" "db" {
  length = 16
}

resource "aws_db_instance" "this" {
  password = random_password.db.result  # Stored in state!
}

# ❌ BAD - Variable secret stored in state
resource "aws_db_instance" "this" {
  password = var.db_password  # Ends up in state file
}
```

### nonsensitive() and ephemeral (Terraform 0.15+ / 1.10+)

| Goal | Use | Tradeoff |
|------|-----|----------|
| derived non-secret incorrectly inferred as sensitive | `nonsensitive()` (0.15+) | only safe when provably not secret; value enters plan |
| short-lived credential that must never persist | `ephemeral` (1.10+) | never in state or plan; provider/resource must support it |
| value must persist but not display | `sensitive = true` | still in state; masks terminal only |

```hcl
# ✅ GOOD - ephemeral keeps short-lived creds out of state (1.10+)
# requires random provider >= 3.7.0
ephemeral "random_password" "session" {
  length = 32
}

# ❌ BAD - unwrapping a real secret to silence a warning
output "db_endpoint" {
  value = nonsensitive(aws_db_instance.this.password)
}
```

### Dynamic Blocks — Iterator Shadowing + Set Ordering

| Gotcha | Cause | Fix |
|--------|-------|-----|
| outer `each.*` inside nested `dynamic` | block-name iterator shadows `each` | `iterator = rule` rename |
| non-deterministic block order | `for_each = toset([...])` on a map/object | use map keyed by stable field |

- ❌ bare `dynamic "ingress"` inside outer `for_each` — `ingress.value` shadows `each.value`
- ✅ rename inner iterator with `iterator = rule`; reference outer via `each.*`

```hcl
# ✅ GOOD - explicit iterator rename removes ambiguity
resource "aws_security_group" "this" {
  for_each = var.security_groups

  name = each.key

  dynamic "ingress" {
    for_each = each.value.rules
    iterator = rule
    content {
      from_port   = rule.value.from_port
      to_port     = rule.value.to_port
      protocol    = rule.value.protocol
      description = each.value.description  # outer iterator clear
    }
  }
}
```

---

## Version Management

### Version Constraint Syntax

```hcl
# Exact version (avoid unless necessary - inflexible)
version = "5.0.0"

# Pessimistic constraint (recommended for stability)
# The rightmost component is the one that's allowed to increment.
version = "~> 5.0"      # 5.x: >= 5.0, < 6.0 — allows 5.1, 5.2, 5.99
version = "~> 5.0.1"    # 5.0.x patches only: >= 5.0.1, < 5.1.0

# Range constraints
version = ">= 5.0, < 6.0"     # Any 5.x version
version = ">= 5.0.0, < 5.1.0" # Specific minor version range

# Minimum version
version = ">= 5.0"  # Any version 5.0 or higher (risky - breaking changes)

# Latest (avoid in production - unpredictable)
# No version specified = always use latest available
```

### Versioning Strategy by Component

**Terraform itself:**
```hcl
# versions.tf
terraform {
  # Pin to minor version, allow patch updates
  required_version = "~> 1.9"  # Allows 1.9.x
}
```

**Providers:**
```hcl
# versions.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"  # Pin major version, allow minor/patch updates
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}
```

**Modules:**
```hcl
# Production - pin exact version
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.2"  # Exact version for production stability
}

# Development - allow flexibility
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.1"  # Allow patch updates in dev
}
```

### Update Strategy

**Security patches:**
- Update immediately
- Test in dev → stage → prod
- Prioritize provider and Terraform core updates

**Minor versions:**
- Regular maintenance windows (monthly/quarterly)
- Review changelog for breaking changes
- Test thoroughly before production

**Major versions:**
- Planned upgrade cycles
- Dedicated testing period
- May require code changes
- Update in phases: dev → stage → prod

### Version Management Workflow

```hcl
# Step 1: Lock versions in versions.tf
terraform {
  required_version = "~> 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Step 2: Generate lock file (commit this)
terraform init
# Creates .terraform.lock.hcl with exact versions used

# Step 3: Update providers when needed
terraform init -upgrade
# Updates to latest within constraints

# Step 4: Review and test changes before committing
terraform plan
```

### Example versions.tf Template

```hcl
terraform {
  # Terraform version
  required_version = "~> 1.9"

  # Provider versions
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }

  # Backend configuration (optional here, often in backend.tf)
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "infrastructure/terraform.tfstate"
    region = "us-east-1"
  }
}
```

---

## Refactoring Patterns

### Terraform Version Upgrades

#### 0.12/0.13 → 1.x Migration Checklist

**Replace legacy patterns with modern equivalents:**

- [ ] Replace `element(concat(...))` with `try()`
- [ ] Add `nullable = false` to variables that shouldn't accept null
- [ ] Use `optional()` in object types for optional attributes
- [ ] Add `validation` blocks to variables with constraints
- [ ] Migrate secrets to write-only arguments (Terraform 1.11+)
- [ ] Use `moved` blocks for resource refactoring (Terraform 1.1+)
- [ ] Consider cross-variable validation (Terraform 1.9+)

**Example migration:**

```hcl
# Before (0.12 style)
output "security_group_id" {
  value = element(concat(aws_security_group.this[*].id, [""]), 0)
}

variable "config" {
  type = object({
    name = string
    size = number
  })
}

# After (1.x style)
output "security_group_id" {
  description = "The ID of the security group"
  value       = try(aws_security_group.this[0].id, "")
}

variable "config" {
  description = "Configuration settings"
  type = object({
    name = string
    size = optional(number, 100)  # Optional with default
  })
  nullable = false  # Don't accept null
}
```

### Secrets Remediation

Move secret material out of state into external secret management. Canonical depth lives in [security-compliance.md](security-compliance.md) — patterns below are the minimum refactor shape.

❌ BAD — both shapes land the secret in state:

```hcl
# random_password.result lives in state
resource "random_password" "db" {
  length  = 16
  special = true
}
resource "aws_db_instance" "this" {
  password = random_password.db.result
}

# var + sensitive = true still writes to state (sensitive only masks display)
variable "db_password" {
  type      = string
  sensitive = true
}
resource "aws_db_instance" "this" {
  password = var.db_password
}
```

✅ GOOD — 1.11+ write-only argument, secret created outside Terraform:

```hcl
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod-database-password"
}

resource "aws_db_instance" "this" {
  engine   = "mysql"
  username = "admin"
  # password_wo: resource argument stays out of state (1.11+).
  # Data source still reads secret_string into state on refresh.
  # For true state exclusion: ephemeral (1.10+), manage_master_user_password, or CI env var.
  password_wo = data.aws_secretsmanager_secret_version.db_password.secret_string
}
```

Pre-1.11 fallback: use the same data source without `password_wo`; rotation must happen outside Terraform.

**Migration steps:**

1. Create secret in AWS Secrets Manager outside Terraform
2. Replace `random_password` / variable with `data "aws_secretsmanager_secret_version"`
3. On 1.11+: use `password_wo`
4. Apply, then `terraform show | grep -i password` — must be empty

---

## Locals for Dependency Management

**Use locals to hint explicit resource deletion order:**

```hcl
# ✅ GOOD - Forces correct deletion order
# Ensures subnets deleted before secondary CIDR blocks

locals {
  # References secondary CIDR first, falling back to VPC
  # This forces Terraform to delete subnets before CIDR association
  vpc_id = try(
    aws_vpc_ipv4_cidr_block_association.this[0].vpc_id,
    aws_vpc.this.id,
    ""
  )
}

resource "aws_vpc" "this" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_vpc_ipv4_cidr_block_association" "this" {
  count = var.add_secondary_cidr ? 1 : 0

  vpc_id     = aws_vpc.this.id
  cidr_block = "10.1.0.0/16"
}

resource "aws_subnet" "public" {
  # Uses local instead of direct reference
  # Creates implicit dependency on CIDR association
  vpc_id     = local.vpc_id
  cidr_block = "10.1.0.0/24"
}

# Without local: Terraform might try to delete CIDR before subnets → ERROR
# With local: Subnets deleted first, then CIDR association, then VPC ✓
```

**Common use cases:**
- VPC with secondary CIDR blocks
- Resources depending on optional configurations
- Complex deletion-order requirements

---

## LLM Mistake Checklist — Code Patterns

Common model mistakes when generating HCL. Correct these before returning code:

- defaults to `count` for every collection — prefer `for_each` with stable keys whenever identity matters
- omits `moved` blocks during rename/refactor, silently turning the change into destroy/create
- builds `for_each` keys from computed IDs not known until apply — planning will fail
- uses list index as long-lived identity (`count.index`) instead of business-meaningful keys
- marks variables `sensitive = true` and assumes the value stays out of state — on 1.11+ use `write_only` / `*_wo` arguments
- falls back to `element(concat(...))` instead of `try()` on 0.12.20+
- accepts untyped `map(any)` / `any` for long-lived module contracts instead of `optional()` with typed defaults (1.3+)
- suggests `terraform state mv` where `moved` blocks are safer and reviewable
- recommends ad-hoc CLI `terraform import` instead of declarative `import` blocks (1.5+)
- emits an exact `version = "5.0.0"` pin where `~> 5.0` would be more maintainable
- silently emits 1.11+ features (S3 native lock, `write_only`, `removed`) without checking the runtime floor
- uses `nonsensitive()` to "fix" a sensitive value appearing in plan output — this leaks secrets into CI artifacts
- conflates `sensitive = true` with `ephemeral` (1.10+); only `ephemeral` actually stays out of state
- writes a `moved` block expecting it to cross provider boundaries; it cannot
- leaves `moved` blocks inside a module that itself is being removed — the moves silently no-op, resources get destroyed
- emits CLI `terraform import` in automation when declarative `import` blocks (1.5+) give a reviewable, VCS-tracked alternative
- emits `ignore_changes = all` or broad ignore lists to silence plan output instead of diagnosing drift root cause
- uses `check` block expecting it to block apply; `check` is advisory, emits warnings only. Use `precondition`/`postcondition` to gate.
- uses `each.value` inside a `dynamic` block intending the outer iterator — shadowed by the inner block name; rename with `iterator = ...`
- emits hardcoded cloud IDs/ARNs (`vpc-0abc...`, pattern-matched `arn:aws:iam::` patterns) from training data instead of using data sources or input variables
- pairs `password_wo` with `aws_secretsmanager_secret_version` — the data source still reads `secret_string` into state on refresh. Use `ephemeral` (1.10+) or CI-injected env var.
- iterates `dynamic` blocks over `toset(...)` of maps/objects — the set's undefined ordering causes non-deterministic block ordering in the plan diff; sort the list or use a map keyed by a stable field

---

**Back to:** [Main Skill File](../SKILL.md)
