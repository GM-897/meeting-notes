#### Website Link: https://meeting-notes-main.vercel.app/
#### Google Colab Demo: https://colab.research.google.com/drive/1BWbhKEIG9HMczS0sl8ejKHhrm-KAuziT?usp=sharing

# About Project
This project leverages AssemblyAI for multi-speaker transcription and analysis of meeting recordings. It extracts speaker-labeled dialogues, summarizes key discussions, identifies counterpoints and proposed ideas, and assigns action items with responsibilities. The system utilizes a generative model to generate structured outputs, ensuring clear meeting insights. The final result is a comprehensive, AI-powered meeting analysis for improved productivity and decision-making.

<img width="1440" alt="Screenshot 2024-12-01 at 4 23 22 PM" src="https://github.com/user-attachments/assets/522dd8e3-5589-4b89-944d-0f3d4cdebe67">
Output
<img width="1440" alt="Screenshot 2024-12-01 at 4 17 42 PM" src="https://github.com/user-attachments/assets/4420facd-c9e7-4231-9704-940cce1800d9">
<img width="1440" alt="Screenshot 2024-12-01 at 4 17 50 PM" src="https://github.com/user-attachments/assets/0d82bc2b-2537-4b3e-ae92-86bcbabfdd7d">




# Next.js Application
Follow these steps to get started:

## Prerequisites

Ensure you have *Node.js* and *npm* installed on your machine. You can download them [here](https://nodejs.org/).

## Installation
.


1. *Clone the Repository*: Clone this repository to your local machine.

   ```bash
   git clone https://github.com/GM-897/meeting-notes.git
   cd meeting-notes
   ```

2. *Install Dependencies*: Run the following command to install the project dependencies.

   ```bash
        npm install --legacy-peer-deps
   ```
   
   

3. *Set up environment variables*: Add the following key-value pair to the .env file:
   Create a .env file: In the root directory, create a new file named .env.
   ```bash
        ASSEMBLYAI_API_KEY=<your api key>
        FIREBASE_SERVICE_ACCOUNT_KEY_BASE64=<your api key>
        FIREBASE_STORAGE_BUCKET=<your api key>
   
        
   ```
   

   
3. *Start the Development Server*: Run the following command to start the development server.

   ```bash
        npm run dev
   ```

4. *Access the Application*: Open your web browser and navigate to [http://localhost:3000](http://localhost:3000).

## Usage

The application should be accessible at [http://localhost:3000](http://localhost:3000).


# Multi-Speaker Transcription Approach Using AssemblyAI

1. **Setup**: Initialize the AssemblyAI API and configure transcription settings with options like `speaker_labels`, `auto_highlights`, and `entity_detection`.

2. **Transcription**: Use `transcribe()` to process the audio and generate the transcript with speaker labels.

3. **Extract Speaker-Text Pairs**: Loop through the transcript’s utterances, store each speaker’s text in a list as `[Speaker n, text]`.

4. **Output**: The list of speaker-text pairs is ready for analysis.

---

# Meeting Analysis Process

This code utilizes multiple prompts to generate a structured analysis of meeting transcripts, including a summary, counterpoints, ideas, and action items. Below are the steps involved:

1. **Generate Meeting Summary**
   - **Objective**: Summarizes key outcomes, action items, and discussed steps from the meeting transcript.
   - **Input**: Meeting transcript (list of speaker-dialogue pairs).
   - **Output**: A JSON object containing the meeting outcomes, action items, and discussed steps.

2. **Extract Counterpoints and Ideas**
   - **Objective**: Identifies counterpoints and proposed ideas discussed but not adopted during the meeting.
   - **Input**: Meeting transcript (list of speaker-dialogue pairs).
   - **Output**: A JSON object containing counterpoints and proposed ideas.

3. **Assign Actions and Responsibilities**
   - **Objective**: Organizes action items from the meeting summary into structured tasks with responsibilities, deadlines, and importance levels.
   - **Input**: Meeting transcript (list of speaker-dialogue pairs) and action items (extracted from the meeting summary).
   - **Output**: A JSON array containing detailed task assignments (description, DRI, consulted individuals, importance, deadline).

4. **Main Function**
   - **Objective**: Calls the above functions sequentially to generate a comprehensive meeting analysis.
   - **Input**: Meeting transcript (list of speaker-dialogue pairs).
   - **Output**: A dictionary containing the meeting summary, counterpoints and ideas, and action items with responsibilities.

---

# Model Interactions

- Each function interacts with the generative model (`gemini-1.5-pro-latest`) to produce content based on the specified inputs.
- The model configurations, such as `temperature` and `top_p`, are adjusted for each task to control the output.

---


# Example Usage

```python
analyze_meeting(meeting_transcript_list)
```





