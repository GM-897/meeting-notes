from flask import Flask, request, jsonify
import typing
import json
import google.generativeai as genai
from functools import wraps
import typing
from dataclasses import dataclass
from dotenv import load_dotenv
import os


app = Flask(__name__)

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
print("GEMINI_API_KEY:", GEMINI_API_KEY)
# Ensure the API key for the Gemini model is set as an environment variable
genai.api_key = GEMINI_API_KEY

# Error handler decorator
def handle_errors(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({
                'error': str(e),
                'status': 'error'
            }), 500
    return wrapper

# Input validation function
def validate_meeting_transcript(transcript):
    if not isinstance(transcript, list):
        raise ValueError("Meeting transcript must be a list")
    
    for entry in transcript:
        if not isinstance(entry, list) or len(entry) != 2:
            raise ValueError("Each transcript entry must be a list with [speaker, text]")
        if not isinstance(entry[0], str) or not isinstance(entry[1], str):
            raise ValueError("Speaker and text must be strings")
    
    return True


genai.api_key = GEMINI_API_KEY

def generate_meeting_summary(meeting_transcript: typing.List[typing.List[str]]) -> str:
    transcript = " ".join([entry[1] for entry in meeting_transcript])
    
    instruction = """
    "Your role is to generate a concise, outcome-focused summary of a meeting transcript.\n"
    """
    
    model = genai.GenerativeModel("gemini-1.5-pro-latest")
    
    prompt = f"""
    Transcript: "{transcript}"
    Given a transcript of a meeting with multiple participants, generate a detailed summary in valid JSON format within 20 words.
    Use the following JSON structure:

    {{
        "meeting_outcomes": "Summarize key points, decisions, and conclusions reached during the meeting",
        "discuss_steps": "Highlight the main topics and steps discussed",
        "action_items": "List any clear and measurable actions to be taken with responsible parties, if mentioned"
    }}

    """

    response = model.generate_content(
        [instruction, prompt],
        generation_config=genai.GenerationConfig(
            # temperature=0.3,
            # top_p=0.8,
            response_mime_type="application/json"
        )
    )
    
    return response.text

def extract_counterpoints_and_ideas(
    meeting_transcript: typing.List[typing.List[str]], 
    conclusions: str,
) -> str:
    transcript = " ".join([entry[1] for entry in meeting_transcript])
    
    instruction = """
    Identify counterpoints and alternative ideas following this JSON structure:
    {
        "counterpoints": ["point1", "point2", ...],
        "proposed_ideas": ["idea1", "idea2", ...]
    }
    Focus on objections and ideas not pursued, including rationale when available.
    """
    
    model = genai.GenerativeModel("gemini-1.5-pro-latest")
    
    prompt = f"""
    Extract counterpoints and alternative ideas from this transcript:
    
    {transcript}
    
    Related conclusions: {conclusions}
    
    Provide:
    1. Counterpoints discussed leading to the conclusions
    2. Proposed ideas that weren't pursued (with rationale if mentioned)
    """
    
    response = model.generate_content(
        [instruction, prompt],
        generation_config=genai.GenerationConfig(
            temperature=0.3,
            top_p=0.8,
            response_mime_type="application/json"
        )
    )
    
    return response.text

def assign_actions_and_responsibilities(
    meeting_transcript: typing.List[typing.List[str]], 
    action_items: list[str]
) -> str:
    transcript = " ".join([entry[1] for entry in meeting_transcript])
    
    instruction = """
    You must return a valid JSON array of action items. Each action item must follow this exact structure:
    [
        {
            "description": "action description",
            "DRI": "responsible person",
            "C": ["consulted person1", "consulted person2"],
            "I": ["informed person1", "informed person2"],
            "Importance": "H",
            "Deadline": "DD/MM/YYYY"
        }
    ]
    Do not include any additional text or explanations in the response, only the JSON array.
    """
    
    prompt = f"""
    Based on this transcript and action items, create detailed action assignments:

    TRANSCRIPT:
    {transcript}

    ACTION ITEMS:
    {json.dumps(action_items)}

    Return ONLY a JSON array where each action item has:
    - description: The action item text
    - DRI: Single person directly responsible
    - C: Array of consulted persons
    - I: Array of informed persons
    - Importance: "H", "M", or "L"
    - Deadline: Date in DD/MM/YYYY format or empty string if no deadline
    """
    
    model = genai.GenerativeModel("gemini-1.5-pro-latest")
    response = model.generate_content(
        [instruction, prompt],
        generation_config=genai.GenerationConfig(
            temperature=0.2,
            top_p=0.8,
            response_mime_type="application/json"
        )
    )
    
    return response.text

def analyze_meeting(meeting_transcript_list: typing.List[typing.List[str]]) -> dict:
    """
    Main function to perform complete meeting analysis
    """
    try:
        # Generate meeting summary
        summary = generate_meeting_summary(meeting_transcript_list)
        print("Meeting Summary generated successfully")
        
        # Parse summary to get action items
        summary_dict = json.loads(summary)
        action_items = summary_dict.get("action_items", [])
        
        # Extract counterpoints and ideas
        analysis = extract_counterpoints_and_ideas(meeting_transcript_list, conclusions=summary)
        print("Counterpoints and ideas extracted successfully")
        
        # Assign actions and responsibilities
        actions = assign_actions_and_responsibilities(meeting_transcript_list, action_items)
        print("Actions and responsibilities assigned")
        
        # Return raw responses
        return {
            "summary": summary,
            "analysis": analysis,
            "actions": actions
        }
        
    except Exception as e:
        print(f"Error during meeting analysis: {str(e)}")
        raise


# API Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'Meeting analysis API is running'
    })

@app.route('/api/analyze-meeting', methods=['POST'])
@handle_errors
def analyze_meeting_endpoint():
    # Get JSON data from request
    data = request.get_json()
    print(data);
    
    if not data or 'transcript' not in data:
        return jsonify({
            'error': 'Missing meeting transcript',
            'status': 'error'
        }), 400
    
    # Validate input
    try:
        validate_meeting_transcript(data['transcript'])
    except ValueError as e:
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 400
    
    # Process meeting analysis
    results = analyze_meeting(data['transcript'])
    
    # Parse JSON strings into dictionaries for cleaner response
    try:
        summary_dict = json.loads(results['summary'])
        analysis_dict = json.loads(results['analysis'])
        actions_dict = json.loads(results['actions'])
        
        return jsonify({
            'status': 'success',
            'data': {
                'summary': summary_dict,
                'analysis': analysis_dict,
                'actions': actions_dict
            }
        })
    except json.JSONDecodeError as e:
        return jsonify({
            'error': f'Error parsing results: {str(e)}',
            'status': 'error',
            'raw_results': results
        }), 500

@app.route('/api/docs', methods=['GET'])
def api_documentation():
    return jsonify({
        'endpoints': {
            '/api/health': {
                'method': 'GET',
                'description': 'Check if the API is running'
            },
            '/api/analyze-meeting': {
                'method': 'POST',
                'description': 'Analyze a meeting transcript',
                'request_body': {
                    'transcript': [
                        ['speaker_name', 'speaker_text'],
                        # ... more entries
                    ]
                },
                'response_format': {
                    'status': 'success/error',
                    'data': {
                        'summary': 'meeting summary object',
                        'analysis': 'analysis object',
                        'actions': 'actions object'
                    }
                }
            },
            '/api/docs': {
                'method': 'GET',
                'description': 'Get API documentation'
            }
        }
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
