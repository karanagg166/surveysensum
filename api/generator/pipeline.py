import time
from typing import List, Dict, Any
from api.models.survey import SurveyDefinition, SurveyResponse, QuestionType
from api.generator.personas import assign_personas
from api.generator.statistical import generate_structured
from api.generator.cohere_gen import batch_generate_open_text, get_fallback_comment
import concurrent.futures

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
        
    # 3. Find open-text questions and generate their answers in parallel batches of 50
    open_text_questions = [q for q in survey.questions if q.type == QuestionType.open_text]
    
    for ot_question in open_text_questions:
        batch_size = 50  # Increased from 10 to 50 to minimize number of API requests
        all_comments = [None] * n
        
        # Prepare all batches
        batches = []
        for i in range(0, n, batch_size):
            chunk = responses_data[i:i+batch_size]
            profiles = []
            for item in chunk:
                persona = item["persona"]
                answers = item["answers"]
                
                rating = 3
                nps = 7
                category = persona.get("category", "Other")
                delivery_on_time = persona.get("delivery_on_time", True)
                
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
            batches.append((i, profiles))
            
        def worker(batch_info):
            start_idx, profiles = batch_info
            try:
                comments = batch_generate_open_text(profiles, survey.title)
                return start_idx, comments
            except Exception as e:
                print(f"Error in worker thread: {e}")
                return start_idx, [get_fallback_comment(p) for p in profiles]
                
        # Run batches concurrently with a maximum total timeout of 8.0 seconds to prevent Gateway Timeout (504)
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(worker, b): b for b in batches}
            try:
                for future in concurrent.futures.as_completed(futures, timeout=8.0):
                    start_idx, comments = future.result()
                    for idx, comment in enumerate(comments):
                        if start_idx + idx < n:
                            all_comments[start_idx + idx] = comment
            except concurrent.futures.TimeoutError:
                print("Generation timed out. Using fallbacks for remaining items.")
                for future in futures:
                    future.cancel()
                    
        # Fill in fallbacks for any items that failed or timed out
        for idx in range(n):
            if all_comments[idx] is None:
                persona = responses_data[idx]["persona"]
                answers = responses_data[idx]["answers"]
                
                rating = 3
                nps = 7
                category = persona.get("category", "Other")
                delivery_on_time = persona.get("delivery_on_time", True)
                
                for q in survey.questions:
                    if q.type == QuestionType.rating and q.id in answers:
                        rating = answers[q.id]
                    elif q.type == QuestionType.nps and q.id in answers:
                        nps = answers[q.id]
                        
                profile = {
                    "respondent_id": persona["respondent_id"],
                    "archetype": persona["archetype"],
                    "rating": rating,
                    "nps": nps,
                    "category": category,
                    "delivery_on_time": delivery_on_time
                }
                all_comments[idx] = get_fallback_comment(profile)
                
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
