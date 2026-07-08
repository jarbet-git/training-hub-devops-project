variable "aws_region" {
  description = "AWS region used by the project."
  type        = string
  default     = "eu-central-1"
}

variable "project_name" {
  description = "Base name for AWS resources."
  type        = string
  default     = "training-hub"
}

variable "image_tag" {
  description = "Docker image tag deployed to ECS."
  type        = string
  default     = "latest"
}

variable "app_port" {
  description = "Application container port."
  type        = number
  default     = 8000
}

variable "desired_count" {
  description = "Number of ECS tasks."
  type        = number
  default     = 1
}

variable "task_cpu" {
  description = "Fargate task CPU units."
  type        = number
  default     = 512
}

variable "task_memory" {
  description = "Fargate task memory in MiB."
  type        = number
  default     = 1024
}

variable "allowed_http_cidr_blocks" {
  description = "CIDR blocks allowed to access the ALB over HTTP."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "postgres_db" {
  description = "PostgreSQL database name for the demo deployment."
  type        = string
  default     = "traininghub"
}

variable "postgres_user" {
  description = "PostgreSQL user for the demo deployment."
  type        = string
  default     = "traininghub"
}

variable "postgres_password" {
  description = "PostgreSQL password for the demo deployment."
  type        = string
  default     = "traininghub"
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT secret for the demo deployment."
  type        = string
  default     = "student-demo-change-me"
  sensitive   = true
}

locals {
  tags = {
    Project     = "Training Hub"
    Company     = "Betcloud"
    Author      = "Jaroslaw Betkowski"
    Environment = "student"
    ManagedBy   = "Terraform"
  }
}

variable "alarm_email" {
  description = "Email address used for CloudWatch alarm notifications through SNS. Keep the real value outside the repository."
  type        = string
  default     = ""
}
