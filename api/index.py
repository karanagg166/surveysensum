from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from typing import Dict, Any
import numpy as np

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

    # Compute Pearson correlation between satisfaction and NPS values
    sat_vals = []
    nps_vals = []
    for r in responses:
        answers = r.answers
        sat_val = answers.get(sat_q_id) if sat_q_id else None
        nps_val = answers.get(nps_q_id) if nps_q_id else None
        if sat_val is not None and nps_val is not None:
            sat_vals.append(sat_val)
            nps_vals.append(nps_val)

    if len(sat_vals) > 1 and len(nps_vals) > 1:
        pearson_r = round(float(np.corrcoef(sat_vals, nps_vals)[0, 1]), 3)
    else:
        pearson_r = None

    # Estimate token usage
    import os
    cohere_key = os.getenv("COHERE_API_KEY")
    if cohere_key and cohere_key != "your_key_here" and cohere_key.strip():
        # Estimate: ~220 prompt tokens per response + ~35 output tokens per response
        token_usage = total * 255
    else:
        token_usage = 0

    # Calculate sentiment alignment
    aligned_count = 0
    checked_count = 0
    ot_q_id = None
    for q in survey.questions:
        if q.type == QuestionType.open_text:
            ot_q_id = q.id
            break

    if ot_q_id and sat_q_id:
        pos_words = {"love", "great", "best", "perfect", "good", "happy", "excellent", "fast", "prompt", "amazing", "satisfied", "fine", "decent", "smooth", "impressed"}
        neg_words = {"poor", "bad", "cheap", "broke", "disappointed", "late", "delayed", "slow", "wrong", "terrible", "worst", "unhelpful", "ignore", "missing", "delay", "damaged", "fail"}
        for r in responses:
            sat_val = r.answers.get(sat_q_id)
            comment = str(r.answers.get(ot_q_id) or "").lower()
            if sat_val is not None and comment:
                checked_count += 1
                words = comment.split()
                pos_count = sum(1 for w in words if any(p in w for p in pos_words))
                neg_count = sum(1 for w in words if any(n in w for n in neg_words))
                if sat_val >= 4:
                    if pos_count >= neg_count:
                        aligned_count += 1
                elif sat_val <= 2:
                    if neg_count >= pos_count:
                        aligned_count += 1
                else:
                    aligned_count += 1

    sentiment_alignment = round((aligned_count / checked_count) * 100, 1) if checked_count > 0 else 100.0

    # Calculate Delivery Conditional Probability (Complaint Accuracy)
    shipping_keywords = {"shipping", "late", "delivery", "delayed", "arrived"}
    delivery_mention_count = 0
    delivery_mention_late = 0
    if ot_q_id and delivery_q_id:
        for r in responses:
            comment = str(r.answers.get(ot_q_id) or "").lower()
            if any(k in comment for k in shipping_keywords):
                delivery_mention_count += 1
                val = str(r.answers.get(delivery_q_id, "")).lower()
                if val in ["no", "late", "delayed", "false"]:
                    delivery_mention_late += 1

    delivery_complaint_accuracy = round(
        (delivery_mention_late / delivery_mention_count) * 100, 1
    ) if delivery_mention_count > 0 else 100.0

    # Calculate Chi-Squared Fit (degrees of freedom = 3, critical value alpha=0.05 is 7.815)
    category_weights = {"Electronics": 0.30, "Clothing": 0.35, "Home": 0.25, "Other": 0.10}
    chi_square_stat = 0.0
    for cat, weight in category_weights.items():
        expected = total * weight
        observed = category_counts.get(cat, 0)
        if expected > 0:
            chi_square_stat += ((observed - expected) ** 2) / expected
    chi_sq_pass = bool(chi_square_stat < 7.815)

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
        },
        "pearson_r": pearson_r,
        "total_responses": total,
        "token_usage": token_usage,
        "sentiment_alignment": sentiment_alignment,
        "delivery_complaint_accuracy": delivery_complaint_accuracy,
        "chi_sq_pass": chi_sq_pass
    }
