import * as cdk from 'aws-cdk-lib';
import {SecretValue} from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { CfnOutput } from 'aws-cdk-lib';
import { LinuxBuildImage } from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class FrontenedTemplateCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const bucket = new s3.Bucket(this,'MyFrontenedBucket',{
      websiteIndexDocument: 'index.html',
      bucketName: 'frontened-ci-cd-bucket',
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
    });

    const s3build = new codebuild.Project(this,'FrontentedPipelineProject',{
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install:{
            "runtime-versions": {
              "nodejs": 14
            },
            commands:[
              'cd frontened',
              'npm ci'
            ],
          },
          build: {
            commands: [
              'npm run export'
            ],
          },
        },
        artifacts: {
          "base-directory": './frontened/out',
          "files":[
            '**/*'
          ] 
        },
      }),
      environment:{
        buildImage: LinuxBuildImage.STANDARD_5_0
      }
    })


    // s3build.addToRolePolicy(role);

    const inputArtifact = new codepipeline.Artifact();
    
    const outputArtifact = new codepipeline.Artifact();



    const myPipeline = new codepipeline.Pipeline(this,'fjdsk',{
      pipelineName: 'FrontenedPipeline',
      crossAccountKeys: false,
    });

    
    
    const sourceStage = myPipeline.addStage({
      stageName: 'Github_Source',
      actions: [
        new codepipeline_actions.GitHubSourceAction({
        actionName: 'GitHub_Source',
        owner: 'Code-With-TalhaBhai',
        repo: 'AWS_Frontened_Codepipeline',
        oauthToken: SecretValue.secretsManager('my-github-secret-token'),
        output: inputArtifact,
        branch: 'main',
      })
      ],
    })


    const buildStage = myPipeline.addStage({
      stageName: 'Build_Stage',
      actions: [
        new codepipeline_actions.CodeBuildAction({
        actionName: 'Build_Action',
        project: s3build,
        input: inputArtifact,
        outputs: [outputArtifact]
      })
      ]
    });

    const deployStage = myPipeline.addStage({
      stageName: 'DeployStage',
      actions: [
        new codepipeline_actions.S3DeployAction({
        actionName: 'S3Deploy',
        bucket: bucket,
        input: outputArtifact
      })]
    })


  }
}
