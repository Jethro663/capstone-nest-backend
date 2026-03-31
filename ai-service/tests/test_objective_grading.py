import unittest

from app.objective_grading import evaluate_objective_answer


class ObjectiveGradingTests(unittest.TestCase):
    def test_negative_one_power_four_equivalence(self) -> None:
        verdict = evaluate_objective_answer(
            question_text="What is -1 multiplied by itself 4 times?",
            expected_answer="1",
            student_answer="1",
        )
        self.assertTrue(verdict.is_objective)
        self.assertTrue(verdict.is_correct)
        self.assertGreaterEqual(verdict.confidence, 0.95)

    def test_fraction_equivalence(self) -> None:
        verdict = evaluate_objective_answer(
            question_text="Simplify the fraction",
            expected_answer="1/2",
            student_answer="2/4",
        )
        self.assertTrue(verdict.is_objective)
        self.assertTrue(verdict.is_correct)


if __name__ == "__main__":
    unittest.main()
