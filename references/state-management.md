# State Management

> **Part of:** [terraform-skill](../SKILL.md)
> **Purpose:** Comprehensive state management patterns and best practices for Terraform/OpenTofu

This document provides detailed guidance on state management, from remote backend configuration to recovery strategies and multi-team isolation patterns.

---

## Table of Contents

1. [Remote State Configuration](#remote-state-configuration)
2. [State Locking](#state-locking)
3. [State Security](#state-security)
4. [State Migration](#state-migration)
5. [Multi-Team State Isolation](#multi-team-state-isolation)
6. [State Recovery & Troubleshooting](#state-recovery--troubleshooting)
7. [State Best Practices Summary](#state-best-practices-summary)

---

## Remote State Configuration

### Why Remote State?

**Never use local state in teams or production:**
- ❌ No locking → concurrent operations → state corruption
- ❌ No backup → accidental deletion → infrastructure loss
- ❌ No versioning → rollback impossible
- ❌ No collaboration → single point of failure
- ❌ Secrets in plaintext → security risk

**Use remote backends for:**
- ✅ Automatic state locking
- ✅ Encryption at rest and in transit
- ✅ State versioning and backup
- ✅ Team collaboration
- ✅ Audit logging

### AWS S3 Backend (Recommended)

**Complete setup with locking:**

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/vpc/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
    
    # Optional but recommended
    kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
  }
}
```

**Backend infrastructure setup:**

```hcl
# bootstrap/main.tf - Run this ONCE to create state backend
resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-terraform-state"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.terraform_state.arn
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# MFA Delete for production
# Note: Terraform cannot enable S3 MFA Delete. This must be configured
# outside of Terraform using the AWS CLI or an SDK with the root account.
#
# Example (run once, after bucket creation and versioning are enabled):
#
# aws s3api put-bucket-versioning \
#   --bucket my-terraform-state \
#   --versioning-configuration Status=Enabled,MFADelete=Enabled \
#   --mfa "arn-of-mfa-device mfa-code"
# DynamoDB table for state locking
resource "aws_dynamodb_table" "terraform_state_lock" {
  name         = "terraform-state-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = "Terraform State Lock Table"
    Environment = "shared"
  }
}

# KMS key for encryption
resource "aws_kms_key" "terraform_state" {
  description             = "KMS key for Terraform state encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name = "terraform-state-encryption"
  }
}

resource "aws_kms_alias" "terraform_state" {
  name          = "alias/terraform-state"
  target_key_id = aws_kms_key.terraform_state.key_id
}
```

**Key organization pattern:**

```
s3://my-terraform-state/
├── prod/
│   ├── vpc/terraform.tfstate
│   ├── eks/terraform.tfstate
│   └── rds/terraform.tfstate
├── staging/
│   ├── vpc/terraform.tfstate
│   └── eks/terraform.tfstate
└── dev/
    └── vpc/terraform.tfstate
```

### Azure Storage Backend

```hcl
# backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstatestorage"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
    
    # Optional: Use service principal or managed identity
    use_azuread_auth = true
  }
}
```

**Backend setup:**

```hcl
# bootstrap/main.tf
resource "azurerm_resource_group" "terraform_state" {
  name     = "terraform-state-rg"
  location = "East US"
}

resource "azurerm_storage_account" "terraform_state" {
  name                     = "tfstatestorage"
  resource_group_name      = azurerm_resource_group.terraform_state.name
  location                 = azurerm_resource_group.terraform_state.location
  account_tier             = "Standard"
  account_replication_type = "GRS"  # Geo-redundant
  
  # Security settings
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  
  blob_properties {
    versioning_enabled = true
  }
}

resource "azurerm_storage_container" "terraform_state" {
  name                  = "tfstate"
  storage_account_name  = azurerm_storage_account.terraform_state.name
  container_access_type = "private"
}
```

### Google Cloud Storage Backend

```hcl
# backend.tf
terraform {
  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "prod/vpc"
    
    # Optional: Customer-managed encryption key
    encryption_key = "projects/my-project/locations/us-central1/keyRings/terraform/cryptoKeys/state"
  }
}
```

**Backend setup:**

```hcl
# bootstrap/main.tf
resource "google_storage_bucket" "terraform_state" {
  name          = "my-terraform-state"
  location      = "US"
  force_destroy = false

  versioning {
    enabled = true
  }

  encryption {
    default_kms_key_name = google_kms_crypto_key.terraform_state.id
  }

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      num_newer_versions = 10
    }
    action {
      type = "Delete"
    }
  }
}

resource "google_kms_key_ring" "terraform_state" {
  name     = "terraform-state"
  location = "us-central1"
}

