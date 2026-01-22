import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ytdl from 'ytdl-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractHighlights } from './openai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

ffmpeg.setFfmpegPath(ffmpegPath);

export const processYouTubeVideo = async (videoUrl, userId) => {
  const tempDir = path.join(__dirname, '../temp');
  const timestamp = Date.now();
  const videoId = ytdl.getVideoID(videoUrl);
  
  const videoPath = path.join(tempDir, `original-${timestamp}.mp4`);
  const audioPath = path.join(tempDir, `audio-${timestamp}.mp3`);
  const clipsDir = path.join(tempDir, `clips-${timestamp}`);
  
  // Create clips directory
  if (!fs.existsSync(clipsDir)) {
    fs.mkdirSync(clipsDir, { recursive: true });
  }

  try {
    console.log('📥 Downloading YouTube video...');
    
    // Download video
    await new Promise((resolve, reject) => {
      ytdl(videoUrl, { quality: 'highest' })
        .pipe(fs.createWriteStream(videoPath))
        .on('finish', resolve)
        .on('error', reject);
    });

    console.log('🎵 Extracting audio...');
    
    // Extract audio
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .audioCodec('libmp3lame')
        .toFormat('mp3')
        .output(audioPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    console.log('📝 Transcribing audio...');
    
    // Note: In production, you'd use a proper speech-to-text service
    // For this example, we'll simulate transcription
    const simulatedTranscript = `This is a simulated transcript for video ${videoId}. 
    Key segments include: Introduction at 30 seconds, main content from 60-180 seconds, 
    conclusion at 200 seconds. Important highlights are at 45s, 120s, and 180s.`;

    console.log('🔍 Analyzing highlights...');
    
    // Get highlights from OpenAI
    const highlights = await extractHighlights(simulatedTranscript);
    
    if (highlights.length === 0) {
      // Fallback: create 3 clips at 30, 60, 90 seconds
      highlights.push(
        { start: 30, end: 60, description: "Introduction" },
        { start: 60, end: 120, description: "Main content part 1" },
        { start: 120, end: 180, description: "Main content part 2" }
      );
    }

    console.log('✂️ Generating clips...');
    
    // Generate clips
    const clipPromises = highlights.map(async (highlight, index) => {
      const clipPath = path.join(clipsDir, `clip-${index + 1}.mp4`);
      
      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .setStartTime(highlight.start)
          .setDuration(highlight.end - highlight.start)
          .output(clipPath)
          .on('end', () => {
            console.log(`✅ Clip ${index + 1} created: ${clipPath}`);
            resolve({
              filename: `clip-${index + 1}.mp4`,
              path: clipPath,
              duration: highlight.end - highlight.start,
              description: highlight.description
            });
          })
          .on('error', (err) => {
            console.error(`❌ Error creating clip ${index + 1}:`, err);
            reject(err);
          })
          .run();
      });
    });

    const clips = await Promise.all(clipPromises);

    // Clean up original video and audio (keep only clips)
    try {
      fs.unlinkSync(videoPath);
      fs.unlinkSync(audioPath);
      console.log('🧹 Cleaned up temporary files');
    } catch (cleanupError) {
      console.warn('⚠️ Could not cleanup all temporary files:', cleanupError.message);
    }

    return {
      success: true,
      clips,
      message: 'Shorts generated successfully!'
    };

  } catch (error) {
    console.error('❌ Video processing error:', error);
    
    // Clean up on error
    try {
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
      if (fs.existsSync(clipsDir)) {
        fs.rmSync(clipsDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.error('❌ Error during cleanup:', cleanupError);
    }

    throw new Error(`Video processing failed: ${error.message}`);
  }
};