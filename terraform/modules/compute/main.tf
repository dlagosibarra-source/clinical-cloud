# ─────────────────────────────────────────────────────────────
# Minimal Skeleton Zip Archive for Initial Lambda Function
# ─────────────────────────────────────────────────────────────
data "archive_file" "placeholder" {
  type        = "zip"
  output_path = "${path.module}/placeholder.zip"

  source {
    content  = <<-EOT
      exports.handler = async (event) => {
        console.log("Clinical Cloud Gateway Request:", JSON.stringify(event));
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          },
          body: JSON.stringify({
            status: "online",
            service: "Clinical Cloud API Gateway Lambda",
            environment: process.env.NODE_ENV || "dev",
            timestamp: new Date().toISOString()
          })
        };
      };
    EOT
    filename = "index.js"
  }
}

# ─────────────────────────────────────────────────────────────
# IAM Role & Policies for Lambda Execution
# ─────────────────────────────────────────────────────────────
resource "aws_iam_role" "lambda_exec" {
  name_prefix = "${var.project_name}-${var.environment}-lambda-role-"
  description = "Execution role for ${var.project_name} API Lambda functions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-lambda-role"
  })
}

resource "aws_iam_role_policy_attachment" "basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "vpc" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_policy" "secrets" {
  count       = var.db_secret_arn != "" ? 1 : 0
  name_prefix = "${var.project_name}-${var.environment}-secrets-policy-"
  description = "Allows Lambda function to read database credentials from Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = ["secretsmanager:GetSecretValue"]
        Effect   = "Allow"
        Resource = [var.db_secret_arn]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "secrets" {
  count      = var.db_secret_arn != "" ? 1 : 0
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.secrets[0].arn
}

# ─────────────────────────────────────────────────────────────
# CloudWatch Log Group for Lambda
# ─────────────────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-api-handler"
  retention_in_days = 14

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-lambda-logs"
  })
}

# ─────────────────────────────────────────────────────────────
# Lambda Function: Backend API Handler
# ─────────────────────────────────────────────────────────────
resource "aws_lambda_function" "api_handler" {
  function_name = "${var.project_name}-${var.environment}-api-handler"
  description   = "Base API handler for ${var.project_name} in ${var.environment}"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  architectures = ["arm64"] # AWS Graviton2 for superior cost-performance

  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  timeout     = 30
  memory_size = 512

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.lambda_security_group_id]
  }

  environment {
    variables = {
      NODE_ENV     = var.environment
      PROJECT_NAME = var.project_name
    }
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-api-handler"
  })

  depends_on = [
    aws_cloudwatch_log_group.lambda,
    aws_iam_role_policy_attachment.basic,
    aws_iam_role_policy_attachment.vpc
  ]
}

# ─────────────────────────────────────────────────────────────
# API Gateway HTTP API (v2)
# ─────────────────────────────────────────────────────────────
resource "aws_apigatewayv2_api" "http_api" {
  name          = "${var.project_name}-${var.environment}-http-api"
  protocol_type = "HTTP"
  description   = "HTTP API Gateway fronting ${var.project_name} backend services"

  cors_configuration {
    allow_headers = ["*"]
    allow_methods = ["*"]
    allow_origins = ["*"]
    max_age       = 300
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-http-api"
  })
}

resource "aws_cloudwatch_log_group" "api_gw" {
  name              = "/aws/apigateway/${var.project_name}-${var.environment}-http-api"
  retention_in_days = 14

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-apigw-logs"
  })
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-default-stage"
  })
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api_handler.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}