resource "google_kms_crypto_key" "terraform_state" {
  name     = "terraform-state-key"
  key_ring = google_kms_key_ring.terraform_state.id

  rotation_period = "7776000s"  # 90 days
}
```

### Terraform Cloud/Enterprise Backend

```hcl
# backend.tf
terraform {
  cloud {
    organization = "my-org"
    
    workspaces {
      name = "prod-infrastructure"
      # Or use tags for dynamic workspace selection
      # tags = ["prod", "networking"]
    }
  }
}

# Alternative: Terraform Enterprise with custom hostname
terraform {
  cloud {
    hostname     = "terraform.company.com"
    organization = "my-org"
    
    workspaces {
      name = "prod-infrastructure"
    }
  }
}
```

**Benefits of Terraform Cloud:**
- ✅ Built-in state management and locking
- ✅ No infrastructure to manage
- ✅ Remote execution
- ✅ Sentinel policy enforcement
- ✅ Cost estimation
- ✅ Private module registry
- ✅ VCS integration

### Backend Configuration Best Practices

✅ **DO:**
- Use separate state files per logical component
- Enable versioning on state storage
- Use encryption at rest (KMS)
- Configure state locking
- Use separate backends per environment
- Store backend config in version control
- Use partial configuration for sensitive values

❌ **DON'T:**
- Use local state for teams or production
- Share state files across unrelated resources
- Hardcode credentials in backend config
- Disable versioning
- Skip encryption
- Use same state for all environments

**Partial backend configuration:**

```hcl
# backend.tf - No sensitive values
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    region = "us-east-1"
    # key, dynamodb_table specified via -backend-config
  }
}
```

```bash
# Pass sensitive config at init time
terraform init \
  -backend-config="key=prod/vpc/terraform.tfstate" \
  -backend-config="dynamodb_table=terraform-state-lock"

# Or use a file
terraform init -backend-config=backend-prod.hcl
```

---

## State Locking

### Why Locking Matters

**Without locking:**
```
User A: terraform apply  (starts)
User B: terraform apply  (starts at same time)
Result: Both read same state, make conflicting changes
        → State corruption
        → Infrastructure drift
        → Potential outages
```

**With locking:**
```
User A: terraform apply  (acquires lock)
User B: terraform apply  (waits for lock)
Result: Operations are serialized
        → State consistency maintained
```

### Backend Locking Support

| Backend | Locking | Lock Mechanism |
|---------|---------|----------------|
| **S3** | ✅ With DynamoDB | DynamoDB table |
| **Azure Storage** | ✅ Native | Blob lease |
| **GCS** | ✅ Native | Object metadata |
| **Terraform Cloud** | ✅ Native | Built-in |
| **Consul** | ✅ Native | Consul KV |
| **Postgres** | ✅ Native | Row locking |
| **Local** | ❌ None | N/A |

### DynamoDB Locking for S3

**Lock table attributes:**
- `LockID` (String, Hash Key) - Must be exactly "LockID"
- No other attributes needed
- Pay-per-request billing recommended

**Lock behavior:**

```bash
# Terraform acquires lock
terraform plan
# Creates lock: LockID = "bucket/path/to/state"

# Another user attempts operation
terraform apply
# Sees: Error acquiring the state lock
# Wait time: 0s (fails immediately)
```

**View current locks:**

```bash
# Check DynamoDB for active locks
aws dynamodb scan \
  --table-name terraform-state-lock \
  --projection-expression "LockID,Info"
```

### Handling Lock Conflicts

#### Scenario 1: Lock Already Held

**Symptom:**
```
Error: Error acquiring the state lock

Lock Info:
  ID:        a1b2c3d4-e5f6-7890-abcd-ef1234567890
  Path:      bucket/prod/terraform.tfstate
  Operation: OperationTypeApply
  Who:       user@host
  Created:   2026-01-20 12:00:00.123456789 +0000 UTC
```

**Solutions:**

1. **Wait for operation to complete** (recommended)
   ```bash
   # Just wait - the other operation will release the lock
   ```

2. **Check if operation is actually running**
   ```bash
   # If user@host is accessible, check if terraform is running
   ssh user@host "ps aux | grep terraform"
   ```

3. **Force unlock if operation crashed** (DANGEROUS)
   ```bash
   # Only if you're CERTAIN the lock is stale
   terraform force-unlock a1b2c3d4-e5f6-7890-abcd-ef1234567890
   ```

#### Scenario 2: Stale Lock (Operation Crashed)

**When to force-unlock:**
- ✅ Process crashed/killed
- ✅ Network interruption
- ✅ CI/CD job terminated
- ✅ You verified no operation is running

**When NOT to force-unlock:**
- ❌ Just because you're impatient
- ❌ Without checking if operation is running
- ❌ In automation (should fail instead)

**Safe force-unlock workflow:**

```bash
# 1. Verify lock exists
terraform plan
# Note the Lock ID from error message

