import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";
import { InfraConfig } from "../helper/readInfraConfig";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import * as s3 from "aws-cdk-lib/aws-s3";

/**
 * This stack creates:
 * - cloudfront
 * - acm certs
 * - route53 zone and records
 */

export class UsInfraStack extends cdk.Stack {
  public readonly certificateArn: string;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const infraConfig = new InfraConfig("config/infra.yml");
    const webAppConfig = infraConfig.getConfig();
    const certificate = new acm.Certificate(this, "Cert", {
      domainName: webAppConfig.appCert.domainName,
      subjectAlternativeNames: webAppConfig.appCert.subjectAlternativeNames,
      // Looks like dns records are not created automatically
      validation: acm.CertificateValidation.fromDnsMultiZone(
        infraConfig.getConfig("hosted-zones")
      ),
    });
    this.certificateArn = certificate.certificateArn;
    // save to ssm parameter store
    new StringParameter(this, "portal-cert-arn", {
      parameterName: webAppConfig.appCert.ssmParameterName,
      description: "Cloud Web App Certificate ARN.",
      stringValue: certificate.certificateArn,
    });

    const oac = new cloudfront.CfnOriginAccessControl(this, "cloudfront-OAC", {
      originAccessControlConfig: {
        name: "OAC",
        originAccessControlOriginType: "s3",
        signingBehavior: "always",
        signingProtocol: "sigv4",
      },
    });

    webAppConfig.zoneS3Cloudfront.forEach((hostZone: any) => {
      let domainNames: string[] = [];
      if (hostZone.alias) {
        hostZone.alias.forEach((alias: string) => {
          domainNames.push(`${hostZone.alias}.${hostZone.zoneName}`);

        });
      }
      domainNames.push(hostZone.zoneName);
      const bucketArn = `arn:aws:s3:::${hostZone.zoneName}`;
      const s3BucketSource = s3.Bucket.fromBucketAttributes(
        this,
        `bucket-source-${hostZone.zoneName}`, {
          bucketArn,
          region: webAppConfig.aws.region,
        });
      const distribution = new cloudfront.CloudFrontWebDistribution(
        this,
        `cloudfront-${hostZone.zoneName}`,
        {
          priceClass: cloudfront.PriceClass.PRICE_CLASS_100,

          originConfigs: [
            {
              s3OriginSource: {
                s3BucketSource,
              },
              behaviors: [
                {
                  isDefaultBehavior: true,
                  compress: true,
                  allowedMethods:
                    cloudfront.CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
                },
              ],
            },
          ],
          errorConfigurations: [
            {
              errorCode: 403,
              responseCode: 200,
              responsePagePath: "/index.html",
              errorCachingMinTtl: 86400,
            },
            {
              errorCode: 404,
              responseCode: 200,
              responsePagePath: "/index.html",
              errorCachingMinTtl: 86400,
            },
          ],
          viewerCertificate:
            cloudfront.ViewerCertificate.fromAcmCertificate(certificate,{
              securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
              aliases: domainNames, 
            }),
          defaultRootObject: "index.html",
          comment: `${hostZone.zoneName} - CloudFront Distribution`,
        }
      );
      const cfnDistribution = distribution.node
        .defaultChild as cloudfront.CfnDistribution;
      cfnDistribution.addPropertyOverride(
        "DistributionConfig.Origins.0.OriginAccessControlId",
        oac.getAtt("Id")
      );

      const hostZoneRecord = new route53.PublicHostedZone(
        this,
        hostZone.zoneName,
        {
          zoneName: hostZone.zoneName,
        }
      );

      new route53.ARecord(this, `ARecord-${hostZone.zoneName}`, {
        zone: hostZoneRecord,
        target: route53.RecordTarget.fromAlias(
          new targets.CloudFrontTarget(distribution)
        ),
      });

      if (hostZone.alias)
        hostZone.alias.forEach((alias: string) => {
          new route53.CnameRecord(this, `cname-${alias}-${hostZone.zoneName}`, {
            zone: hostZoneRecord,
            domainName: distribution.distributionDomainName,
            recordName: `${hostZone.alias}.${hostZone.zoneName}`,
          });
        });
    });
  }
}
