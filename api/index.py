from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from typing import Dict, Any

from api.models.survey import GenerateRequest, SurveyResponse, QuestionType
from api.generator.pipeline import generate_responses
from api.utils.exporter import to_csv

app = FastAPI(title="SurveySensum AI Synthetic Generator API")

# Add CORS middleware to support Next.js local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "SurveySensum API is healthy"}

@app.post("/api/generate")
def generate(req: GenerateRequest):
    try:
        # Generate N responses
        responses = generate_responses(req.survey, req.n)
        
        # Calculate statistics
        stats = calculate_survey_stats(responses, req.survey)
        
        return {
            "responses": [r.model_dump() for r in responses],
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@app.post("/api/download/csv")
def download_csv(req: GenerateRequest):
    try:
        # Generate N responses
        responses = generate_responses(req.survey, req.n)
        
        # Generate CSV string
        csv_data = to_csv(responses, req.survey)
        
        # Return as downloadable file response
        filename = f"{req.survey.title.lower().replace(' ', '_')}_responses.csv"
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV Export failed: {str(e)}")

def calculate_survey_stats(responses, survey) -> Dict[str, Any]:
    """
    Calculate summary stats (NPS, CSAT, delivery, categories) based on generated answers.
    """
    total = len(responses)
    if total == 0:
        return {}
        
    # Find rating and nps question IDs
    sat_q_id = None
    nps_q_id = None
    delivery_q_id = None
    category_q_id = None
    
    for q in survey.questions:
        q_id_lower = q.id.lower()
        q_text_lower = q.text.lower()
        
        if q.type == QuestionType.rating and not sat_q_id:
            sat_q_id = q.id
        elif q.type == QuestionType.nps and not nps_q_id:
            nps_q_id = q.id
        elif q.type == QuestionType.single_choice:
            is_delivery = "delivery" in q_id_lower or "delivery" in q_text_lower or "on time" in q_text_lower or "arrive" in q_text_lower
            is_category = "category" in q_id_lower or "category" in q_text_lower or "product type" in q_text_lower or "department" in q_text_lower
            
            if is_delivery and not delivery_q_id:
                delivery_q_id = q.id
            elif is_category and not category_q_id:
                category_q_id = q.id

    # Compute metrics
    sat_sum = 0
    sat_count = 0
    
    nps_sum = 0
    nps_count = 0
    promoters = 0
    passives = 0
    detractors = 0
    
    delivery_on_time = 0
    delivery_count = 0
    
    category_counts = {}
    
    for r in responses:
        answers = r.answers
        
        # Satisfaction (CSAT) rating
        if sat_q_id and sat_q_id in answers and answers[sat_q_id] is not None:
            sat_sum += answers[sat_q_id]
            sat_count += 1
            
        # NPS
        if nps_q_id and nps_q_id in answers and answers[nps_q_id] is not None:
            score = answers[nps_q_id]
            nps_sum += score
            nps_count += 1
            if score >= 9:
                promoters += 1
            elif score >= 7:
                passives += 1
            else:
                detractors += 1
                
        # Delivery on time
        if delivery_q_id and delivery_q_id in answers and answers[delivery_q_id] is not None:
            val = str(answers[delivery_q_id]).lower()
            delivery_count += 1
            if val in ["yes", "on time", "on-time", "true"]:
                delivery_on_time += 1
                
        # Category breakdown
        if category_q_id and category_q_id in answers and answers[category_q_id] is not None:
            cat = str(answers[category_q_id])
            category_counts[cat] = category_counts.get(cat, 0) + 1

    # Calculations
    avg_sat = round(sat_sum / sat_count, 2) if sat_count > 0 else 0.0
    avg_nps = round(nps_sum / nps_count, 2) if nps_count > 0 else 0.0
    
    # NPS Score = % Promoters - % Detractors
    nps_score = 0.0
    if nps_count > 0:
        promoter_pct = (promoters / nps_count) * 100
        detractor_pct = (detractors / nps_count) * 100
        nps_score = round(promoter_pct - detractor_pct, 1)
        
    on_time_pct = round((delivery_on_time / delivery_count) * 100, 1) if delivery_count > 0 else 0.0
    
    # Fill in default category counts if not present to ensure chart doesn't break
    for cat in ["Electronics", "Clothing", "Home", "Other"]:
        if cat not in category_counts:
            category_counts[cat] = 0
            
    return {
        "avg_satisfaction": avg_sat,
        "avg_nps": avg_nps,
        "nps_score": nps_score,
        "delivery_on_time_percentage": on_time_pct,
        "category_counts": category_counts,
        "nps_counts": {
            "promoters": promoters,
            "passives": passives,
            "detractors": detractors
        }
    }