# 2. Check if operation is actually running
# - SSH to the host if accessible
# - Check CI/CD job status
# - Ask team members

# 3. Only if confirmed stale, force unlock
terraform force-unlock LOCK_ID

# 4. Document why you force-unlocked
git commit -m "Force-unlocked state after CI job termination"
```

### Automatic Lock Timeout

**Terraform Cloud lock timeout:**

Lock timeout in Terraform Cloud is configured through workspace settings in the Terraform Cloud UI under "General Settings" → "Remote Operations" → "Lock Timeout". It cannot be configured through the `cloud` block in Terraform code.

**For other backends, implement timeout in automation:**

```bash
#!/bin/bash
# wrapper-script.sh
LOCK_TIMEOUT=300  # 5 minutes

timeout $LOCK_TIMEOUT terraform apply -auto-approve

if [ $? -eq 124 ]; then
  echo "Terraform timed out - likely lock held"
  exit 1
fi
```

### State Locking in CI/CD

**Prevent concurrent runs:**

```yaml
# GitHub Actions - Use concurrency control
concurrency:
  group: terraform-${{ github.ref }}
  cancel-in-progress: false  # Don't cancel, wait instead

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - name: Terraform Apply
        run: terraform apply -auto-approve
```

**GitLab CI:**

```yaml
# .gitlab-ci.yml
terraform-apply:
  script:
    - terraform apply -auto-approve
  resource_group: terraform-prod  # Only one job at a time
```

---

## State Security

### Encryption at Rest

**S3 Backend:**

```hcl
terraform {
  backend "s3" {
    bucket     = "my-terraform-state"
    key        = "prod/terraform.tfstate"
    region     = "us-east-1"
    encrypt    = true  # ✅ Always enable
    kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/..."  # Optional: Use customer-managed key
  }
}
```

**Encryption options:**

| Method | Key Management | Cost | Use Case |
|--------|----------------|------|----------|
| **SSE-S3** (AES-256) | AWS-managed | Included | Basic encryption |
| **SSE-KMS** | Customer-managed | $$$ per 10K requests | Compliance requirements |
| **SSE-C** | Client-managed | Included | Full control needed |

### Encryption in Transit

**All backends use TLS by default:**
- S3: HTTPS
- Azure Storage: HTTPS
- GCS: HTTPS
- Terraform Cloud: HTTPS

**Enforce TLS-only access:**

```json
// S3 bucket policy
{
  "Version": "2012-10-17",
  "Statement": [
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

### Access Control Patterns

#### IAM Policy for S3 Backend (AWS)

**Minimal permissions:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::my-terraform-state"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::my-terraform-state/prod/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/terraform-state-lock"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:Encrypt",
        "kms:GenerateDataKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:*:key/*"
    }
  ]
}
```

**Read-only policy (for auditing):**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::my-terraform-state",
        "arn:aws:s3:::my-terraform-state/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "kms:Decrypt",
      "Resource": "arn:aws:kms:us-east-1:*:key/*"
    }
  ]
}
```

#### Environment Isolation with IAM

**Principle:** Each environment gets its own IAM role with scoped access

```hcl
# prod-role can only access prod state
resource "aws_iam_role" "terraform_prod" {
  name = "terraform-prod"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::123456789012:root"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "terraform_prod_state" {
  role = aws_iam_role.terraform_prod.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = [
          "arn:aws:s3:::my-terraform-state",
          "arn:aws:s3:::my-terraform-state/prod/*"  # Only prod path
        ]
      }
    ]
  })
}
```

### Sensitive Data in State Files

**What gets stored in state:**
- Resource attributes (including computed values)
- Variable values
- Output values
- Sensitive data like:
  - Database passwords
  - API keys
  - SSH keys
  - Certificate private keys

#### ❌ DON'T: Store Secrets in Variables

```hcl
# BAD: Secret visible in state
variable "database_password" {
  type      = string
  sensitive = true
  default   = "SuperSecret123!"  # ❌ Still stored in state
}
```

#### ✅ DO: Use Write-Only Arguments (Terraform 1.11+)

```hcl
# Good: Password never stored in state
resource "aws_db_instance" "this" {
  # ... other config ...
  
  manage_master_user_password = true  # AWS generates and stores password
  
  lifecycle {
    ignore_changes = [master_user_secret]
  }
}

# Access password via Secrets Manager
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_db_instance.this.master_user_secret[0].secret_arn
}
```

#### ✅ DO: Reference External Secrets

```hcl
# Good: Fetch secret at runtime, not stored in state
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/database/master-password"
}

resource "aws_db_instance" "this" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
  # Password still in state, but not hardcoded
}
```

