# Security & Compliance

> **Part of:** [terraform-skill](../SKILL.md)
> **Purpose:** Security best practices and compliance patterns for Terraform/OpenTofu

This document provides security hardening guidance and compliance automation strategies for infrastructure-as-code.

---

## Table of Contents

1. [Security Scanning Tools](#security-scanning-tools)
2. [Common Security Issues](#common-security-issues)
3. [Compliance Testing](#compliance-testing)
4. [Secrets Management](#secrets-management)
5. [State File Security](#state-file-security)

---

## Security Scanning Tools

### Essential Security Checks

```bash
# Static security scanning
trivy config .
checkov -d .

# Compliance testing (policy-as-code against a terraform plan JSON)
terraform plan -out=tfplan && terraform show -json tfplan > tfplan.json
conftest test tfplan.json --policy policy/
```

### Trivy Integration

**Install:**

```bash
# macOS
brew install trivy

# Linux
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# In CI
- uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'config'
    scan-ref: '.'
```

**Note:** Trivy now includes tfsec's rule set; tfsec itself is in maintenance mode since its absorption into Trivy (2022), but still receives maintenance releases. Both are maintained by Aqua Security.

**Example Output:**

```
Result #1 HIGH Security group rule allows egress to multiple public internet addresses
────────────────────────────────────────────────────────────────────────────────
  security.tf:15-20

   12 | resource "aws_security_group_rule" "egress" {
   13 |   type              = "egress"
   14 |   from_port         = 0
   15 |   to_port           = 0
   16 |   protocol          = "-1"
   17 |   cidr_blocks       = ["0.0.0.0/0"]
   18 |   security_group_id = aws_security_group.this.id
   19 | }
```

### Checkov Integration

```bash
# Run Checkov
checkov -d . --framework terraform

# Skip specific checks
checkov -d . --skip-check CKV_AWS_23

# Generate JSON report
checkov -d . -o json > checkov-report.json
```

---

## Common Security Issues

### ❌ DON'T: Store Secrets in Variables

```hcl
# BAD: Secret in plaintext
variable "database_password" {
  type    = string
  default = "SuperSecret123!"  # ❌ Never do this
}
```

### ✅ DO: Use Secrets Manager

```hcl
# Good: Reference secrets from AWS Secrets Manager
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/database/password"
}

resource "aws_db_instance" "this" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
}
```

<a id="secret-string-state-caveat"></a>

> **Note — data source `secret_string` persists to state:** The `aws_secretsmanager_secret_version` data source reads `secret_string` into Terraform state during refresh. `password_wo` (AWS provider v5.71+, Terraform 1.11+) keeps the **resource argument** out of state, but the data source still persists the value. For true state exclusion:
>
> - Prefer `manage_master_user_password = true` (AWS-managed, for RDS)
> - Use `ephemeral` providers/resources (Terraform 1.10+)
> - Inject via CI environment variable outside Terraform
>
> Examples below use the data-source pattern; apply one of the alternatives above when the value must not land in state.

### ❌ DON'T: Use Default VPC

```hcl
# BAD: Default VPC has public subnets
resource "aws_instance" "app" {
  ami           = "ami-12345"
  subnet_id     = "subnet-default"  # ❌ Avoid default resources
}
```

### ✅ DO: Create Dedicated VPCs

```hcl
# Good: Custom VPC with private subnets
resource "aws_vpc" "this" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
}

resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.this.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"
}
```

### ❌ DON'T: Skip Encryption

```hcl
# BAD: Unencrypted S3 bucket
resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"
  # ❌ No encryption configured
}
```

### ✅ DO: Enable Encryption at Rest

```hcl
# Good: Enable encryption
resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
```

> **SSE-S3 vs SSE-KMS:** `AES256` above is SSE-S3 (AWS-managed key, no per-request audit trail in CloudTrail). For regulated workloads (HIPAA/PCI/FedRAMP), prefer `aws:kms` with a customer-managed CMK + key rotation enabled.

### ❌ DON'T: Open Security Groups to Internet

```hcl
# BAD: Security group open to internet on all protocols
resource "aws_security_group_rule" "allow_all" {
  type              = "ingress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"            # ❌ All protocols (worst case)
  cidr_blocks       = ["0.0.0.0/0"]  # ❌ Never do this
  security_group_id = aws_security_group.this.id
}
```

### ✅ DO: Use Least-Privilege Security Groups

```hcl
# Good: Restrict to specific ports and sources
resource "aws_security_group_rule" "app_https" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/16"]  # ✅ Internal only
  security_group_id = aws_security_group.this.id
}
```

### ❌ DON'T: Use Inline Security Group Rules

```hcl
# BAD: Inline ingress/egress blocks
resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Web server security group"
  vpc_id      = aws_vpc.this.id

  ingress {  # ❌ Inline rules cause issues
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {  # ❌ Avoid inline rules
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

### ✅ DO: Use Separate Security Group Rule Resources

**Preferred (AWS provider v5+):** Use `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule`:

```hcl
# Best: Modern individual rule resources (AWS provider v5+)
resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Web server security group"
  vpc_id      = aws_vpc.this.id

  # No inline rules - managed separately
}

resource "aws_vpc_security_group_ingress_rule" "web_https" {
  security_group_id = aws_security_group.web.id
  description       = "HTTPS from internal VPC"
  cidr_ipv4         = "10.0.0.0/16"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
}

# Scope egress to needed ports when possible — avoid 0.0.0.0/0 with ip_protocol = "-1"
resource "aws_vpc_security_group_egress_rule" "web_https_out" {
  security_group_id = aws_security_group.web.id
  description       = "HTTPS to external services"
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
}
```

**Also acceptable:** `aws_security_group_rule` (older but still supported):

```hcl
resource "aws_security_group_rule" "web_https_ingress" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/16"]
  security_group_id = aws_security_group.web.id
}
```

**Why avoid inline rules:**

| Issue | Inline Rules | Separate Resources |
|-------|--------------|-------------------|
| Rule changes | Recreates entire SG (downtime) | Updates only the rule |
| Mixing approaches | Conflicts and overwrites | N/A - consistent pattern |
| Dynamic rules | Complex `dynamic` blocks needed | Native `for_each` per resource |
| State management | Rules buried in SG state | Each rule tracked separately |
| Conditional rules | Complex nested dynamics | Simple `count` or `for_each` |

---

## Compliance Testing

### Policy-as-code for Terraform plans

Generate a plan JSON and evaluate it with a policy engine. The modern, actively-maintained options are Conftest (OPA/Rego) and Open Policy Agent directly. The `terraform-compliance` BDD project is archived and no longer maintained; prefer Conftest/OPA for new work.

```bash
# Generate plan JSON
terraform plan -out=tfplan
terraform show -json tfplan > tfplan.json

# Evaluate with Conftest (OPA under the hood)
conftest test tfplan.json --policy policy/
```

### Open Policy Agent (OPA)

```rego
# policy/s3_encryption.rego
package terraform.s3

# AWS provider v4+ moved S3 encryption to the separate
# aws_s3_bucket_server_side_encryption_configuration resource.
# Iterate those resources and verify the rule block sets an accepted algorithm.

valid_algorithms := {"aws:kms", "aws:kms:dsse", "AES256"}

# Collect buckets that have an encryption config with a valid algorithm
encrypted_buckets[bucket] {
  sse := input.resource_changes[_]
  sse.type == "aws_s3_bucket_server_side_encryption_configuration"
  rule := sse.change.after.rule[_]
  algo := rule.apply_server_side_encryption_by_default[_].sse_algorithm
  valid_algorithms[algo]
  bucket := sse.change.after.bucket
}

deny[msg] {
  sse := input.resource_changes[_]
  sse.type == "aws_s3_bucket_server_side_encryption_configuration"
  rule := sse.change.after.rule[_]
  algo := rule.apply_server_side_encryption_by_default[_].sse_algorithm
  not valid_algorithms[algo]

  msg := sprintf(
    "S3 encryption config '%s' uses unsupported sse_algorithm '%s' (expected aws:kms or AES256)",
    [sse.address, algo],
  )
}

# Flag buckets that have no matching encryption configuration at all.
deny[msg] {
  bucket := input.resource_changes[_]
  bucket.type == "aws_s3_bucket"
  bucket_name := bucket.change.after.bucket
  not encrypted_buckets[bucket_name]

  msg := sprintf(
    "S3 bucket '%s' has no aws_s3_bucket_server_side_encryption_configuration",
    [bucket.address],
  )
}
```

---

## Secrets Management

### AWS Secrets Manager Pattern

See the [data-source `secret_string` persistence caveat](#secret-string-state-caveat) above — both `random_password.result` and data-source reads of `secret_string` land in Terraform state. The recommended RDS pattern avoids both.

```hcl
# Recommended: let RDS generate and manage the master password in Secrets Manager
resource "aws_kms_key" "db" {
  description             = "KMS CMK for RDS-managed master password"
  enable_key_rotation     = true
  deletion_window_in_days = 30
}

resource "aws_db_instance" "this" {
  # Option 1 (recommended): AWS-managed master password in Secrets Manager
  manage_master_user_password   = true
  master_user_secret_kms_key_id = aws_kms_key.db.arn

  # Option 2 (Terraform 1.11+ + AWS provider v5.71+): write-only password
  # password_wo         = ephemeral.random_password.db.result
  # password_wo_version = 1
  # ...
}
```

If you need a manually-managed secret for a non-RDS consumer, keep the value out of state by sourcing it outside Terraform (CI env var, ephemeral resource, or a write-only argument) rather than via `random_password` + a `data` lookup:

```hcl
# Only use this shape when the consumer cannot use manage_master_user_password
# and you are comfortable with the caveat linked above.
resource "aws_secretsmanager_secret" "app_api_key" {
  name                    = "prod/app/api-key"
  description             = "Third-party API key"
  recovery_window_in_days = 30
}

# secret_string populated out-of-band (console, CLI, or a write-only argument on
# providers that support it) — not via random_password stored in state.
```

### Environment Variables

```bash
# Never commit these
export TF_VAR_database_password="secret123"
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

**In .gitignore:**

```
*.tfvars
.env
secrets/
```

---

## State File Security

### Encrypt State at Rest

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket       = "my-terraform-state"
    key          = "prod/vpc/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true                                             # Enables SSE on PUT
    kms_key_id   = "arn:aws:kms:us-east-1:ACCOUNT:key/KEY-ID"       # Customer-managed CMK
    use_lockfile = true                                             # Terraform 1.10+
  }
}
```

> **`encrypt = true` alone is SSE-S3 (AWS-managed AES-256 key, no per-request CloudTrail audit trail).** State often holds secrets, so pair `encrypt = true` with `kms_key_id` pointing at a customer-managed CMK. `use_lockfile = true` (Terraform 1.10+) replaces the need for a DynamoDB lock table.

### Secure State Bucket

```hcl
resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-terraform-state"
}

