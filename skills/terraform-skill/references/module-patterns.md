# Module Development Patterns

> **Part of:** [terraform-skill](../SKILL.md)
> **Purpose:** Best practices for Terraform/OpenTofu module development

This document provides detailed guidance on creating reusable, maintainable Terraform modules. For high-level principles, see the [main skill file](../SKILL.md#core-principles).

---

## Table of Contents

1. [Module Hierarchy](#module-hierarchy)
2. [Architecture Principles](#architecture-principles)
3. [Module Structure](#module-structure)
4. [Variable Best Practices](#variable-best-practices)
5. [Output Best Practices](#output-best-practices)
6. [Common Patterns](#common-patterns)
7. [Anti-patterns to Avoid](#anti-patterns-to-avoid)
8. [Testing Philosophy & Patterns](#testing-philosophy--patterns)

---

## Module Hierarchy

### Module Type Classification

Terraform modules can be organized into three distinct types, each serving a specific purpose:

| Type | When to Use | Scope | Example |
|------|-------------|-------|---------|
| **Resource Module** | Single logical group of connected resources | Tightly coupled resources that always work together | VPC + subnets, Security group + rules, IAM role + policies |
| **Infrastructure Module** | Collection of resource modules for a purpose | Multiple resource modules in one region/account | Complete networking stack, Application infrastructure |
| **Composition** | Complete infrastructure | Spans multiple regions/accounts, orchestrates infrastructure modules | Multi-region deployment, Production environment |

**Hierarchy:** Resource → Resource Module → Infrastructure Module → Composition

### Resource Module

**Characteristics:**
- Smallest building block
- Single logical group of resources
- Highly reusable across projects
- Minimal external dependencies
- Clear, focused purpose

**Examples:**
```
modules/
├── vpc/                    # Resource module
│   ├── main.tf            # VPC + subnets + route tables
│   ├── variables.tf
│   └── outputs.tf
├── security-group/         # Resource module
│   ├── main.tf            # Security group + rules
│   ├── variables.tf
│   └── outputs.tf
└── rds/                    # Resource module
    ├── main.tf            # RDS instance + subnet group
    ├── variables.tf
    └── outputs.tf
```

### Infrastructure Module

**Characteristics:**
- Combines multiple resource modules
- Purpose-specific (e.g., "web application infrastructure")
- May span multiple services
- Region or account-specific
- Moderate reusability

**Examples:**
```
modules/
└── web-application/        # Infrastructure module
    ├── main.tf            # Orchestrates multiple resource modules
    ├── variables.tf
    ├── outputs.tf
    └── README.md

# main.tf contents:
module "vpc" {
  source = "../vpc"
}

module "alb" {
  source = "../alb"
  vpc_id = module.vpc.vpc_id
}

module "ecs" {
  source = "../ecs"
  vpc_id = module.vpc.vpc_id
  subnets = module.vpc.private_subnet_ids
}
```

### Composition

**Characteristics:**
- Highest level of abstraction
- Complete environment or application
- Combines infrastructure modules
- Environment-specific (dev, staging, prod)
- Not reusable (environment-specific values)

**Examples:**
```
environments/
├── prod/                   # Composition
│   ├── main.tf            # Complete production environment
│   ├── backend.tf         # Remote state configuration
│   ├── terraform.tfvars   # Production-specific values
│   └── variables.tf
├── staging/                # Composition
│   ├── main.tf
│   ├── backend.tf
│   ├── terraform.tfvars
│   └── variables.tf
└── dev/                    # Composition
    ├── main.tf
    ├── backend.tf
    ├── terraform.tfvars
    └── variables.tf
```

### Decision Tree: Which Module Type?

```
Question 1: Is this environment-specific configuration?
├─ YES → Composition (environments/prod/, environments/staging/)
└─ NO  → Continue

Question 2: Does it combine multiple infrastructure concerns?
├─ YES → Infrastructure Module (modules/web-application/)
└─ NO  → Continue

Question 3: Is it a focused group of related resources?
└─ YES → Resource Module (modules/vpc/, modules/rds/)
```

### File Organization Standards

**Required files in all modules:**
```
main.tf        # Resource definitions, module calls, data sources
variables.tf   # Input variable declarations
outputs.tf     # Output value declarations
versions.tf    # Provider and Terraform version constraints
README.md      # Usage documentation
```

**Conditional files:**
```
terraform.tfvars  # ONLY at composition level (NEVER in modules)
locals.tf         # For complex local value calculations
data.tf           # Optional: Data sources (if main.tf gets large)
backend.tf        # ONLY at composition level (remote state config)
```

**Why separate files?**
- **Consistency:** Same structure across all modules
- **Discoverability:** Know where to find specific types of configuration
- **Maintainability:** Easier to navigate and modify
- **Terraform Registry:** Required structure for publishing

---

## Architecture Principles

### 1. Smaller Scopes = Better Performance + Reduced Blast Radius

**Benefits:**
- Faster `terraform plan` and `terraform apply` operations
- Isolated failures don't affect unrelated infrastructure
- Easier to reason about changes
- Parallel development by multiple teams

**Example:**

```hcl
# ❌ BAD - One massive composition with everything
environments/prod/
  main.tf  # 2000 lines, manages VPC, EC2, RDS, S3, IAM, everything
  # Takes 10+ minutes to plan
  # One mistake affects entire infrastructure

# ✅ GOOD - Separated by concern
environments/prod/
  networking/     # VPC, subnets, route tables
  compute/        # EC2, ASG, ALB
  data/           # RDS, ElastiCache
  storage/        # S3, EFS
  iam/            # IAM roles, policies
```

### 2. Always Use Remote State

**Why:**
- **Prevents race conditions** with multiple developers
- **Provides disaster recovery** (state versioning)
- **Enables team collaboration** (shared access)
- **Supports state locking** (prevents concurrent modifications)

**Never:**
```hcl
# ❌ BAD - Local state (default)
# State stored in local terraform.tfstate file
# Lost if computer crashes
# Can't share with team
```

**Always:**
```hcl
# ✅ GOOD - Remote state
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/networking/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"  # State locking
    encrypt        = true                # Encryption at rest
  }
}
```

### 3. Use terraform_remote_state Sparingly — Only at True Ownership Boundaries

**Pattern:** Connect separately-owned compositions via remote state data sources. Reserve it for genuine team/lifecycle boundaries, not as convenient glue inside a single-team stack.

**Use it when ALL of these are true:**
- Consumer and producer are owned by **different teams** or have **different release cadences**
- The producer's state is already split for lifecycle reasons (networking vs. compute vs. data)
- You cannot reasonably pass the same values as module inputs

**Do NOT use it when:**
- You control both stacks and can wire via module outputs
- You're reading values that would be better served by a cloud data source (e.g., `aws_vpc` by tag)
- You're reaching across >2 remote states in one composition — that is a signal to reshape boundaries, not add more wiring

**Common LLM mistakes:**
- reaches for `terraform_remote_state` as default integration pattern
- chains many `terraform_remote_state` reads, creating hidden cross-stack coupling
- reads values that can drift at the provider level (use cloud data sources instead)

**Why it works at real boundaries:**
- Loose coupling between independently-owned stacks
- Teams can release independently
- Outputs from one stack become typed inputs to another

**Example:**

```hcl
# environments/prod/networking/outputs.tf
output "vpc_id" {
  description = "ID of the production VPC"
  value       = aws_vpc.this.id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

# environments/prod/compute/main.tf
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "prod/networking/terraform.tfstate"
    region = "us-east-1"
  }
}

module "ec2" {
  source = "../../modules/ec2"

  vpc_id     = data.terraform_remote_state.networking.outputs.vpc_id
  subnet_ids = data.terraform_remote_state.networking.outputs.private_subnet_ids
}
```

**Best practices:**
- Use remote state for cross-team dependencies
- Document which outputs are consumed by other stacks
- Version outputs (don't break downstream consumers)
- Consider using data sources instead for provider-managed resources

### 4. Keep Resource Modules Simple

**Principles:**
- Don't hardcode values
- Use variables for all configurable parameters
- Use data sources for external dependencies
- Focus on single responsibility

**Example:**

```hcl
# ❌ BAD - Hardcoded values in resource module
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"  # Hardcoded
  instance_type = "t3.large"               # Hardcoded
  subnet_id     = "subnet-12345678"        # Hardcoded

  tags = {
    Environment = "production"             # Hardcoded
  }
}

# ✅ GOOD - Parameterized resource module
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "web" {
  ami           = var.ami_id != "" ? var.ami_id : data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  subnet_id     = var.subnet_id

  tags = var.tags
}
```

### 5. Composition Layer: Environment-Specific Values Only

**Pattern:** Compositions provide concrete values, modules provide abstractions

```hcl
# ✅ GOOD - Composition with environment-specific values
# environments/prod/main.tf

module "vpc" {
  source = "../../modules/vpc"

  cidr_block           = "10.0.0.0/16"
  availability_zones   = ["us-east-1a", "us-east-1b", "us-east-1c"]
  enable_nat_gateway   = true
  single_nat_gateway   = false  # HA for production

  tags = {
    Environment = "production"
    ManagedBy   = "Terraform"
    CostCenter  = "engineering"
  }
}

module "rds" {
  source = "../../modules/rds"

  instance_class       = "db.r5.xlarge"  # Production sizing
  allocated_storage    = 500             # Production sizing
  multi_az             = true            # HA for production
  backup_retention     = 30              # Long retention for prod

  vpc_id               = module.vpc.vpc_id
  subnet_ids           = module.vpc.private_subnet_ids

  tags = {
    Environment = "production"
  }
}
```

---

## Module Structure

### Standard Layout

```
my-module/
├── README.md                # Usage documentation
├── LICENSE                  # MIT or Apache 2.0 (for public modules)
├── .pre-commit-config.yaml  # Pre-commit hooks configuration
├── main.tf                  # Primary resources
├── variables.tf             # Input variables with descriptions
├── outputs.tf               # Output values
├── versions.tf              # Provider version constraints
├── examples/
│   ├── simple/              # Minimal working example
│   └── complete/            # Full-featured example
└── tests/                   # Test files
    └── module_test.tftest.hcl  # Or .go
```

### Why This Structure?

- **README.md** - First thing users see, should explain module purpose
- **LICENSE** - Legal terms for public modules (MIT or Apache 2.0)
- **.pre-commit-config.yaml** - Automated validation before commits
- **main.tf** - Primary resources, keep focused
- **variables.tf** - All inputs in one place with descriptions
- **outputs.tf** - All outputs documented
- **versions.tf** - Lock provider versions for stability
- **examples/** - Serve as both documentation and test fixtures
- **tests/** - Automated testing

### License Files

For public modules, always include a LICENSE file:
- **MIT License** - Simple, permissive (common for public modules)
- **Apache 2.0** - Permissive with patent grant protection

**Important:** Do NOT store LICENSE templates in this skill. Generate them during module creation using user preference.

**When to include:**
- ✅ Public modules (GitHub, Terraform Registry)
- ✅ Open-source projects
- ❌ Private internal modules (optional)
- ❌ Environment-specific configurations

### Terraform vs OpenTofu Preference

**Before generating any module or configuration:**

1. **Ask the user:** "Will this be for Terraform or OpenTofu? (Both are supported equally)"

2. **Use the preference throughout:**
   - Command examples: `terraform` vs `tofu`
   - README documentation
   - CI/CD workflow templates
   - Version constraints
   - Binary references

3. **Document the choice:**
   ```markdown
   ## Requirements

   | Name | Version |
   |------|---------|
   | [terraform/tofu] | >= 1.7.0 |
   | aws | >= 6.0 |
   ```

4. **Example command variations:**
   ```bash
   # Terraform
   terraform init
   terraform test
   terraform plan

   # OpenTofu
   tofu init
   tofu test
   tofu plan
   ```

**Note:** The choice is primarily about commands and documentation. The HCL code itself is identical.

**Default behavior:**
- If user doesn't specify: Ask explicitly
- If project already exists, infer from reliable signals (both runtimes share the `.terraform/` working directory, so its presence is **not** a differentiator):
  - `required_version` constraint in `terraform { ... }` (e.g., an OpenTofu-only floor like `>= 1.6.0` set by the team's policy, or comments pinning the runtime)
  - CI/build invocations — whether pipelines call the `terraform` or `tofu` binary explicitly
  - `.terraform.lock.hcl` provenance — the lockfile is written by whichever binary ran `init`; check commit history or the surrounding scripts that produced it
- If still unclear: Ask the user explicitly rather than guessing, or default to showing both options in documentation

---

## Variable Best Practices

### Complete Example

```hcl
variable "instance_type" {
  description = "EC2 instance type for the application server"
  type        = string
  default     = "t3.micro"

  validation {
    condition     = contains(["t3.micro", "t3.small", "t3.medium"], var.instance_type)
    error_message = "Instance type must be t3.micro, t3.small, or t3.medium."
  }
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "enable_monitoring" {
  description = "Enable CloudWatch detailed monitoring"
  type        = bool
  default     = true
}
```

### Key Principles

- ✅ **Always include `description`** - Helps users understand the variable
- ✅ **Use explicit `type` constraints** - Catches errors early
- ✅ **Provide sensible `default` values** - Where appropriate
- ✅ **Add `validation` blocks** - For complex constraints
- ✅ **Use `sensitive = true`** - For secrets (Terraform 0.14+)

### Variable Naming

```hcl
# ✅ Good: Context-specific
var.vpc_cidr_block          # Not just "cidr"
var.database_instance_class # Not just "instance_class"
var.application_port        # Not just "port"

# ❌ Bad: Generic names
var.name
var.type
var.value
```

### Provider Requirements and Alias Passing

Every child module that accepts multiple provider instances **must** declare them via `configuration_aliases`. Every caller that uses non-default provider instances **must** pass them explicitly via a `providers = { ... }` map. Default provider inheritance is implicit only for a single unaliased provider of that type — never for aliases.

✅ DO — multi-region child module declaring aliased providers:

```hcl
# modules/replicated-s3/versions.tf
terraform {
  required_version = ">= 1.3"
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 5.0"
      configuration_aliases = [aws.primary, aws.replica]
    }
  }
}

# modules/replicated-s3/main.tf
resource "aws_s3_bucket" "primary" {
  provider = aws.primary
  bucket   = var.bucket_name
}

resource "aws_s3_bucket" "replica" {
  provider = aws.replica
  bucket   = "${var.bucket_name}-replica"
}
```

✅ DO — root passes providers explicitly:

```hcl
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

provider "aws" {
  alias  = "eu_west_1"
  region = "eu-west-1"
}

module "bucket" {
  source      = "./modules/replicated-s3"
  bucket_name = "app-data"

  providers = {
    aws.primary = aws.us_east_1
    aws.replica = aws.eu_west_1
  }
}
```

❌ DON'T — missing providers map on the module call:

```hcl
module "bucket" {
  source      = "./modules/replicated-s3"
  bucket_name = "app-data"
  # MISSING: providers = { aws.primary = ..., aws.replica = ... }
  # Plan fails: "No configuration for provider aws.primary"
}
```

---

## Output Best Practices

### Complete Example

```hcl
output "instance_id" {
  description = "ID of the created EC2 instance"
  value       = aws_instance.this.id
}

output "instance_arn" {
  description = "ARN of the created EC2 instance"
  value       = aws_instance.this.arn
}

output "private_ip" {
  description = "Private IP address of the instance"
  value       = aws_instance.this.private_ip
  sensitive   = false  # Explicitly document sensitivity
}

output "connection_info" {
  description = "Connection information for the instance"
  value = {
    id         = aws_instance.this.id
    private_ip = aws_instance.this.private_ip
    public_dns = aws_instance.this.public_dns
  }
}
```

### Key Principles

- ✅ **Always include `description`** - Explain what the output is for
- ✅ **Mark sensitive outputs** - Use `sensitive = true`
- ✅ **Return objects for related values** - Groups logically related data
- ✅ **Document intended use** - What should consumers do with this?

---

## Common Patterns

### Iteration: `for_each` vs `count`

Use `for_each` with stable keys whenever a collection has meaningful identity — removing or reordering an element leaves unrelated addresses untouched. Reserve `count` for optional singletons (`0` or `1`) and cases where keys cannot be known at plan time.

For the decision matrix, migration playbook, and known-at-plan failure patterns, see [Code Patterns: count vs for_each](code-patterns.md#count-vs-for_each-deep-dive).

### ✅ DO: Separate Root Module from Reusable Modules

```
# Root module (environment-specific)
prod/
  main.tf          # Calls modules with prod-specific values
  variables.tf     # Environment-specific variables

# Reusable module
modules/webapp/
  main.tf          # Generic, parameterized resources
  variables.tf     # Configurable inputs
```

**Why?** Root modules are environment-specific, reusable modules are generic.

### ✅ DO: Use Locals for Computed Values

```hcl
locals {
  common_tags = merge(
    var.tags,
    {
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  )

  instance_name = "${var.project}-${var.environment}-instance"
}

resource "aws_instance" "app" {
  tags = local.common_tags
  # ...
}
```

### ✅ DO: Version Your Modules

```hcl
# In consuming code
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"  # Pin to major version

  # module inputs...
}
```

**Why?** Prevents unexpected breaking changes.

---

## Anti-patterns to Avoid

### ❌ DON'T: Hard-code Environment-Specific Values

```hcl
# Bad: Module is locked to production
resource "aws_instance" "app" {
  instance_type = "m5.large"  # Should be variable
  tags = {
    Environment = "production" # Should be variable
  }
}
```

**Fix:** Make everything configurable:

```hcl
resource "aws_instance" "app" {
  instance_type = var.instance_type
  tags          = var.tags
}
```

### ❌ DON'T: Create God Modules

```hcl
# Bad: One module does everything
module "everything" {
  source = "./modules/app-infrastructure"

  # Creates VPC, EC2, RDS, S3, IAM, CloudWatch, etc.
}
```

**Problem:** Hard to test, hard to reuse, hard to maintain.

**Fix:** Break into focused modules:

```hcl
module "networking" {
  source = "./modules/vpc"
}

module "compute" {
  source = "./modules/ec2"
  vpc_id = module.networking.vpc_id
}

module "database" {
  source = "./modules/rds"
  vpc_id = module.networking.vpc_id
}
```

### ❌ DON'T: Use `count` or `for_each` in Root Modules for Different Environments

```hcl
# Bad: All environments in one root module
resource "aws_instance" "app" {
  for_each = toset(["dev", "staging", "prod"])

  instance_type = each.key == "prod" ? "m5.large" : "t3.micro"
}
```

**Problem:** Can't have separate state files, blast radius is huge.

**Fix:** Use separate root modules:

```
environments/
  dev/
    main.tf
  staging/
    main.tf
  prod/
    main.tf
```

### ❌ DON'T: Use `terraform_remote_state` Everywhere

Use module outputs when possible. Reserve remote state for ownership boundaries between teams. See [Use terraform_remote_state Sparingly](#3-use-terraform_remote_state-sparingly--only-at-true-ownership-boundaries) for the full rule set.

---

## Module Naming Conventions

### Public Modules

Follow the Terraform Registry convention:

```
terraform-<PROVIDER>-<NAME>

Examples:
terraform-aws-vpc
terraform-aws-eks
terraform-google-network
```

### Private Modules

Use organization-specific prefixes:

```
<ORG>-terraform-<PROVIDER>-<NAME>

Examples:
acme-terraform-aws-vpc
acme-terraform-aws-rds
```

---

## Module Release Checklist

Before publishing or handing off a reusable module:

- [ ] Runtime and provider choice explicit (Terraform vs OpenTofu, version floor in `required_version`)
- [ ] Public vs private scope decided (affects naming + license)
- [ ] `examples/` directory with at least `minimal` and `complete`
- [ ] Tests written (native `terraform test` on 1.6+, or Terratest) — see [testing-frameworks.md](testing-frameworks.md)
- [ ] README documents all inputs/outputs (Description → Usage → Inputs → Outputs → Requirements)
- [ ] Module source pinned with `version` in consumer code
- [ ] `pre-commit-terraform` hooks configured (`terraform_fmt`, `terraform_validate`, `terraform_tflint`, `terraform_docs`), pinned to a specific `rev`
- [ ] `LICENSE` present for public modules (MIT or Apache-2.0)
- [ ] `.gitignore` excludes `.terraform/`, `*.tfstate*`, `*.tfvars`, override files, and editor artifacts

---

## Module Testing — Pointer

Module testing (what to test, tiered layers, mocking, idempotency, cost control, strategy by module type) is canonical in [Testing Frameworks](testing-frameworks.md). Module-specific rules that belong with the module contract:

- Every reusable module must exercise its `validation` blocks in tests — reject cases are as important as happy paths.
- Tier tests by module role: **resource modules** → input validation + attribute assertions; **infrastructure modules** → composition + cross-module wiring; **compositions** → smoke-plan + production-like values + remote-state connectivity.
- Mock providers (1.7+) for unit tests; reserve real cloud runs for main-branch or scheduled jobs.

---

## LLM Mistake Checklist — Modules

Common model mistakes to correct when generating or reviewing modules:

- bundles unrelated resources into one "god module" instead of splitting by single responsibility
- hardcodes environment-specific values (`instance_type = "m5.large"`, `Environment = "production"`) inside a reusable module
- accepts untyped `map(any)` / `any` for core module inputs instead of typed objects with `optional()` defaults
- exposes entire provider or resource objects as outputs, leaking the whole contract instead of a stable subset
- omits `description` on inputs and outputs, forcing consumers to read the implementation
- uses `this` for multiple resources of the same type — reserve `this` for genuine singletons only
- reaches for `terraform_remote_state` inside a single team's stack instead of wiring via module outputs
- floats module sources (no `version` pin) in consumer code
- pushes environment-specific policy (prod-only allowlists, region pins) into primitive/resource modules where it cannot be overridden
- omits `configuration_aliases` in a multi-provider child module's `required_providers` — callers cannot pass aliased providers
- drops the `providers = { aws = aws.region }` map from the module call on multi-region or multi-account deploys — resources land on the default provider

---

**Back to:** [Main Skill File](../SKILL.md)