#### Best Practice: Rotate Secrets Stored in State

```bash
# After rotation, refresh state
terraform apply -refresh-only
```

### State File Audit Logging

**S3 Bucket logging:**

```hcl
resource "aws_s3_bucket_logging" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "terraform-state-access/"
}

# CloudTrail for API-level logging
resource "aws_cloudtrail" "terraform_state" {
  name           = "terraform-state-trail"
  s3_bucket_name = aws_s3_bucket.cloudtrail_logs.id

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::my-terraform-state/*"]
    }
  }
}
```

**Azure Storage logging:**

```hcl
resource "azurerm_storage_account" "terraform_state" {
  # ... other config ...

  blob_properties {
    logging {
      delete                = true
      read                  = true
      write                 = true
      version               = true
      retention_policy_days = 90
    }
  }
}
```

**What to monitor:**
- Who accessed state files
- When state was modified
- What changes were made
- Failed access attempts

---

## State Migration

### Migrating Between Backends

#### Local → S3 Migration

**Step 1: Set up S3 backend infrastructure**

```bash
# In bootstrap directory
terraform init
terraform apply
```

**Step 2: Add backend config to your Terraform code**

```hcl
# backend.tf - Add this file
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/vpc/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

**Step 3: Initialize with migration**

```bash
# Backup local state first
cp terraform.tfstate terraform.tfstate.backup

# Migrate to S3
terraform init -migrate-state

# Terraform will ask: "Do you want to copy existing state to the new backend?"
# Answer: yes

# Verify migration
terraform plan  # Should show no changes

# Verify state in S3
aws s3 ls s3://my-terraform-state/prod/vpc/
```

**Step 4: Clean up local state** (AFTER verifying S3 works)

```bash
# Remove local state files
rm terraform.tfstate*

# Commit backend config
git add backend.tf
git commit -m "Migrate state to S3 backend"
```

#### S3 → Terraform Cloud Migration

**Step 1: Create Terraform Cloud workspace**

```bash
# Via CLI
terraform login
terraform workspace new prod-infrastructure
```

**Step 2: Update backend config**

```hcl
# backend.tf - Change from S3 to cloud
terraform {
  cloud {
    organization = "my-org"
    
    workspaces {
      name = "prod-infrastructure"
    }
  }
}

# Remove old S3 backend config
```

**Step 3: Migrate state**

```bash
# Initialize with migration
terraform init -migrate-state

# Confirm migration
# State will be uploaded to Terraform Cloud
```

**Step 4: Verify and clean up**

```bash
# Verify in Terraform Cloud UI or CLI
terraform state list

# Old S3 state remains as backup - don't delete immediately
# Keep for 30-90 days, then remove
```

#### Backend Change Without Migration

**When recreating infrastructure is acceptable:**

```bash
# Change backend config in backend.tf

# Re-initialize (will create new empty state)
terraform init -reconfigure

# Import existing resources
terraform import aws_vpc.this vpc-12345678
terraform import aws_subnet.private subnet-abcd1234
# ... import all resources ...

# Or destroy and recreate
terraform destroy  # In old backend
terraform apply    # In new backend
```

### State Refactoring with `terraform state mv`

**Use cases:**
- Renaming resources
- Moving resources between modules
- Reorganizing state structure
- Splitting monolithic state

#### Renaming a Resource

```bash
# Before: aws_instance.server
# After:  aws_instance.web_server

terraform state mv aws_instance.server aws_instance.web_server

# Update code to match
# In main.tf: resource "aws_instance" "web_server" { ... }

# Verify
terraform plan  # Should show no changes
```

#### Moving Resource to Module

```bash
# Before: aws_s3_bucket.logs (in root module)
# After:  module.logging.aws_s3_bucket.logs

# Step 1: Create module with resource
# Step 2: Move state
terraform state mv aws_s3_bucket.logs module.logging.aws_s3_bucket.logs

# Step 3: Remove old resource from root module
# Step 4: Add module call
# Step 5: Verify
terraform plan  # Should show no changes
```

#### Moving Resource Between Modules

```bash
# Move from module.old to module.new
terraform state mv \
  module.old.aws_instance.app \
  module.new.aws_instance.app
```

#### Moving Resource to Different State File

**Scenario:** Splitting state into separate files

**Note:** `terraform state mv` only works within the same state file. To move resources between different state files, use the approach below.

**Recommended approach: Use `terraform state rm` and `import`**

```bash
# In source state - remove resource
terraform state rm aws_rds_cluster.main

# In destination state - import resource
terraform import aws_rds_cluster.main cluster-identifier
```

### State Push/Pull Operations

**Pull state (download):**

```bash
# View current state
terraform state pull

