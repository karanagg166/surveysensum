import os
import json
import time
import cohere
from typing import List, Dict, Any

# Fallback templates in case of API failures or missing key
FALLBACKS_LOW = [
    "The delivery was late and the package was damaged when it arrived. Very disappointed.",
    "The product quality is extremely poor. It feels cheap and broke after the first use.",
    "Customer service was completely unhelpful when I asked about my delayed shipping.",
    "The sizes are completely wrong compared to the size chart. I have to return everything.",
    "Terrible experience. The website crashed during checkout and my order was delayed.",
    "Not worth the price. I expected much better quality and speed for what I paid.",
    "Highly disappointed with this purchase. The item looks nothing like the pictures.",
    "I've been waiting for weeks and the delivery was late. The support team ignored my emails.",
    "The item arrived with missing parts. Had to go through a long return process.",
    "Poor packaging and late arrival. I will not be ordering from here again."
]

FALLBACKS_MID = [
    "Decent product, but the delivery took longer than expected. It's okay.",
    "The quality is fine, but it is a bit overpriced for what it is. Average experience.",
    "Shipping was on time, but the product is just average. Nothing special.",
    "The website is easy to use, but the sizing runs slightly small. Average quality.",
    "Satisfactory service, though I think the packaging could be improved.",
    "Everything went fine, but nothing really stood out to make me a loyal customer.",
    "Good range of items, but some of the popular stuff is always out of stock.",
    "It's decent. Not great, but not bad either. Just average overall.",
    "The checkout was smooth, but product descriptions could be more detailed.",
    "Fair experience. Product is okay, shipping was reasonable."
]

FALLBACKS_HIGH = [
    "Absolutely loved the purchase! High quality and arrived faster than expected.",
    "Super fast delivery and the item fits perfectly. Will definitely buy again!",
    "Great customer service and very easy return process. Highly recommended!",
    "The quality of the material is amazing. Exceeded all my expectations.",
    "Seamless checkout process and excellent product. Very happy customer!",
    "Everything was perfect from start to finish. 5 stars all the way!",
    "Love this store! They always deliver on time and products are always top tier.",
    "Highly impressed with the prompt shipping and the item looks fantastic.",
    "Best online shopping experience I've had in a long time. Highly recommend!",
    "Excellent value for money. Very satisfied with the quick delivery and service."
]

def get_fallback_comment(profile: Dict[str, Any]) -> str:
    """
    Get a context-aware fallback comment based on satisfaction rating.
    """
    import random
    rating = profile.get("rating", 3)
    
    # Select pool based on rating
    if rating <= 2:
        pool = FALLBACKS_LOW
        # If it was a delivery issue specifically, customize a bit
        if not profile.get("delivery_on_time", True):
            delivery_comments = [c for c in pool if "delivery" in c.lower() or "shipping" in c.lower() or "late" in c.lower()]
            if delivery_comments:
                pool = delivery_comments
    elif rating == 3:
        pool = FALLBACKS_MID
    else:
        pool = FALLBACKS_HIGH
        if profile.get("delivery_on_time", True):
            fast_comments = [c for c in pool if "fast" in c.lower() or "prompt" in c.lower() or "time" in c.lower()]
            if fast_comments:
                pool = fast_comments
                
    return random.choice(pool)

def batch_generate_open_text(profiles: List[Dict[str, Any]], survey_title: str) -> List[str]:
    """
    Generate open-text comments for a batch of profiles using Cohere v2.
    Each profile contains archetype, category, rating, nps, delivery_on_time.
    Returns a list of comments of the same length as profiles.
    """
    api_key = os.getenv("COHERE_API_KEY")
    
    # If API key is missing or is the placeholder, use fallbacks directly
    if not api_key or api_key == "your_key_here" or api_key.strip() == "":
        return [get_fallback_comment(p) for p in profiles]
        
    try:
        client = cohere.ClientV2(api_key=api_key, timeout=12.0)
        
        # Prepare the profile info to pass to Cohere
        compact_profiles = []
        for p in profiles:
            compact_profiles.append({
                "id": p["respondent_id"],
                "archetype": p["archetype"],
                "purchased_category": p["category"],
                "overall_satisfaction_1to5": p["rating"],
                "nps_score_0to10": p["nps"],
                "delivery_status": "On Time" if p["delivery_on_time"] else "Late/Delayed"
            })
            
        prompt = f"""You are a synthetic response generator for the survey: "{survey_title}".
Based on the following {len(profiles)} respondent profiles, generate a realistic, coherent, and highly natural open-text feedback comment for each customer.

Requirements:
1. Return EXACTLY a JSON array of strings containing {len(profiles)} elements.
2. The order of comments must correspond EXACTLY to the order of the profiles.
3. Write in a highly natural, human voice. Vary the tone:
   - "Promoter" profiles with high satisfaction should be happy, glowing, or highlighting what they liked.
   - "Detractor" profiles with low satisfaction should be frustrated, complaining about specific issues (like late delivery if marked, or product quality).
   - "Passive" profiles should be lukewarm or constructive.
   - "Mixed" profiles should mention something good and something bad.
4. Keep feedback concise (1 to 3 sentences, maximum 45 words per comment).
5. Do NOT include markdown blocks, JSON labels, backticks, or any conversational text. Return only the raw valid JSON list of strings.

Respondent Profiles:
{json.dumps(compact_profiles, indent=2)}
"""

        response = client.chat(
            model="command-r-08-2024",
            messages=[{"role": "user", "content": prompt}]
        )
        
        # Parse the JSON response
        text_content = ""
        if response.message and response.message.content:
            if isinstance(response.message.content, list):
                text_content = response.message.content[0].text
            else:
                text_content = response.message.content
                
        # Clean text in case Cohere added code blocks ```json ... ```
        text_content = text_content.strip()
        if text_content.startswith("```json"):
            text_content = text_content[7:]
        if text_content.startswith("```"):
            text_content = text_content[3:]
        if text_content.endswith("```"):
            text_content = text_content[:-3]
        text_content = text_content.strip()
        
        comments = json.loads(text_content)
        
        if isinstance(comments, list) and len(comments) == len(profiles):
            return [str(c) for c in comments]
        else:
            # Fallback if list size mismatch or invalid format
            return [get_fallback_comment(p) for p in profiles]
            
    except Exception as e:
        print(f"Error calling Cohere API: {e}. Falling back to statistical templates.")
        # Fallback to local templates
        return [get_fallback_comment(p) for p in profiles]
