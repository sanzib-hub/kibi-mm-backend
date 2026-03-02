# jq Queries for OpenAPI Spec Manipulation

## Add AWS API Gateway Integration to All Methods

This jq query adds the `x-amazon-apigateway-integration` block to all HTTP methods in your OpenAPI specification.

### Basic jq Query

```bash
jq '
# Define the integration configuration
def integration_config:
  {
    "x-amazon-apigateway-integration": {
      "credentials": "arn:aws:iam::654654242545:role/lambdaInvokePermission",
      "payloadFormatVersion": "2.0",
      "type": "aws_proxy",
      "httpMethod": "POST",
      "uri": "arn:aws:apigateway:ap-south-1:lambda:path/2015-03-31/functions/arn:aws:lambda:ap-south-1:654654242545:function:kibi-brandcampaign-service/invocations",
      "connectionType": "INTERNET"
    }
  };

# Add integration to all HTTP methods in all paths
.paths |= with_entries(
  .value |= with_entries(
    if (.key | test("^(get|post|put|delete|patch|options|head)$")) then
      .value += integration_config
    else
      .
    end
  )
)
' openapi-spec.json > openapi-spec-aws.json
```

### Parameterized Version (Recommended)

Use variables for different services:

```bash
# BrandCampaign Service
jq --arg role_arn "arn:aws:iam::654654242545:role/lambdaInvokePermission" \
   --arg lambda_arn "arn:aws:apigateway:ap-south-1:lambda:path/2015-03-31/functions/arn:aws:lambda:ap-south-1:654654242545:function:kibi-brandcampaign-service/invocations" \
'
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

.paths |= with_entries(
  .value |= with_entries(
    if (.key | test("^(get|post|put|delete|patch|options|head)$")) then
      .value += integration_config
    else
      .
    end
  )
)
' BrandCampaign/openapi-spec.json > BrandCampaign/openapi-spec-aws.json
```

### Quick Commands for Each Service

#### OnBoarding Service (Port 4000)
```bash
jq --arg role_arn "arn:aws:iam::654654242545:role/lambdaInvokePermission" \
   --arg lambda_arn "arn:aws:apigateway:ap-south-1:lambda:path/2015-03-31/functions/arn:aws:lambda:ap-south-1:654654242545:function:kibi-onboarding-service/invocations" \
'def integration_config: {"x-amazon-apigateway-integration": {"credentials": $role_arn, "payloadFormatVersion": "2.0", "type": "aws_proxy", "httpMethod": "POST", "uri": $lambda_arn, "connectionType": "INTERNET"}}; .paths |= with_entries(.value |= with_entries(if (.key | test("^(get|post|put|delete|patch|options|head)$")) then .value += integration_config else . end))' \
OnBoarding/openapi-spec.json > OnBoarding/openapi-spec-aws.json
```

#### Events Service (Port 4001)
```bash
jq --arg role_arn "arn:aws:iam::654654242545:role/lambdaInvokePermission" \
   --arg lambda_arn "arn:aws:apigateway:ap-south-1:lambda:path/2015-03-31/functions/arn:aws:lambda:ap-south-1:654654242545:function:kibi-events-service/invocations" \
'def integration_config: {"x-amazon-apigateway-integration": {"credentials": $role_arn, "payloadFormatVersion": "2.0", "type": "aws_proxy", "httpMethod": "POST", "uri": $lambda_arn, "connectionType": "INTERNET"}}; .paths |= with_entries(.value |= with_entries(if (.key | test("^(get|post|put|delete|patch|options|head)$")) then .value += integration_config else . end))' \
Events/openapi-spec.json > Events/openapi-spec-aws.json
```

#### BrandCampaign Service (Port 4002)
```bash
jq --arg role_arn "arn:aws:iam::654654242545:role/lambdaInvokePermission" \
   --arg lambda_arn "arn:aws:apigateway:ap-south-1:lambda:path/2015-03-31/functions/arn:aws:lambda:ap-south-1:654654242545:function:kibi-brandcampaign-service/invocations" \
'def integration_config: {"x-amazon-apigateway-integration": {"credentials": $role_arn, "payloadFormatVersion": "2.0", "type": "aws_proxy", "httpMethod": "POST", "uri": $lambda_arn, "connectionType": "INTERNET"}}; .paths |= with_entries(.value |= with_entries(if (.key | test("^(get|post|put|delete|patch|options|head)$")) then .value += integration_config else . end))' \
BrandCampaign/openapi-spec.json > BrandCampaign/openapi-spec-aws.json
```