# Save to file
terraform state pull > terraform.tfstate.backup

# View specific resource
terraform state show aws_instance.web
```

**Push state (upload):**

```bash
# Restore from backup
terraform state push terraform.tfstate.backup

# DANGEROUS: Overwrites remote state
# Only use for disaster recovery
```

**When to use push/pull:**
- ✅ Creating backups
- ✅ Disaster recovery
- ✅ Debugging state issues
- ✅ Manual state surgery (advanced)
- ❌ Regular operations (use terraform commands)
- ❌ Concurrent team access

### State Backup Strategies

#### Automatic Backups

**S3 versioning (automatic):**

```bash
# List all versions
aws s3api list-object-versions \
  --bucket my-terraform-state \
  --prefix prod/vpc/terraform.tfstate

# Restore specific version
aws s3api get-object \
  --bucket my-terraform-state \
  --key prod/vpc/terraform.tfstate \
  --version-id VERSION_ID \
  terraform.tfstate.restored
```

**Pre-operation backup:**

```bash
# Manual backup before major changes
terraform state pull > backup-$(date +%Y%m%d-%H%M%S).tfstate

# Or in automation
#!/bin/bash
BACKUP_DIR="./state-backups"
mkdir -p $BACKUP_DIR

terraform state pull > "$BACKUP_DIR/terraform.tfstate.$(date +%Y%m%d-%H%M%S)"

# Keep last 30 backups
ls -t $BACKUP_DIR/terraform.tfstate.* | tail -n +31 | xargs rm -f
```

#### Disaster Recovery Plan

**1. Backup checklist:**
- [ ] State file backed up (versioning enabled)
- [ ] Backend config documented
- [ ] IAM policies documented
- [ ] Encryption keys accessible
- [ ] Restore procedure tested

**2. Recovery procedure:**

```bash
# If state corrupted
# Step 1: Download last known good version
aws s3api get-object \
  --bucket my-terraform-state \
  --key prod/vpc/terraform.tfstate \
  --version-id PREVIOUS_VERSION_ID \
  terraform.tfstate.recovered

# Step 2: Push recovered state
terraform state push terraform.tfstate.recovered

# Step 3: Verify
terraform plan

# Step 4: If resources drifted, reconcile
terraform apply -refresh-only
```

---

## Multi-Team State Isolation

### State Organization Patterns

#### Pattern 1: State Per Environment

**Structure:**

```
my-company-tf-state/
├── dev/
│   ├── networking/terraform.tfstate
│   ├── compute/terraform.tfstate
│   └── data/terraform.tfstate
├── staging/
│   ├── networking/terraform.tfstate
│   └── compute/terraform.tfstate
└── prod/
    ├── networking/terraform.tfstate
    ├── compute/terraform.tfstate
    └── data/terraform.tfstate
```

**Benefits:**
- ✅ Clear environment separation
- ✅ Different IAM roles per environment
- ✅ Blast radius limited to environment
- ✅ Easy to understand

**Drawbacks:**
- ⚠️ Duplicate code across environments
- ⚠️ Harder to keep environments in sync

#### Pattern 2: State Per Team/Component

**Structure:**

```
my-company-tf-state/
├── networking-team/
│   ├── prod-vpc/terraform.tfstate
│   ├── staging-vpc/terraform.tfstate
│   └── vpn/terraform.tfstate
├── platform-team/
│   ├── prod-eks/terraform.tfstate
│   └── staging-eks/terraform.tfstate
└── data-team/
    ├── prod-rds/terraform.tfstate
    └── prod-redshift/terraform.tfstate
