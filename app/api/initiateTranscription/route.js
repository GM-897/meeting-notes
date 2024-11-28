// app/api/initiateTranscription/route.js

import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req) {
  try {
    const { audioUrl } = await req.json();

    if (!audioUrl) {
      return NextResponse.json({ error: 'Audio URL is required.' }, { status: 400 });
    }

    const transcriptionConfig = {
      audio_url: audioUrl,
      speaker_labels: true,
      language_code: 'en_us',
      format_text: true,
      // Add other configurations as needed
    };

    const response = await axios.post('https://api.assemblyai.com/v2/transcript', transcriptionConfig, {
      headers: {
        authorization: process.env.ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    return NextResponse.json({ transcriptionId: response.data.id }, { status: 200 });
  } catch (error) {
    console.error('Error initiating transcription:', error.response?.data || error.message);
    return NextResponse.json(
      { error: error.response?.data?.error || 'Failed to initiate transcription.' },
      { status: 500 }
    );
  }
}