#### Payments Service (Port 4003)
```bash
jq --arg role_arn "arn:aws:iam::654654242545:role/lambdaInvokePermission" \
   --arg lambda_arn "arn:aws:apigateway:ap-south-1:lambda:path/2015-03-31/functions/arn:aws:lambda:ap-south-1:654654242545:function:kibi-payments-service/invocations" \
'def integration_config: {"x-amazon-apigateway-integration": {"credentials": $role_arn, "payloadFormatVersion": "2.0", "type": "aws_proxy", "httpMethod": "POST", "uri": $lambda_arn, "connectionType": "INTERNET"}}; .paths |= with_entries(.value |= with_entries(if (.key | test("^(get|post|put|delete|patch|options|head)$")) then .value += integration_config else . end))' \
Payments/openapi-spec.json > Payments/openapi-spec-aws.json
```

### Process All Services at Once

```bash
#!/bin/bash
# Process all services
for service in onboarding events brandcampaign payments; do
  SERVICE_UPPER=$(echo $service | sed 's/onboarding/OnBoarding/; s/events/Events/; s/brandcampaign/BrandCampaign/; s/payments/Payments/')
  
  jq --arg role_arn "arn:aws:iam::654654242545:role/lambdaInvokePermission" \
     --arg lambda_arn "arn:aws:apigateway:ap-south-1:lambda:path/2015-03-31/functions/arn:aws:lambda:ap-south-1:654654242545:function:kibi-${service}-service/invocations" \
  'def integration_config: {"x-amazon-apigateway-integration": {"credentials": $role_arn, "payloadFormatVersion": "2.0", "type": "aws_proxy", "httpMethod": "POST", "uri": $lambda_arn, "connectionType": "INTERNET"}}; .paths |= with_entries(.value |= with_entries(if (.key | test("^(get|post|put|delete|patch|options|head)$")) then .value += integration_config else . end))' \
  ${SERVICE_UPPER}/openapi-spec.json > ${SERVICE_UPPER}/openapi-spec-aws.json
  
  echo "✅ Processed $SERVICE_UPPER"
done
```

## Other Useful jq Queries

### Extract All Endpoints
```bash
jq '.paths | keys' openapi-spec.json
```

### Extract All Methods for a Specific Path
```bash
jq '.paths["/api/campaigns"] | keys' openapi-spec.json
```

### Count Total Endpoints
```bash
jq '[.paths | to_entries[] | .value | keys[]] | length' openapi-spec.json
```

### Extract All Tags
```bash
jq '[.paths[].*.tags[]] | unique' openapi-spec.json
```

### Update Server URL
```bash
jq '.servers[0].url = "https://api.production.com"' openapi-spec.json
```

### Add CORS Extension to All Methods
```bash
jq '
.paths |= with_entries(
  .value |= with_entries(
    if (.key | test("^(get|post|put|delete|patch|options|head)$")) then
      .value["x-amazon-apigateway-integration"]["responses"] = {
        "default": {
          "statusCode": "200",
          "responseParameters": {
            "method.response.header.Access-Control-Allow-Origin": "'\''*'\''"
          }
        }
      }
    else
      .
    end
  )
)
' openapi-spec.json
```

### Remove x-amazon-apigateway-integration (Revert)
```bash
jq '
.paths |= with_entries(
  .value |= with_entries(
    if (.key | test("^(get|post|put|delete|patch|options|head)$")) then
      .value | del(."x-amazon-apigateway-integration")
    else
      .
    end
  )
)
' openapi-spec-aws.json > openapi-spec.json
```

## Verification

After adding the integration, verify it was added correctly:

```bash
# Check if integration was added to a specific endpoint
jq '.paths["/api/campaigns"].get."x-amazon-apigateway-integration"' BrandCampaign/openapi-spec-aws.json

# Count how many methods have the integration
jq '[.paths[].* | select(has("x-amazon-apigateway-integration"))] | length' BrandCampaign/openapi-spec-aws.json

# List all methods with integration
jq '[.paths | to_entries[] | {path: .key, methods: [.value | to_entries[] | select(.value | has("x-amazon-apigateway-integration")) | .key]}] | .[] | select(.methods | length > 0)' BrandCampaign/openapi-spec-aws.json
```

## Notes

- The jq query only adds integration to standard HTTP methods: `get`, `post`, `put`, `delete`, `patch`, `options`, `head`
- It preserves all existing method properties and adds the integration block
- The original file is not modified; output goes to a new file with `-aws.json` suffix
- Make sure jq is installed: `brew install jq` (macOS) or `apt-get install jq` (Linux)

