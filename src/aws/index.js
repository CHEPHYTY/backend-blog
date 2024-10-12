import aws from "aws-sdk";

//setting up s3 bucket

const s3 = new aws.S3(
    {
        region: "ap-south-1",
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
);
