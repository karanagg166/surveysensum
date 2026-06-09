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
    # IMPORTANT: Process ALL open-text questions in a single shared thread pool
    # with one timeout budget to avoid Vercel's 60-second function timeout.
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
        
        # Prepare ALL batches for ALL open-text questions together
        # Each job is (question_id, batch_start_idx, profiles_slice)
        all_jobs = []
        for ot_question in open_text_questions:
            for i in range(0, n, batch_size):
                chunk_profiles = respondent_profiles[i:i+batch_size]
                all_jobs.append((ot_question.id, i, chunk_profiles))
        
        # Results dict: { question_id: [comment_or_None, ...] }
        ot_results = {q.id: [None] * n for q in open_text_questions}
        
        def worker(job):
            q_id, start_idx, profiles = job
            try:
                comments = batch_generate_open_text(profiles, survey.title)
                return q_id, start_idx, comments
            except Exception as e:
                print(f"Error in worker thread for {q_id}: {e}")
                return q_id, start_idx, [get_fallback_comment(p) for p in profiles]
        
        # Single shared timeout of 25 seconds for ALL open-text generation
        # (well under Vercel's 60s limit, leaving room for stats calculation)
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(worker, job): job for job in all_jobs}
            try:
                for future in concurrent.futures.as_completed(futures, timeout=25.0):
                    q_id, start_idx, comments = future.result()
                    for idx, comment in enumerate(comments):
                        if start_idx + idx < n:
                            ot_results[q_id][start_idx + idx] = comment
            except concurrent.futures.TimeoutError:
                print("Open-text generation timed out. Using fallbacks for remaining items.")
                for future in futures:
                    future.cancel()
        
        # Fill in fallbacks for any items that failed or timed out
        for ot_question in open_text_questions:
            q_id = ot_question.id
            for idx in range(n):
                if ot_results[q_id][idx] is None:
                    ot_results[q_id][idx] = get_fallback_comment(respondent_profiles[idx])
            
            # Assign comments back to responses_data
            for idx in range(n):
                if idx < len(responses_data):
                    responses_data[idx]["answers"][q_id] = ot_results[q_id][idx]
                
    # 4. Convert to Pydantic SurveyResponse objects
    results = []
    for item in responses_data:
        results.append(SurveyResponse(
            response_id=item["respondent_id"],
            answers=item["answers"]
        ))
        
    return results
