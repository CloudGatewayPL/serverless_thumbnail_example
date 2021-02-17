const AWS = require('aws-sdk');
const util = require('util');
const sharp = require('sharp');

// get reference to S3 client
const s3 = new AWS.S3();
const width  = 200;

const validate = (srcKey) => {

    // Infer the image type from the file suffix.
    const typeMatch = srcKey.match(/\.([^.]*)$/);
    if (!typeMatch) {
        console.log("Could not determine the image type.");
        return false;
    }

    // Check that the image type is supported
    const imageType = typeMatch[1].toLowerCase();
    if (imageType != "jpg" && imageType != "png") {
        console.log(`Unsupported image type: ${imageType}`);
        return false;
    }
    return true
}

const fetch = async (srcBucket, srcKey) => {
    const params = {
        Bucket: srcBucket,
        Key: srcKey
    };
    return await s3.getObject(params).promise();
}

const upload = async (dstBucket, dstKey, buffer) =>{
    const destparams = {
        Bucket: dstBucket,
        Key: dstKey,
        Body: buffer,
        ContentType: "image"
    };

    const putResult = await s3.putObject(destparams).promise();
}
const resize = async (body) => await sharp(body).resize(width).toBuffer()



exports.handler = async (event, context, callback) => {
    // Read options from the event parameter.
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
    const srcBucket = event.Records[0].s3.bucket.name;
    // Object key may have spaces or unicode non-ASCII characters.
    const srcKey    = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    const dstBucket = srcBucket + "-resized";
    const dstKey    = "resized-" + srcKey;

    if (!validate(srcKey)) return;

    // Upload the thumbnail image to the destination bucket
    try {
        let orgImg = await fetch(srcBucket, srcKey)
        let buffer = await resize(orgImg.Body);
        await upload(dstBucket, dstKey, buffer)

    } catch (error) {
        console.log(error);
        return;
    }

    console.log('Successfully resized ' + srcBucket + '/' + srcKey +
      ' and uploaded to ' + dstBucket + '/' + dstKey);
};