```

**Benefits:**
- ✅ Team ownership clear
- ✅ Team-specific access control
- ✅ Independent release cycles
- ✅ Reduced coordination overhead

**Drawbacks:**
- ⚠️ Cross-team dependencies complex
- ⚠️ Need data sharing mechanisms

#### Pattern 3: Hybrid (Environment + Component)

**Structure:**

```
my-company-tf-state/
├── prod/
│   ├── 01-networking/terraform.tfstate  # VPC, subnets
│   ├── 02-platform/terraform.tfstate    # EKS, ALB
│   ├── 03-data/terraform.tfstate        # RDS, Redis
│   └── 04-applications/terraform.tfstate
├── staging/
│   ├── 01-networking/terraform.tfstate
│   └── 02-platform/terraform.tfstate
```

**Benefits:**
- ✅ Clear environment boundaries
- ✅ Component isolation within environment
- ✅ Numbered prefixes show dependencies
- ✅ Team ownership possible

**Recommended:** This pattern for most teams

### Cross-State Data Sharing

#### Using terraform_remote_state

**Producer module (networking):**

```hcl
# outputs.tf in networking module
output "vpc_id" {
  description = "VPC ID for other modules"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "database_security_group_id" {
  description = "Security group for databases"
  value       = aws_security_group.database.id
}
```

**Consumer module (compute):**

```hcl
# data.tf in compute module
data "terraform_remote_state" "networking" {
  backend = "s3"
  
  config = {
    bucket = "my-terraform-state"
    key    = "prod/networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use networking outputs
resource "aws_instance" "app" {
  subnet_id              = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]
  vpc_security_group_ids = [data.terraform_remote_state.networking.outputs.database_security_group_id]
}
```

**Best practices:**
- ✅ Document what outputs are for cross-module use
- ✅ Version outputs (add v2 suffix if breaking change)
- ✅ Keep outputs stable (don't rename casually)
- ✅ Use descriptive output names

#### Alternative: SSM Parameter Store

**Producer:**

```hcl
# Store values in SSM
resource "aws_ssm_parameter" "vpc_id" {
  name  = "/terraform/prod/networking/vpc_id"
  type  = "String"
  value = aws_vpc.main.id
}
```

**Consumer:**

```hcl
# Read from SSM
data "aws_ssm_parameter" "vpc_id" {
  name = "/terraform/prod/networking/vpc_id"
}

resource "aws_instance" "app" {
  subnet_id = data.aws_ssm_parameter.vpc_id.value
}
```

**Benefits over remote_state:**
- ✅ No direct state dependency
- ✅ Can be read by non-Terraform tools
- ✅ Can be updated without Terraform
- ✅ Fine-grained IAM control

**Drawbacks:**
- ⚠️ Extra resources to manage
- ⚠️ Potential for values to be out of sync

### When to Split vs Combine State

#### Split State When:

✅ **Different lifecycles:**
- VPC (rarely changes) vs EC2 instances (frequently updated)

✅ **Different teams own components:**
- Networking team manages VPC
- Platform team manages Kubernetes
- App teams manage applications

✅ **Different risk profiles:**
- Critical infrastructure vs experimental features

✅ **Large state files:**
- State operations becoming slow (>1000 resources)

✅ **Independent deployment cadence:**
- Database needs weekly updates
- Application needs daily updates

#### Combine State When:

✅ **Tightly coupled resources:**
- EC2 instance + EBS volume + ENI

✅ **Same lifecycle:**
- All resources created/destroyed together

✅ **Simple, small project:**
- < 100 resources
- Single team ownership

✅ **Resources reference each other frequently:**
- Security groups that reference each other

### Decision Matrix

| Factor | Split State | Single State |
|--------|-------------|--------------|
| **Team size** | Multiple teams | Single team |
| **Resource count** | >500 resources | <100 resources |
| **Update frequency** | Different cadences | Same cadence |
| **Risk tolerance** | Low (production) | High (dev/test) |
| **Coupling** | Loosely coupled | Tightly coupled |
| **Ownership** | Multiple owners | Single owner |

---

## State Recovery & Troubleshooting

### Recovering from State Corruption

#### Scenario 1: State File Corrupted

**Symptoms:**
```
Error: state snapshot was created by Terraform v1.8.0,
       which is newer than current v1.6.0
```

**Solutions:**

**A) Restore from backup:**

```bash
# S3 versioning
aws s3api list-object-versions \
  --bucket my-terraform-state \
  --prefix prod/terraform.tfstate

aws s3api get-object \
  --bucket my-terraform-state \
  --key prod/terraform.tfstate \
  --version-id PREVIOUS_VERSION \
  terraform.tfstate.restored

terraform state push terraform.tfstate.restored
```

**B) Upgrade Terraform:**

```bash
# Download newer version
tfenv install 1.8.0
tfenv use 1.8.0

# Verify
terraform version
```

#### Scenario 2: State Completely Lost

**If no backup exists:**

1. **Recreate state from existing infrastructure:**

```bash
# List all resources to import
# (You'll need to know what was managed)

# Import resources one by one
terraform import aws_vpc.main vpc-12345678
terraform import aws_subnet.private[0] subnet-abcd1234
terraform import aws_subnet.private[1] subnet-efgh5678
# ... continue for all resources ...

# Verify
terraform plan  # Should eventually show no changes
```

2. **Use import blocks (Terraform 1.5+):**

```hcl
# import.tf
import {
  to = aws_vpc.main
  id = "vpc-12345678"
}

import {
  to = aws_subnet.private[0]
  id = "subnet-abcd1234"
}
```

```bash
terraform plan -generate-config-out=generated.tf
# Review generated.tf and merge with existing config
terraform apply
```

### Handling State Lock Stuck Issues

#### Issue: Lock Persists After Crash

**Check lock status:**

```bash
# DynamoDB (S3 backend)
aws dynamodb get-item \
  --table-name terraform-state-lock \
  --key '{"LockID":{"S":"my-terraform-state/prod/terraform.tfstate"}}'

# If item exists, lock is held
```

**Force unlock:**

```bash
# Get Lock ID from error message or DynamoDB
terraform force-unlock LOCK_ID

# Confirm when prompted
```

**Prevent future issues in CI/CD:**

Use concurrency controls instead of automatic force-unlock (see CI/CD section below).

#### Issue: Cannot Acquire Lock in CI/CD

**Problem:** Parallel CI jobs trying to acquire lock

**Solution 1: Use concurrency control**

```yaml
# GitHub Actions
concurrency:
  group: terraform-${{ matrix.environment }}
  cancel-in-progress: false

jobs:
  terraform:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, prod]
```

**Solution 2: Separate state per branch/PR**

```bash
# backend.tf (partial configuration - key provided dynamically)
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    region = "us-east-1"
    # Note: Backend configuration does not support interpolation or env vars.
    # Set the key dynamically during init in CI/CD:
  }
}

