# Introduction
This is a CDK project to create a web application infrastructure on AWS, including:
- CloudFront
- S3
- Route53 Zone and Record
- ACM Certificate

## Prerequisites
- AWS CLI
- AWS CDK
- Node.js
- TypeScript
## Architecture

CloudFront and Certificates are in the global region, so CDK will deploy the stack to `us-east-1`, the S3 will can be deployed to any region.

## Parameters

All parameters are defined in `config/infra.yml`.

aws.region: The region to deploy the stack, the stack has S3 bucket, so it can be deployed to any region.
appCert.domainName: The domain name of the web application.
appCert.ssmParameterName: The SSM parameter name to store the certificate ARN.
appCert.subjectAlternativeNames: The subject alternative names of the certificate.

zoneS3Cloudfront.zoneName: The zone name will be created in Route53(public).
zoneS3Cloudfront.bucket: The bucket name to store the web application files.
zoneS3Cloudfront.alias: The alias of the webApp, a cname will be created in Route53 and it will be used in cloudfront.
