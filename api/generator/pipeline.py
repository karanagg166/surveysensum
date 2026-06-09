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
        
    # 3. Find open-text questions and generate their answers
    # Strategy: Use Cohere API for the FIRST open-text question only (proven to
    # fit within Vercel's 60s limit). Additional open-text questions use fast
    # local fallback templates to avoid Cohere rate-limit-induced timeouts.
    open_text_questions = [q for q in survey.questions if q.type == QuestionType.open_text]
    
    if open_text_questions:
        batch_size = 50
        
        # Build per-respondent profile once (shared across all open-text questions)
        respondent_profiles = []
        for item in responses_data:
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
            respondent_profiles.append({
                "respondent_id": persona["respondent_id"],
                "archetype": persona["archetype"],
                "rating": rating,
                "nps": nps,
                "category": category,
                "delivery_on_time": delivery_on_time
            })
        
        # --- Process FIRST open-text question via Cohere API ---
        primary_ot = open_text_questions[0]
        all_comments = [None] * n
        
        batches = []
        for i in range(0, n, batch_size):
            chunk_profiles = respondent_profiles[i:i+batch_size]
            batches.append((i, chunk_profiles))
        
        def worker(batch_info):
            start_idx, profiles = batch_info
            try:
                comments = batch_generate_open_text(profiles, survey.title)
                return start_idx, comments
            except Exception as e:
                print(f"Error in worker thread: {e}")
                return start_idx, [get_fallback_comment(p) for p in profiles]
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(worker, b): b for b in batches}
            try:
                for future in concurrent.futures.as_completed(futures, timeout=25.0):
                    start_idx, comments = future.result()
                    for idx, comment in enumerate(comments):
                        if start_idx + idx < n:
                            all_comments[start_idx + idx] = comment
            except concurrent.futures.TimeoutError:
                print("Primary open-text generation timed out. Using fallbacks.")
                for future in futures:
                    future.cancel()
        
        # Fill fallbacks for any failed/timed-out items
        for idx in range(n):
            if all_comments[idx] is None:
                all_comments[idx] = get_fallback_comment(respondent_profiles[idx])
        
        # Assign to responses_data
        for idx, comment in enumerate(all_comments):
            if idx < len(responses_data):
                responses_data[idx]["answers"][primary_ot.id] = comment
        
        # --- Process ADDITIONAL open-text questions via fast fallbacks ---
        for ot_question in open_text_questions[1:]:
            for idx in range(n):
                fallback = get_fallback_comment(respondent_profiles[idx])
                if idx < len(responses_data):
                    responses_data[idx]["answers"][ot_question.id] = fallback
                
    # 4. Convert to Pydantic SurveyResponse objects
    results = []
    for item in responses_data:
        results.append(SurveyResponse(
            response_id=item["respondent_id"],
            answers=item["answers"]
        ))
        
    return results
