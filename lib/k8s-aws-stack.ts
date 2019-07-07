import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import autoscaling = require('@aws-cdk/aws-autoscaling');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import { SubnetType, AmazonLinuxEdition, AmazonLinuxImage, GenericLinuxImage } from '@aws-cdk/aws-ec2';
import { ManagedPolicy } from '@aws-cdk/aws-iam';

export class K8SAwsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // config  
    const KeyPair = "oregon-dcp-sw"
    const VPCName = "KubernetesVPC"
    const ASGK8sMaster = "KubernetesMasterASG"
    const ASGK8sWorker = "KubernetesWorkerASG"

    const AMI_Master = new AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE
    })

    const Ubuntu184 = new ec2.GenericLinuxImage({
      'us-west-2': 'ami-07b4f3c02c7f83d59',
    });


    const vpc = new ec2.Vpc(this, VPCName, {
      cidr: '10.100.0.0/16',
      natGateways: 1
    })

    const asgMaster = new autoscaling.AutoScalingGroup(this, ASGK8sMaster, {
      vpc: vpc,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
      machineImage: Ubuntu184,
      associatePublicIpAddress: true,
      desiredCapacity: 1,
      keyName: KeyPair
    })

    // Attach SSM role
    asgMaster.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonEC2RoleforSSM"))



    const nlbM = new elbv2.NetworkLoadBalancer(this, "NLBMaster", {
      crossZoneEnabled: true,
      internetFacing: true,
      vpc: vpc
    })

    const listerMaster = nlbM.addListener("Listner", {
      port: 443,
      protocol: elbv2.Protocol.TCP
    })

    listerMaster.addTargets("K8sMasters", {
      port: 6443,
      targets: [asgMaster]
    })


    const asgWorker = new autoscaling.AutoScalingGroup(this, ASGK8sWorker, {
      vpc: vpc,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      associatePublicIpAddress: true,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
      machineImage: Ubuntu184,
      keyName: KeyPair,
      desiredCapacity: 2
    })

    // Attach SSM role
    asgWorker.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonEC2RoleforSSM"))

    const sg = new ec2.SecurityGroup(this, "SGK8S", {
      allowAllOutbound: true,
      description: "Security Group for Kubernetes Instances",
      securityGroupName: "SG-K8S",
      vpc: vpc
    })
  }
}
