import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import { CfnOutput } from 'aws-cdk-lib';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class FrontenedTemplateCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const bucket = new s3.Bucket(this,'MyFrontenedBucket',{
      websiteIndexDocument: 'index.html',
      bucketName: 'FrontenedCiCdBucket',
      versioned: true,
      publicReadAccess: true
    });

    const bucketDistribution = new cloudfront.Distribution(this,'mypipelineDistribuition',{
      defaultBehavior: {origin: new origins.S3Origin(bucket)},
    })

    new s3deploy.BucketDeployment(this,'frontenedbucketdeployment',{
      sources: [s3deploy.Source.asset('../frontened/out')],
      destinationBucket: bucket,
      distribution: bucketDistribution
    });


    new CfnOutput(this,'DeployUrl',{
      value: bucketDistribution.domainName
    })



    // example resource
    // const queue = new sqs.Queue(this, 'FrontenedTemplateCdkQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
