from __future__ import annotations

import ast
import math
import re
from dataclasses import dataclass
from fractions import Fraction


_ALLOWED_BIN_OPS: tuple[type[ast.operator], ...] = (
    ast.Add,
    ast.Sub,
    ast.Mult,
    ast.Div,
    ast.Pow,
)
_ALLOWED_UNARY_OPS: tuple[type[ast.unaryop], ...] = (ast.UAdd, ast.USub)


@dataclass(frozen=True)
class ObjectiveVerdict:
    is_objective: bool
    is_correct: bool
    confidence: float
    reason: str


def _normalize_free_text(value: str) -> str:
    return " ".join(re.findall(r"[a-z0-9]+", (value or "").lower())).strip()


def _safe_eval_expr(expr: str) -> float | None:
    candidate = (expr or "").strip().lower()
    if not candidate:
        return None
    candidate = candidate.replace("^", "**")
    if not re.fullmatch(r"[0-9\.\+\-\*\/\(\)\s\*]+", candidate):
        return None
    try:
        node = ast.parse(candidate, mode="eval")
    except SyntaxError:
        return None
    return _eval_node(node.body)


def _eval_node(node: ast.AST) -> float | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return float(node.value)
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, _ALLOWED_UNARY_OPS):
        value = _eval_node(node.operand)
        if value is None:
            return None
        return value if isinstance(node.op, ast.UAdd) else -value
    if isinstance(node, ast.BinOp) and isinstance(node.op, _ALLOWED_BIN_OPS):
        left = _eval_node(node.left)
        right = _eval_node(node.right)
        if left is None or right is None:
            return None
        if isinstance(node.op, ast.Add):
            return left + right
        if isinstance(node.op, ast.Sub):
            return left - right
        if isinstance(node.op, ast.Mult):
            return left * right
        if isinstance(node.op, ast.Div):
            if right == 0:
                return None
            return left / right
        if isinstance(node.op, ast.Pow):
            try:
                return left ** right
            except OverflowError:
                return None
    return None


def _parse_fraction(text: str) -> float | None:
    match = re.fullmatch(r"\s*([-+]?\d+)\s*/\s*([-+]?\d+)\s*", text or "")
    if not match:
        return None
    denominator = int(match.group(2))
    if denominator == 0:
        return None
    return float(Fraction(int(match.group(1)), denominator))


def _parse_numeric_value(text: str) -> float | None:
    expr_val = _safe_eval_expr(text)
    if expr_val is not None:
        return expr_val
    frac_val = _parse_fraction(text)
    if frac_val is not None:
        return frac_val
    try:
        return float((text or "").strip())
    except ValueError:
        return None


def _is_objective_candidate(question_text: str, expected_answer: str) -> bool:
    expected = (expected_answer or "").strip()
    if not expected:
        return False
    if _parse_numeric_value(expected) is not None:
        return True
    if re.fullmatch(r"[A-Da-d]", expected):
        return True
    normalized_question = _normalize_free_text(question_text)
    if any(keyword in normalized_question for keyword in ("compute", "calculate", "simplify", "solve", "what is")):
        return True
    expected_tokens = _normalize_free_text(expected).split()
    return len(expected_tokens) <= 3


def evaluate_objective_answer(
    *,
    question_text: str,
    expected_answer: str,
    student_answer: str,
) -> ObjectiveVerdict:
    if not _is_objective_candidate(question_text, expected_answer):
        return ObjectiveVerdict(
            is_objective=False,
            is_correct=False,
            confidence=0.0,
            reason="not objective",
        )

    expected_num = _parse_numeric_value(expected_answer)
    student_num = _parse_numeric_value(student_answer)
    if expected_num is not None and student_num is not None:
        is_equal = math.isclose(expected_num, student_num, rel_tol=1e-9, abs_tol=1e-9)
        return ObjectiveVerdict(
            is_objective=True,
            is_correct=is_equal,
            confidence=0.98 if is_equal else 0.97,
            reason="numeric equivalence",
        )

    expected_norm = _normalize_free_text(expected_answer)
    student_norm = _normalize_free_text(student_answer)
    if not expected_norm or not student_norm:
        return ObjectiveVerdict(
            is_objective=True,
            is_correct=False,
            confidence=0.9,
            reason="blank objective answer",
        )
    is_exact = expected_norm == student_norm
    return ObjectiveVerdict(
        is_objective=True,
        is_correct=is_exact,
        confidence=0.95 if is_exact else 0.9,
        reason="normalized text comparison",
    )
