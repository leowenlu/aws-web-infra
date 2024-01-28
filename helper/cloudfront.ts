import { Construct } from 'constructs';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import { SSMParameterReader } from '../../helper/ssmParameterReader';
import * as certificateManager from "aws-cdk-lib/aws-certificatemanager";

interface IProps {
  partnerName: string;
  oac: cloudfront.CfnOriginAccessControl;
  cert?: {
    ssmPath: string;
    aliases: string[];
  }
}

const ORIGIN_BUCKET_NAME = 'optimus.nothingphishy.com';

export default class webappCloudfront {
  private partnerName: string;

  constructor(scope: Construct, props: IProps) {
    const { partnerName, oac, cert } = props;
    this.partnerName = partnerName;

    let viewerCertificate;

    // generate viewerCertificate
    if (cert) {
      const { ssmPath, aliases } = cert;

      // get certificate from ssm
      const certificateArnReader = new SSMParameterReader(scope, this.renderId('CertificateArnReader'), {
        parameterName: ssmPath,
        region: 'us-east-1'
      });
      const certificate = certificateManager.Certificate.fromCertificateArn(scope, this.renderId('DomainCert'), certificateArnReader.getParameterValue());
      // 创建 ViewerCertificate 对象
      viewerCertificate = cloudfront.ViewerCertificate.fromAcmCertificate(certificate, {
        aliases,
      });
    }

    // generate cloudfront
    const distribution = new cloudfront.CloudFrontWebDistribution(scope, this.renderId('CloudFront'), this.generateCloudfrontConfig(scope, viewerCertificate));

    // rewrite origin access control id
    // https://github.com/aws/aws-cdk/issues/21771
    const cfnDistribution = distribution.node.defaultChild as cloudfront.CfnDistribution;
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.OriginAccessControlId', oac.getAtt("Id"));
  }


  renderId(name: string): string {
    return `${this.partnerName}-${name}`;
  }

  generateCloudfrontConfig(scope: Construct, viewerCertificate: cloudfront.ViewerCertificate | undefined): cloudfront.CloudFrontWebDistributionProps {
    // get optimus origin bucket
    const websiteBucket = s3.Bucket.fromBucketName(scope, this.renderId('WebsiteBucket'), ORIGIN_BUCKET_NAME);

    const config = {
      comment: `${this.partnerName} cloudfront distribution`,
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: websiteBucket,
          },
          behaviors: [
            {
              isDefaultBehavior: true,
              compress: true,
            }
          ]
        }
      ],
      errorConfigurations: [
        {
          errorCode: 403,
          responseCode: 200,
          responsePagePath: '/index.html',
          errorCachingMinTtl: 86400,
        },
        {
          errorCode: 404,
          responseCode: 200,
          responsePagePath: '/index.html',
          errorCachingMinTtl: 86400,
        }
      ],
    }

    // add ssl to cloudfront
    if (viewerCertificate) Object.assign(config, { viewerCertificate })

    return config;
  }
}