/**
 * Object storage utilities (MinIO/S3)
 */

const Minio = require('minio');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Conditionally require AWS SDK only if using S3
let S3Client, GetObjectCommand, getSignedUrl, PutObjectCommand;
if (process.env.USE_S3 === 'true') {
    const awsSdk = require('@aws-sdk/client-s3');
    const presigner = require('@aws-sdk/s3-request-presigner');
    S3Client = awsSdk.S3Client;
    GetObjectCommand = awsSdk.GetObjectCommand;
    PutObjectCommand = awsSdk.PutObjectCommand;
    getSignedUrl = presigner.getSignedUrl;
}

let minioClient = null;
let s3Client = null;
const useS3 = process.env.USE_S3 === 'true';

/**
 * Initialize MinIO client
 */
function initMinio() {
    if (minioClient) return minioClient;
    
    if (!useS3) {
        minioClient = new Minio.Client({
            endPoint: process.env.MINIO_ENDPOINT || 'localhost',
            port: parseInt(process.env.MINIO_PORT || '9000'),
            useSSL: process.env.MINIO_USE_SSL === 'true',
            accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
            secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
        });
        
        // Ensure bucket exists
        const bucket = process.env.MINIO_BUCKET || 'cyberagiesx';
        minioClient.bucketExists(bucket).then(exists => {
            if (!exists) {
                return minioClient.makeBucket(bucket, 'us-east-1');
            }
        }).catch(err => {
            console.error('MinIO bucket check error:', err);
        });
        
        console.log('✅ MinIO client initialized');
    } else {
        // Initialize AWS S3 client
        s3Client = new S3Client({
            region: process.env.S3_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
        console.log('✅ S3 client initialized');
    }
    
    return minioClient || s3Client;
}

/**
 * Upload file to object storage
 * @param {string} objectKey - Object key/path
 * @param {Buffer|Stream} data - File data
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} Object key
 */
async function uploadObject(objectKey, data, contentType = 'application/octet-stream') {
    const client = initMinio();
    const bucket = useS3 ? (process.env.S3_BUCKET || 'cyberagiesx') : (process.env.MINIO_BUCKET || 'cyberagiesx');
    
    try {
        if (useS3) {
            await s3Client.send(new PutObjectCommand({
                Bucket: bucket,
                Key: objectKey,
                Body: data,
                ContentType: contentType,
            }));
        } else {
            await minioClient.putObject(bucket, objectKey, data, data.length, {
                'Content-Type': contentType,
            });
        }
        
        console.log(`✅ Uploaded object: ${objectKey}`);
        return objectKey;
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

/**
 * Download file from URL and upload to object storage
 * @param {string} url - Source URL
 * @param {string} objectKey - Destination object key
 * @returns {Promise<string>} Object key
 */
async function downloadAndUpload(url, objectKey) {
    try {
        const response = await axios.get(url, { responseType: 'stream' });
        const contentType = response.headers['content-type'] || 'application/octet-stream';
        
        // Convert stream to buffer
        const chunks = [];
        for await (const chunk of response.data) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        
        return await uploadObject(objectKey, buffer, contentType);
    } catch (error) {
        console.error('Download and upload error:', error);
        throw error;
    }
}

/**
 * Generate presigned URL for object access (short TTL)
 * @param {string} objectKey - Object key
 * @param {number} expirySeconds - URL expiry in seconds (default 3600)
 * @returns {Promise<string>} Presigned URL
 */
async function getPresignedUrl(objectKey, expirySeconds = 3600) {
    const client = initMinio();
    const bucket = useS3 ? (process.env.S3_BUCKET || 'cyberagiesx') : (process.env.MINIO_BUCKET || 'cyberagiesx');
    
        try {
            if (useS3 && S3Client) {
                const command = new GetObjectCommand({
                    Bucket: bucket,
                    Key: objectKey,
                });
                return await getSignedUrl(s3Client, command, { expiresIn: expirySeconds });
            } else if (minioClient) {
                return await minioClient.presignedGetObject(bucket, objectKey, expirySeconds);
            } else {
                throw new Error('Storage client not initialized');
            }
    } catch (error) {
        console.error('Presigned URL error:', error);
        throw error;
    }
}

module.exports = {
    initMinio,
    uploadObject,
    downloadAndUpload,
    getPresignedUrl
};

