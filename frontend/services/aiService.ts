const API_ENDPOINT = process.env.NEXT_PUBLIC_AI_API_ENDPOINT;

export async function generateMemeImage(prompt: string): Promise<string> {
  try {
    const response = await fetch(`${API_ENDPOINT}/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate image');
    }
    
    const data = await response.json();
    return data.imageUrl;
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}

export async function generateRemixImage(originalImageUrl: string): Promise<string> {
  try {
    const response = await fetch(`${API_ENDPOINT}/remix-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: originalImageUrl })
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate remix');
    }
    
    const data = await response.json();
    return data.imageUrl;
  } catch (error) {
    console.error('Error generating remix:', error);
    throw error;
  }
}