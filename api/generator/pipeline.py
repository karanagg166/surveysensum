import time
from typing import List, Dict, Any
from api.models.survey import SurveyDefinition, SurveyResponse, QuestionType
from api.generator.personas import assign_personas
from api.generator.statistical import generate_structured
from api.generator.cohere_gen import batch_generate_open_text

def generate_responses(survey: SurveyDefinition, n: int) -> List[SurveyResponse]:
    """
    Generate N realistic responses for the given survey definition.
    """
    # 1. Assign personas to the N respondents
    personas = assign_personas(n)
    
    # Initialize response dicts
    responses_data = []
    
    # 2. Generate structured answers (rating, nps, single_choice) for all respondents
    for persona in personas:
        answers = {}
        # Iterate questions in order to build context
        for question in survey.questions:
            if question.type != QuestionType.open_text:
                val = generate_structured(persona, question, answers)
                answers[question.id] = val
            else:
                # Placeholder for open text
                answers[question.id] = ""
                
        responses_data.append({
            "respondent_id": persona["respondent_id"],
            "persona": persona,
            "answers": answers
        })
        
    # 3. Find open-text questions and generate their answers in batches of 10
    open_text_questions = [q for q in survey.questions if q.type == QuestionType.open_text]
    
    for ot_question in open_text_questions:
        # We need to batch-generate comments for all N respondents
        batch_size = 10
        all_comments = []
        
        for i in range(0, n, batch_size):
            chunk = responses_data[i:i+batch_size]
            
            # Prepare profiles for this chunk
            profiles = []
            for item in chunk:
                persona = item["persona"]
                answers = item["answers"]
                
                # Try to find rating, nps, and delivery status in answers
                # If they are not found, we use defaults
                rating = 3
                nps = 7
                category = persona.get("category", "Other")
                delivery_on_time = persona.get("delivery_on_time", True)
                
                # Extract rating and nps from answers
                for q in survey.questions:
                    if q.type == QuestionType.rating and q.id in answers:
                        rating = answers[q.id]
                    elif q.type == QuestionType.nps and q.id in answers:
                        nps = answers[q.id]
                
                profiles.append({
                    "respondent_id": persona["respondent_id"],
                    "archetype": persona["archetype"],
                    "rating": rating,
                    "nps": nps,
                    "category": category,
                    "delivery_on_time": delivery_on_time
                })
                
            # Generate comments for this batch of 10
            comments = batch_generate_open_text(profiles, survey.title)
            all_comments.extend(comments)
            
            # Small rate-limit delay
            if i + batch_size < n:
                time.sleep(0.1)
                
        # Assign comments back to responses_data
        for idx, comment in enumerate(all_comments):
            if idx < len(responses_data):
                responses_data[idx]["answers"][ot_question.id] = comment
                
    # 4. Convert to Pydantic SurveyResponse objects
    results = []
    for item in responses_data:
        results.append(SurveyResponse(
            response_id=item["respondent_id"],
            answers=item["answers"]
        ))
        
    return results