# Enable versioning (protect against accidental deletion)
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable encryption — customer-managed KMS CMK with bucket key to control request costs
resource "aws_kms_key" "terraform_state" {
  description             = "KMS CMK for Terraform state bucket"
  enable_key_rotation     = true
  deletion_window_in_days = 30
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.terraform_state.arn
    }
    bucket_key_enabled = true
  }
}

# Note: for regulated workloads (HIPAA/PCI/FedRAMP), customer-managed KMS with
# rotation enabled is typically required — SSE-S3 (AES256) is usually insufficient.

# Block public access
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

### Restrict State Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowListBucket",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/TerraformRole"
      },
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::my-terraform-state"
    },
    {
      "Sid": "AllowObjectRW",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/TerraformRole"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetObjectVersion"
      ],
      "Resource": "arn:aws:s3:::my-terraform-state/*"
    },
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::my-terraform-state",
        "arn:aws:s3:::my-terraform-state/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
```

- `s3:ListBucket` must target the bucket ARN; object actions must target `/*` — splitting avoids IAM silently no-op'ing the mismatched pairings.
- `s3:DeleteObject` + `s3:GetObjectVersion` are required to rotate state objects when versioning is enabled.
- The `Deny` statement enforces TLS — any HTTP request is rejected regardless of other grants.

---

## IAM Best Practices

### ✅ DO: Use Least Privilege

```hcl
# Good: Specific permissions only
resource "aws_iam_policy" "app_policy" {
  name = "app-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "arn:aws:s3:::my-app-bucket/*"
      }
    ]
  })
}
```

### ❌ DON'T: Use Wildcard Permissions

```hcl
# BAD: Overly broad permissions
resource "aws_iam_policy" "bad_policy" {
  policy = jsonencode({
    Statement = [
      {
        Effect   = "Allow"
        Action   = "*"  # ❌ Never use wildcard
        Resource = "*"
      }
    ]
  })
}
```

---

## Compliance Checklists

### SOC 2 Compliance

- [ ] Encryption at rest for all data stores
- [ ] Encryption in transit (TLS/SSL)
- [ ] IAM policies follow least privilege
- [ ] Logging enabled for all resources
- [ ] MFA required for privileged access (enforced at org/IdP level, not per-resource)
- [ ] Regular security scanning in CI/CD

### HIPAA Compliance

- [ ] PHI encrypted at rest and in transit
- [ ] Access logs enabled
- [ ] Dedicated VPC with private subnets
- [ ] Regular backup and retention policies
- [ ] Audit trail for all infrastructure changes

### PCI-DSS Compliance

- [ ] Network segmentation (separate VPCs)
- [ ] No default passwords
- [ ] Strong encryption algorithms
- [ ] Regular security scanning
- [ ] Access control and monitoring

---

## LLM Mistake Checklist — Security & Compliance

Common model mistakes to correct before returning security/compliance recommendations:

- assumes `sensitive = true` keeps the value out of state — it only masks display; use `write_only` / `*_wo` arguments on 1.11+ or an external secret lookup
- proposes plaintext defaults in `variable` blocks or committed `.tfvars` "for demo convenience"
- echoes secrets through `provisioner` commands or `local-exec` stdout into CI logs
- emits outputs that expose full connection strings or credentials (even when marked `sensitive`)
- mentions a compliance framework (SOC 2, PCI, HIPAA, GDPR, FedRAMP) but provides no enforceable gate — no policy stage, no approval model, no evidence artifact
- confuses security best practices with compliance evidence (an encrypted bucket is not the same as a retained audit artifact proving it)
- omits artifact retention and access controls for plan JSON exports
- ignores data-residency obligations for GDPR/FedRAMP contexts

---

## Resources

- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [Checkov Documentation](https://www.checkov.io/)
- [Open Policy Agent](https://www.openpolicyagent.org/)
- [Conftest](https://www.conftest.dev/)
- [AWS Security Best Practices](https://aws.amazon.com/security/best-practices/)

---

**Back to:** [Main Skill File](../SKILL.md)
