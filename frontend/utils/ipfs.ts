import axios from 'axios';

const PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

export const uploadToIPFS = async (file: File) => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(PINATA_API_URL, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'pinata_api_key': process.env.NEXT_PUBLIC_PINATA_API_KEY,
                'pinata_secret_api_key': process.env.NEXT_PUBLIC_PINATA_SECRET_KEY,
            },
        });

        return `ipfs://${response.data.IpfsHash}`;
    } catch (error) {
        console.error('Error uploading to IPFS:', error);
        throw error;
    }
};