const API_BASE_URL = "https://image.pollinations.ai/prompt/";

export async function generateMemeImage(prompt: string): Promise<string> {
    try {
      // Encode the prompt for URL safety
      const encodedPrompt = encodeURIComponent(prompt);
      const imageUrl = `${API_BASE_URL}${encodedPrompt}`;
      
      // Return the direct image URL
      return imageUrl;
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  }
export async function generateRemixImage(originalImageUrl: string): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/remix-image`, {
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