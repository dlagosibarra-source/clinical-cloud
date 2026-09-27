output "api_endpoint" {
  description = "Base URL of the API Gateway HTTP API"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "api_id" {
  description = "The ID of the API Gateway HTTP API"
  value       = aws_apigatewayv2_api.http_api.id
}

output "lambda_arn" {
  description = "The ARN of the Lambda function"
  value       = aws_lambda_function.api_handler.arn
}

output "lambda_function_name" {
  description = "The name of the Lambda function"
  value       = aws_lambda_function.api_handler.function_name
}

output "lambda_role_arn" {
  description = "The ARN of the IAM execution role for Lambda"
  value       = aws_iam_role.lambda_exec.arn
}
