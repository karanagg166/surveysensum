import unittest
import numpy as np
from api.generator.personas import assign_personas
from api.generator.statistical import generate_structured
from api.models.survey import Question, QuestionType

class TestSurveyGenerator(unittest.TestCase):

    def setUp(self):
        # Set a fixed random seed for reproducible tests
        np.random.seed(42)
        
        # Define mock questions for tests
        self.rating_question = Question(
            id="q_sat",
            type=QuestionType.rating,
            text="How satisfied are you?",
            scale=5
        )
        
        self.nps_question = Question(
            id="q_nps",
            type=QuestionType.nps,
            text="How likely are you to recommend us?",
            scale=10
        )

    def test_detractor_persona_produces_low_satisfaction(self):
        """Test that Detractor personas consistently produce rating <= 2"""
        # Detractor configuration: sat_mean = 1.6, sat_std = 0.5
        detractor_persona = {
            "respondent_id": "resp_test_1",
            "archetype": "Detractor",
            "sat_mean": 1.6,
            "sat_std": 0.5,
            "nps_boost": -2,
            "delivery_prob": 0.45,
            "delivery_on_time": True,
            "category": "Electronics"
        }
        
        ratings = []
        for _ in range(100):
            val = generate_structured(detractor_persona, self.rating_question, {})
            ratings.append(val)
            
        mean_rating = np.mean(ratings)
        # Verify detractor mean is low (expected sat_mean is 1.6)
        self.assertLessEqual(mean_rating, 2.5)
        # Verify rating bounds (1-5)
        for r in ratings:
            self.assertTrue(1 <= r <= 5)

    def test_nps_bounds_and_correlation(self):
        """Test that NPS value is always within 0-10 bounds and correlates with satisfaction"""
        personas = assign_personas(100)
        
        for p in personas:
            # Generate satisfaction first
            sat_val = generate_structured(p, self.rating_question, {})
            context = {self.rating_question.id: sat_val}
            
            # Generate NPS
            nps_val = generate_structured(p, self.nps_question, context)
            
            # Assert NPS is within bounds 0-10
            self.assertTrue(0 <= nps_val <= 10)
            
            # Assert detractor/low sat leads to low NPS, promoter/high sat to high NPS
            if sat_val <= 2:
                # Low satisfaction should generally yield lower NPS scores
                self.assertLessEqual(nps_val, 7)
            elif sat_val == 5:
                # High satisfaction (5) should yield high NPS scores
                self.assertGreaterEqual(nps_val, 6)

    def test_late_delivery_reduces_satisfaction(self):
        """Test that late delivery reduces satisfaction mean"""
        # Create base persona config
        on_time_persona = {
            "respondent_id": "resp_test_on_time",
            "archetype": "Mixed",
            "sat_mean": 3.5,
            "sat_std": 0.5,
            "nps_boost": 0,
            "delivery_prob": 0.70,
            "delivery_on_time": True,
            "category": "Home"
        }
        
        late_persona = on_time_persona.copy()
        late_persona["delivery_on_time"] = False
        
        on_time_ratings = [generate_structured(on_time_persona, self.rating_question, {}) for _ in range(100)]
        late_ratings = [generate_structured(late_persona, self.rating_question, {}) for _ in range(100)]
        
        mean_on_time = np.mean(on_time_ratings)
        mean_late = np.mean(late_ratings)
        
        # Verify late delivery significantly degrades satisfaction mean
        self.assertGreater(mean_on_time, mean_late)
        self.assertGreaterEqual(mean_on_time - mean_late, 0.8) # Expect drop of ~1.5 adjusted by bounds
