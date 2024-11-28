// app/api/checkTranscriptionStatus/route.js

import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req) {
  try {
    const { transcriptionId } = await req.json();

    if (!transcriptionId) {
      return NextResponse.json({ error: 'Transcription ID is required.' }, { status: 400 });
    }

    const response = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptionId}`, {
      headers: {
        authorization: process.env.ASSEMBLYAI_API_KEY,
      },
    });

    const { status, error: transcriptionError, ...rest } = response.data;

    return NextResponse.json({ status, error: transcriptionError, data: rest }, { status: 200 });
  } catch (error) {
    console.error('Error checking transcription status:', error.response?.data || error.message);
    return NextResponse.json(
      { error: error.response?.data?.error || 'Failed to check transcription status.' },
      { status: 500 }
    );
  }
}