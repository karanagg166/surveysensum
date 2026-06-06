from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class QuestionType(str, Enum):
    rating = "rating"
    nps = "nps"
    single_choice = "single_choice"
    open_text = "open_text"

class Question(BaseModel):
    id: str = Field(..., description="Unique identifier for the question")
    type: QuestionType = Field(..., description="Type of the question")
    text: str = Field(..., description="The actual question text")
    scale: Optional[int] = Field(None, description="Max scale (e.g. 5 for rating, 10 for nps)")
    options: Optional[List[str]] = Field(None, description="Options for single_choice question")

class SurveyDefinition(BaseModel):
    title: str = Field(..., description="Survey title")
    questions: List[Question] = Field(..., description="List of questions in the survey")

class GenerateRequest(BaseModel):
    survey: SurveyDefinition = Field(..., description="The survey structure definition")
    n: int = Field(200, ge=1, le=500, description="Number of responses to generate")

class SurveyResponse(BaseModel):
    response_id: str = Field(..., description="Unique response ID")
    answers: Dict[str, Any] = Field(..., description="Map of question ID to the respondent's answer")
