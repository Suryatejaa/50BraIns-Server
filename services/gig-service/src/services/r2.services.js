const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({
    region: 'auto',
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    endpoint: process.env.R2_ENDPOINT,
});

/**
 * Generate signed upload URL (for client to upload files directly to R2)
 * @param {string} fileName - Original file name
 * @param {string} applicationId - Application ID for path organization
 * @param {string} customKey - Optional custom key (default: review/app-id/timestamp-file)
 * @returns {Promise<{uploadUrl, publicUrl, key}>}
 */
async function getUploadUrl(fileName, applicationId, customKey = null) {
    const key = customKey || `review/${applicationId}/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour expiry
    const publicUrl = `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET_NAME}/${key}`;

    return { uploadUrl, publicUrl, key };
}

/**
 * Generate signed download URL (for client to view/play files from R2)
 * @param {string} key - File key in R2 bucket
 * @param {number} expiresIn - URL expiry time in seconds (default: 24 hours)
 * @returns {Promise<string>} - Signed download URL
 */
async function getDownloadUrl(key, expiresIn = 86400) {
    const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete file from R2
 * @param {string} key - File key to delete
 */
async function deleteFile(key) {
    const command = new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
    });

    await s3Client.send(command);
}

module.exports = { getUploadUrl, deleteFile, getDownloadUrl };
