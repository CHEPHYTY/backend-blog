import aws from "aws-sdk";
import { nanoid } from "nanoid";

// import 
//setting up s3 bucket

const s3 = new aws.S3(
    {
        region: "ap-south-1",
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
);


const generateUploadURL = async () => {

    const date = new Date();
    const imageName = `${nanoid()}-${date.getTime()}.jpeg`;

    // return 


    return await s3.getSignedUrlPromise('putObject', {
        Bucket: 'blogging-website-react-soumya',
        Key: imageName,
        Expires: 1000,
        ContentType: "image/jpeg"
    })

}

export {
    generateUploadURL
}