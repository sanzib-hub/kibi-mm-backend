#!/bin/bash

# Script to add AWS API Gateway Lambda integration to all methods in OpenAPI specs
# Usage: ./add-aws-integration.sh <service-name> <lambda-function-arn>

SERVICE_NAME=${1:-"kibi-service"}
LAMBDA_ARN=${2:-"arn:aws:lambda:ap-south-1:654654242545:function:kibi-${SERVICE_NAME}/invocations"}
ROLE_ARN=${3:-"arn:aws:iam::654654242545:role/lambdaInvokePermission"}

echo "Adding AWS API Gateway integration for: $SERVICE_NAME"
echo "Lambda ARN: $LAMBDA_ARN"
echo "Role ARN: $ROLE_ARN"

# jq query to add x-amazon-apigateway-integration to all methods
JQ_QUERY='
# Define the integration object template
def integration_config:
  {
    "x-amazon-apigateway-integration": {
      "credentials": $role_arn,
      "payloadFormatVersion": "2.0",
      "type": "aws_proxy",
      "httpMethod": "POST",
      "uri": $lambda_arn,
      "connectionType": "INTERNET"
    }
  };

# Walk through all paths and methods, adding the integration config
.paths |= with_entries(
  .value |= with_entries(
    # Only process HTTP method keys (get, post, put, delete, patch, options, head)
    if (.key | test("^(get|post|put|delete|patch|options|head)$")) then
      .value += integration_config
    else
      .
    end
  )
)
'

# Export variables for jq
export ROLE_ARN="$ROLE_ARN"
export LAMBDA_ARN="$LAMBDA_ARN"

# Process each service's OpenAPI spec
for service in OnBoarding Events BrandCampaign Payments; do
  INPUT_FILE="${service}/openapi-spec.json"
  OUTPUT_FILE="${service}/openapi-spec-aws.json"
  
  if [ -f "$INPUT_FILE" ]; then
    echo "Processing $INPUT_FILE..."
    
    # Apply jq transformation with variables
    jq --arg role_arn "$ROLE_ARN" \
       --arg lambda_arn "arn:aws:apigateway:ap-south-1:lambda:path/2015-03-31/functions/arn:aws:lambda:ap-south-1:654654242545:function:kibi-$(echo $service | tr '[:upper:]' '[:lower:]')-service/invocations" \
       "$JQ_QUERY" \
       "$INPUT_FILE" > "$OUTPUT_FILE"
    
    if [ $? -eq 0 ]; then
      echo "✅ Created $OUTPUT_FILE"
    else
      echo "❌ Error processing $INPUT_FILE"
    fi
  else
    echo "⚠️  File not found: $INPUT_FILE"
  fi
done

echo ""
echo "Done! AWS-integrated specs created with '-aws.json' suffix"
echo "Original files preserved without modification"