# In CI/CD workflow (e.g., GitHub Actions):
# terraform init -backend-config="key=pr-${GITHUB_PR_NUMBER}/terraform.tfstate"
```

### State Refresh and Reconciliation

**State drift:** State doesn't match reality

**Detect drift:**

```bash
# Terraform 1.5+
terraform plan -refresh-only

# Shows what's changed in infrastructure vs state
```

**Reconcile drift:**

```bash
# Update state to match reality (no infrastructure changes)
terraform apply -refresh-only

# Or during regular plan/apply
terraform plan   # Includes refresh
terraform apply  # Updates state
```

**Common drift causes:**
- Manual changes in AWS console
- Changes by other tools (aws cli, CDK)
- Resource deletion outside Terraform
- Provider API changes

**Prevent drift:**
- ✅ Use CloudTrail to monitor manual changes
- ✅ Implement policy to block manual changes
- ✅ Use drift detection tools (Terraform Cloud, checkov)
- ✅ Regular `terraform plan` in CI/CD
- ✅ Enable termination protection on critical resources

### Import for State Recovery

**When to use import:**
- Resources created manually, now want Terraform to manage
- Recovering from state loss
- Adopting existing infrastructure
- Migrating from other IaC tools

**Import workflow:**

**1. Write resource configuration:**

```hcl
# main.tf
resource "aws_instance" "web" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"
  # ... other attributes ...
}
```

**2. Import existing resource:**

```bash
# Find resource ID
aws ec2 describe-instances --filters "Name=tag:Name,Values=web-server"

# Import
terraform import aws_instance.web i-1234567890abcdef0
```

**3. Reconcile configuration:**

```bash
# Plan will show attributes that don't match
terraform plan

# Update main.tf to match actual resource
# Or update resource to match main.tf
```

**4. Verify:**

```bash
terraform plan  # Should show no changes
```

**Bulk import:**

```bash
#!/bin/bash
# import-instances.sh

# Get all instance IDs
INSTANCE_IDS=$(aws ec2 describe-instances \
  --query 'Reservations[].Instances[].InstanceId' \
  --output text)

# Import each
for instance_id in $INSTANCE_IDS; do
  terraform import "aws_instance.imported[\"$instance_id\"]" "$instance_id"
done
```

**Terraform 1.5+ import blocks:**

```hcl
# Generate configuration from imports
import {
  to = aws_instance.web
  id = "i-1234567890abcdef0"
}

import {
  to = aws_security_group.web
  id = "sg-0123456789abcdef"
}
```

```bash
# Generate configuration
terraform plan -generate-config-out=imported.tf

# Review and merge
terraform apply
```

---

## State Best Practices Summary

### DO vs DON'T Patterns

#### Remote Backends

✅ **DO:**
```hcl
# Use remote backend with locking
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/vpc/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

❌ **DON'T:**
```hcl
# Local backend in production
terraform {
  backend "local" {
    path = "terraform.tfstate"  # ❌ No locking, no backup
  }
}
```

#### State Organization

✅ **DO:**
```
# Separate state per component
prod/
├── networking/terraform.tfstate
├── compute/terraform.tfstate
└── data/terraform.tfstate
```

❌ **DON'T:**
```
# Everything in one giant state
prod/terraform.tfstate  # ❌ 5000 resources, slow, risky
```

#### Sensitive Data

✅ **DO:**
```hcl
# Reference secrets externally
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/db/password"
}

resource "aws_db_instance" "main" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
}
```

❌ **DON'T:**
```hcl
# Hardcoded secrets
variable "db_password" {
  default = "password123"  # ❌ In state, in VCS
}
```

