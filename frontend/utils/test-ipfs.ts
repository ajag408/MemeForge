require('dotenv').config({ path: '.env.local' });
const { uploadToIPFS } = require('./ipfs');

async function testPinataConnection() {
    try {
        // Verify env variables are loaded
        if (!process.env.NEXT_PUBLIC_PINATA_API_KEY || !process.env.NEXT_PUBLIC_PINATA_SECRET_KEY) {
            throw new Error('Pinata API keys not found in environment variables');
        }

        // Create a test file
        const testBlob = new Blob(['Hello MemeForge'], { type: 'text/plain' });
        const testFile = new File([testBlob], 'test.txt', { type: 'text/plain' });
        
        const ipfsHash = await uploadToIPFS(testFile);
        console.log('Pinata Connection Successful! IPFS Hash:', ipfsHash);
        return true;
    } catch (error) {
        console.error('Pinata Connection Failed:', error);
        return false;
    }
}

testPinataConnection();