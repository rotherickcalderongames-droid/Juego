import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const apiKey = process.env.GEMINI_API_KEY;

async function testAvatarGen() {
  console.log('Testing Avatar Generation using Gemini API key:', apiKey ? `${apiKey.slice(0, 10)}...` : 'None');
  if (!apiKey) {
    console.error('No Gemini API key found in .env');
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;
  const prompt = `A highly-detailed cyberpunk profile avatar headshot of a non-binary operator, digital pixel art style, glowing cybernetic implants, neon highlights, dark background, centered portrait, premium aesthetic.`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"]
        }
      })
    });

    console.log('HTTP Status:', response.status);
    if (!response.ok) {
      const text = await response.text();
      console.error('Failed response:', text);
      return;
    }

    const data: any = await response.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData && p.inlineData.mimeType && p.inlineData.mimeType.startsWith('image/'));

    if (imagePart && imagePart.inlineData.data) {
      console.log('SUCCESS! Generated avatar image data length:', imagePart.inlineData.data.length);
    } else {
      console.log('No image part found in the API response. Parts:', JSON.stringify(parts, null, 2));
    }
  } catch (error: any) {
    console.error('Error during avatar generation test:', error);
  }
}

testAvatarGen();