#### State Locking

✅ **DO:**
```bash
# Let Terraform handle locking
terraform apply

# If operation crashed, verify before force-unlock
ps aux | grep terraform  # Check if running
terraform force-unlock LOCK_ID  # Only if confirmed safe
```

❌ **DON'T:**
```bash
# Force-unlock without checking
terraform force-unlock LOCK_ID  # ❌ Might cause corruption
```

#### State Access

✅ **DO:**
```json
// Minimal IAM permissions
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject",
    "s3:PutObject"
  ],
  "Resource": "arn:aws:s3:::state/prod/*"
}
```

❌ **DON'T:**
```json
// Wildcard permissions
{
  "Effect": "Allow",
  "Action": "s3:*",  // ❌ Too permissive
  "Resource": "*"
}
```

### Decision Matrix: State Organization

| Scenario | Recommendation | Reasoning |
|----------|----------------|-----------|
| **Single team, <100 resources** | Single state file | Simple, low overhead |
| **Multiple teams** | State per team | Clear ownership, independent deploys |
| **Mixed update frequencies** | State per lifecycle | Deploy VPC separately from apps |
| **Production environment** | State per component | Limit blast radius |
| **Shared infrastructure** | Separate state + remote_state | Core infra stable, apps change often |
| **Development/testing** | Combined state OK | Less critical, faster to rebuild |

### Common Anti-Patterns to Avoid

❌ **Anti-Pattern 1: Manual state editing**
```bash
# DON'T manually edit state files
vim terraform.tfstate  # ❌ Likely to corrupt
```
✅ **Instead:** Use terraform state commands
```bash
terraform state mv
terraform state rm
terraform import
```

❌ **Anti-Pattern 2: Sharing state files via git**
```bash
git add terraform.tfstate  # ❌ No locking, merge conflicts
```
✅ **Instead:** Use remote backend

❌ **Anti-Pattern 3: Bypassing locks**
```bash
rm .terraform/terraform.tfstate.lock.info  # ❌ Dangerous
```
✅ **Instead:** Investigate why lock exists, then force-unlock if safe

❌ **Anti-Pattern 4: No backup strategy**
✅ **Instead:** Enable versioning, regular backups, test restore

❌ **Anti-Pattern 5: Monolithic state**
- 5000+ resources in one state
- Slow operations
- High blast radius
✅ **Instead:** Split by component/team/environment

### State Management Checklist

**Initial Setup:**
- [ ] Remote backend configured
- [ ] State locking enabled
- [ ] Encryption at rest enabled
- [ ] Access control (IAM) configured
- [ ] Versioning/backup enabled
- [ ] State file audit logging enabled

**Per Environment:**
- [ ] Separate state per environment
- [ ] Environment-specific IAM roles
- [ ] State key follows naming convention
- [ ] Backend config documented
- [ ] Disaster recovery plan documented

**Ongoing Maintenance:**
- [ ] Regular drift detection (`terraform plan`)
- [ ] State backups tested quarterly
- [ ] Unused resources removed from state
- [ ] State organization reviewed (split if needed)
- [ ] Lock timeout policy defined
- [ ] Force-unlock process documented

**Security:**
- [ ] Secrets not in variables/state (use write-only or external)
- [ ] State access restricted by IAM
- [ ] TLS enforced for state access
- [ ] State file audit log reviewed
- [ ] Encryption keys rotated regularly

**Team Collaboration:**
- [ ] State organization documented
- [ ] Cross-state dependencies mapped
- [ ] `terraform_remote_state` usage documented
- [ ] State ownership assigned
- [ ] Force-unlock policy communicated

---

## Resources

### Official Documentation
- [Terraform State](https://www.terraform.io/docs/language/state/index.html)
- [Backend Configuration](https://www.terraform.io/docs/language/settings/backends/configuration.html)
- [State Locking](https://www.terraform.io/docs/language/state/locking.html)
- [S3 Backend](https://www.terraform.io/docs/language/settings/backends/s3.html)
- [Remote State Data Source](https://www.terraform.io/docs/language/state/remote-state-data.html)

### Tools
- [Terraform State Manager (tfmask)](https://github.com/cloudposse/tfmask) - Mask sensitive output
- [Terragrunt](https://terragrunt.gruntwork.io/) - DRY backend configuration
- [Atlantis](https://www.runatlantis.io/) - Terraform automation with locking

### Best Practices Guides
- [terraform-best-practices.com - State Management](https://www.terraform-best-practices.com/state)
- [Gruntwork - How to Manage Terraform State](https://blog.gruntwork.io/how-to-manage-terraform-state-28f5697e68fa)

---

**Back to:** [Main Skill File](../SKILL.md)
