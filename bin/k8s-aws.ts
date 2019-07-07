#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { K8SAwsStack } from '../lib/k8s-aws-stack';

const app = new cdk.App();
new K8SAwsStack(app, 'K8SAwsStack', {env:{ region: "us-west-2"}});
