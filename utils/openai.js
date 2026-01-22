import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const extractHighlights = async (transcript) => {
  try {
    const prompt = `Analyze this YouTube video transcript and identify 3-5 key highlights that would make engaging 30-60 second shorts. Return only JSON array with start and end times in seconds and brief description.

Transcript: ${transcript}

Format: [{"start": 30, "end": 90, "description": "Brief highlight description"}, ...]`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a video analysis expert." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;
    
    // Parse the JSON response
    try {
      const highlights = JSON.parse(content);
      return highlights;
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return [];
    }
  } catch (error) {
    console.error('❌ OpenAI API error:', error);
    throw new Error('Failed to analyze video content');
  }
};