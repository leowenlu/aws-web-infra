import * as cdk from 'aws-cdk-lib';
import { UsInfraStack } from '../lib/us-infra';
import { WebAppStack } from '../lib/web-app';
// account id get from environment variable
const accountId = process.env.AWS_ACCOUNT_ID;
const app = new cdk.App();

new WebAppStack(app, 'webapp-stack');
new UsInfraStack(app, 'us-infra-stack', {
  env: { account: accountId, region: 'us-east-1' },
});