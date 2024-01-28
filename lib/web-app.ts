import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { InfraConfig } from "../helper/readInfraConfig";

export class WebAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const infraConfig = new InfraConfig("config/infra.yml");
    const zones = infraConfig.getConfig('zoneS3Cloudfront');

    zones.forEach((hostZone: any) => {
      // bucket will be a website
      // default object will be index.html
      // error object will be error.html
      
      const bucket = new s3.Bucket(this, `bucket-${hostZone.bucket}`, {
        bucketName: `${hostZone.bucket}`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        // websiteIndexDocument: 'index.html',
        // websiteErrorDocument: 'error.html',
        objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
        // blockPublicAccess: new s3.BlockPublicAccess({ 
        //   blockPublicAcls: false,
        //   blockPublicPolicy: false,
        //   ignorePublicAcls: false,
        //   restrictPublicBuckets: false,
        // }), // restrictPublicBuckets: true is the default
        // publicReadAccess: true,
        // // accessControl: s3.BucketAccessControl.PUBLIC_READ,
        // cors: [
        //   {
        //     allowedMethods: [s3.HttpMethods.GET],
        //     allowedOrigins: [`https://${hostZone.bucket}`, `https://www.${hostZone.bucket}`],
        //     allowedHeaders: ['*'],
        //   },
        // ],
      });
      // add bucket policy to allow cloudfront to access the bucket
      // https://docs.aws.amazon.com/cdk/api/latest/docs/aws-s3-readme.html#granting-permission-to-cloudfront-origin-access-identity
      bucket.addToResourcePolicy(new iam.PolicyStatement({
        actions: ['s3:GetObject','s3:List*'],
        resources: [bucket.arnForObjects('*'), bucket.bucketArn],
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
      }));

      // Cross-origin resource sharing (CORS) for all domains which also www
    });
  }
}
