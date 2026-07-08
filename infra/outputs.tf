output "ecr_repository_url" {
  description = "Amazon ECR repository URL for the application image."
  value       = aws_ecr_repository.app.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.app.name
}

output "ecs_service_name" {
  description = "ECS service name."
  value       = aws_ecs_service.app.name
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name."
  value       = aws_lb.app.dns_name
}

output "application_url" {
  description = "Public application URL."
  value       = "http://${aws_lb.app.dns_name}"
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group used by ECS containers."
  value       = aws_cloudwatch_log_group.ecs.name
}

output "cloudwatch_dashboard_name" {
  description = "CloudWatch dashboard created for the project."
  value       = aws_cloudwatch_dashboard.app.dashboard_name
}

output "alarm_topic_name" {
  description = "SNS topic used for CloudWatch alarm notifications."
  value       = aws_sns_topic.alarms.name
}

output "alarm_email_subscription_enabled" {
  description = "Shows whether email subscription was configured for alarm notifications."
  value       = var.alarm_email != ""
}
