import pandas as pd
from typing import List
from api.models.survey import SurveyResponse, SurveyDefinition

def to_csv(responses: List[SurveyResponse], survey: SurveyDefinition) -> str:
    """
    Convert a list of SurveyResponse objects into a CSV string using Pandas.
    """
    # Build raw records
    records = []
    for resp in responses:
        row = {"response_id": resp.response_id}
        # Flat dict representation of answers
        row.update(resp.answers)
        records.append(row)
        
    df = pd.DataFrame(records)
    
    # Order columns starting with response_id, followed by questions in order of survey definition
    ordered_cols = ["response_id"]
    for q in survey.questions:
        if q.id in df.columns:
            ordered_cols.append(q.id)
            
    # Include any extra columns that might be present but not in questions (sanity check)
    for col in df.columns:
        if col not in ordered_cols:
            ordered_cols.append(col)
            
    df = df[ordered_cols]
    
    # Return raw CSV string
    return df.to_csv(index=False)
