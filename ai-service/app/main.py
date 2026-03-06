"""
Nexora AI Service – FastAPI application.

All authentication is handled by the NestJS backend proxy.
User context is forwarded via X-User-Id, X-User-Email, X-User-Roles headers.
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid

from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Query
from sqlalchemy import text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .database import get_db
from . import ollama_client
from .extraction_pipeline import run_extraction
from .schemas import (
    ApplyExtractionRequest,
    ChatRequest,
    ExtractRequest,
    RequestUser,
    UpdateExtractionRequest,
)

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(title="Nexora AI Service", version="1.0.0")

# ---------------------------------------------------------------------------
# JAKIPIR System Prompt
# ---------------------------------------------------------------------------

JAKIPIR_SYSTEM_PROMPT = """You are J.A.K.I.P.I.R — Just-in-time Adaptive Knowledge Instructor & Personalized Intelligence Resource. Your nickname is "Ja".

You are the AI Mentor of Nexora, a Learning Management System for Gat Andres Bonifacio High School (Grades 7–10, Philippines DepEd curriculum).

PERSONALITY:
- You have a perceptive, detective-like demeanor. You notice patterns, pick up on clues in what students say, and investigate their learning gaps like a case to be cracked.
- Use investigative language naturally: "I notice...", "That's an interesting clue...", "Let's piece this together...", "I've been observing your progress and...", "The evidence suggests..."
- You are a hype coach at heart — you genuinely celebrate student effort and achievements. You get excited about breakthroughs. But you maintain formality and professionalism.
- Be warm, supportive, and encouraging, but never condescending. Speak at a high school level.
- When a student is struggling, be empathetic and frame challenges as mysteries to solve together.

RULES:
1. ALWAYS end your response with a study tip or learning strategy under the heading "📌 Ja's Study Tip:". The tip should be practical and relevant to the conversation topic.
2. NEVER give direct answers to test or assessment questions. Instead, guide students with hints, analogies, and step-by-step reasoning.
3. When a student shares progress or success, celebrate it enthusiastically but professionally — like a detective who just cracked a big case.
4. Keep responses concise — aim for 2-4 paragraphs max, plus the study tip.
5. If the student greets you or asks who you are, introduce yourself briefly: "I'm Ja — your AI Mentor here at Nexora! Think of me as your personal learning detective. I'm here to help you crack the case on any topic you're studying."
6. If you don't know something or the question is outside academics, say so honestly and redirect to academic topics.
7. Use Filipino cultural context when appropriate (e.g., referencing DepEd subjects, local examples) but respond in English unless the student writes in Filipino."""


# ---------------------------------------------------------------------------
# Dependency: Extract user context from proxy headers
# ---------------------------------------------------------------------------


def get_current_user(
    x_user_id: str = Header(...),
    x_user_email: str = Header(...),
    x_user_roles: str = Header(...),
) -> RequestUser:
    return RequestUser(
        id=x_user_id,
        email=x_user_email,
        roles=x_user_roles.split(","),
    )


# ---------------------------------------------------------------------------
# POST /chat
# ---------------------------------------------------------------------------


@app.post("/chat")
async def chat(
    body: ChatRequest,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chat_session_id = body.session_id or str(uuid.uuid4())

    ollama_messages: list[dict[str, str]] = [
        {"role": "system", "content": JAKIPIR_SYSTEM_PROMPT},
    ]

    # Load conversation history if session exists
    if body.session_id:
        rows = await db.execute(
            sa_text(
                "SELECT input_text, output_text FROM ai_interaction_logs "
                "WHERE user_id = :uid AND session_id = :sid "
                "AND session_type = 'mentor_chat' "
                "ORDER BY created_at DESC LIMIT 20"
            ),
            {"uid": user.id, "sid": body.session_id},
        )
        history = list(rows.mappings())
        history.reverse()
        for entry in history:
            ollama_messages.append({"role": "user", "content": entry["input_text"]})
            ollama_messages.append({"role": "assistant", "content": entry["output_text"]})

    ollama_messages.append({"role": "user", "content": body.message})

    health = await ollama_client.is_available()
    import time

    start = time.time()

    if health["available"]:
        try:
            reply = await ollama_client.chat(ollama_messages)
            model_used = ollama_client.get_model_name()
        except Exception as err:
            logger.warning("Ollama chat failed: %s", str(err))
            reply = (
                "Hmm, it seems my investigation tools are temporarily offline "
                "— like a detective without a magnifying glass! 🔍 Please try again "
                "in a moment. In the meantime, review your notes — that's always a solid lead!\n\n"
                "📌 Ja's Study Tip: While waiting, try writing down one thing you learned "
                "today. It helps lock it into memory!"
            )
            model_used = "fallback (ollama-unavailable)"
    else:
        logger.info("Ollama unavailable for chat — returning fallback")
        reply = (
            "I'm currently recharging my detective instincts — Ollama (my brain!) "
            "isn't running right now. Ask your teacher to start it up, and I'll be "
            "right back on the case! 🕵️\n\n"
            "📌 Ja's Study Tip: Use this downtime to quiz yourself on what you studied "
            "last. Self-testing is one of the most powerful study techniques!"
        )
        model_used = "fallback (ollama-offline)"

    response_time_ms = int((time.time() - start) * 1000)

    # Log interaction
    await db.execute(
        sa_text(
            "INSERT INTO ai_interaction_logs "
            "(user_id, session_type, input_text, output_text, model_used, "
            "response_time_ms, session_id, context_metadata) "
            "VALUES (:userId, 'mentor_chat', :inputText, :outputText, "
            ":modelUsed, :responseTimeMs, :sessionId, :ctx::jsonb)"
        ),
        {
            "userId": user.id,
            "inputText": body.message[:2000],
            "outputText": reply[:5000],
            "modelUsed": model_used,
            "responseTimeMs": response_time_ms,
            "sessionId": chat_session_id,
            "ctx": json.dumps({"sessionId": chat_session_id}),
        },
    )
    await db.commit()

    return {
        "success": True,
        "message": "Ja responded",
        "data": {
            "reply": reply,
            "sessionId": chat_session_id,
            "modelUsed": model_used,
        },
    }


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------


@app.get("/health")
async def health():
    status = await ollama_client.is_available()
    return {
        "success": True,
        "message": "AI health status",
        "data": {
            "ollamaAvailable": status["available"],
            "configuredModel": ollama_client.get_model_name(),
            "availableModels": status["models"],
        },
    }


# ---------------------------------------------------------------------------
# POST /extract
# ---------------------------------------------------------------------------


@app.post("/extract", status_code=202)
async def extract_module(
    body: ExtractRequest,
    background_tasks: BackgroundTasks,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import os

    # Validate file exists
    row = await db.execute(
        sa_text(
            "SELECT id, file_path, class_id, teacher_id, original_name "
            "FROM uploaded_files WHERE id = :id AND deleted_at IS NULL"
        ),
        {"id": body.file_id},
    )
    file = row.mappings().first()
    if not file:
        raise HTTPException(404, f'File "{body.file_id}" not found or deleted')

    is_admin = "admin" in user.roles
    if not is_admin and str(file["teacher_id"]) != user.id:
        raise HTTPException(403, "You can only extract your own files")

    file_path = file["file_path"]
    if not os.path.isabs(file_path):
        file_path = os.path.join(settings.upload_dir, file_path)
    if not os.path.exists(file_path):
        raise HTTPException(404, "Physical file not found on server")

    # Create extraction record
    result = await db.execute(
        sa_text(
            "INSERT INTO extracted_modules "
            "(file_id, class_id, teacher_id, raw_text, extraction_status, progress_percent) "
            "VALUES (:fileId, :classId, :teacherId, '', 'pending', 0) "
            "RETURNING id"
        ),
        {"fileId": file["id"], "classId": file["class_id"], "teacherId": user.id},
    )
    await db.commit()
    extraction_id = result.scalar_one()

    # Run extraction in background
    async def _run():
        from .database import AsyncSessionLocal

        async with AsyncSessionLocal() as bg_db:
            await run_extraction(bg_db, extraction_id, body.file_id, user.id)

    background_tasks.add_task(asyncio.ensure_future, _run())

    return {
        "success": True,
        "message": "Extraction queued — poll GET /extractions/:id/status for progress",
        "data": {
            "extractionId": extraction_id,
            "status": "pending",
        },
    }


# ---------------------------------------------------------------------------
# GET /extractions/:id/status
# ---------------------------------------------------------------------------


@app.get("/extractions/{extraction_id}/status")
async def get_extraction_status(
    extraction_id: str,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.execute(
        sa_text(
            "SELECT id, extraction_status, progress_percent, total_chunks, "
            "processed_chunks, error_message, model_used, is_applied, "
            "updated_at, teacher_id "
            "FROM extracted_modules WHERE id = :id"
        ),
        {"id": extraction_id},
    )
    extraction = row.mappings().first()
    if not extraction:
        raise HTTPException(404, f'Extraction "{extraction_id}" not found')

    is_admin = "admin" in user.roles
    if not is_admin and str(extraction["teacher_id"]) != user.id:
        raise HTTPException(403, "You can only view your own extractions")

    return {
        "success": True,
        "message": f"Extraction is {extraction['extraction_status']}",
        "data": {
            "id": extraction["id"],
            "status": extraction["extraction_status"],
            "progressPercent": extraction["progress_percent"],
            "totalChunks": extraction["total_chunks"],
            "processedChunks": extraction["processed_chunks"],
            "errorMessage": extraction["error_message"],
            "modelUsed": extraction["model_used"],
            "isApplied": extraction["is_applied"],
            "updatedAt": str(extraction["updated_at"]) if extraction["updated_at"] else None,
        },
    }


# ---------------------------------------------------------------------------
# GET /extractions
# ---------------------------------------------------------------------------


@app.get("/extractions")
async def list_extractions(
    class_id: str = Query(..., alias="classId"),
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    is_admin = "admin" in user.roles
    if is_admin:
        query = (
            "SELECT e.id, e.class_id, e.teacher_id, e.extraction_status, "
            "e.progress_percent, e.total_chunks, e.processed_chunks, "
            "e.error_message, e.model_used, e.is_applied, e.created_at, "
            "e.updated_at, f.id AS file_id, f.original_name, f.mime_type, "
            "f.size_bytes "
            "FROM extracted_modules e "
            "LEFT JOIN uploaded_files f ON e.file_id = f.id "
            "WHERE e.class_id = :classId "
            "ORDER BY e.created_at DESC"
        )
        params = {"classId": class_id}
    else:
        query = (
            "SELECT e.id, e.class_id, e.teacher_id, e.extraction_status, "
            "e.progress_percent, e.total_chunks, e.processed_chunks, "
            "e.error_message, e.model_used, e.is_applied, e.created_at, "
            "e.updated_at, f.id AS file_id, f.original_name, f.mime_type, "
            "f.size_bytes "
            "FROM extracted_modules e "
            "LEFT JOIN uploaded_files f ON e.file_id = f.id "
            "WHERE e.class_id = :classId AND e.teacher_id = :teacherId "
            "ORDER BY e.created_at DESC"
        )
        params = {"classId": class_id, "teacherId": user.id}

    rows = await db.execute(sa_text(query), params)
    data = [dict(r) for r in rows.mappings()]

    return {
        "success": True,
        "message": f"Found {len(data)} extraction(s)",
        "data": data,
    }


# ---------------------------------------------------------------------------
# GET /extractions/:id
# ---------------------------------------------------------------------------


@app.get("/extractions/{extraction_id}")
async def get_extraction(
    extraction_id: str,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.execute(
        sa_text(
            "SELECT e.*, f.id AS file_id, f.original_name "
            "FROM extracted_modules e "
            "LEFT JOIN uploaded_files f ON e.file_id = f.id "
            "WHERE e.id = :id"
        ),
        {"id": extraction_id},
    )
    extraction = row.mappings().first()
    if not extraction:
        raise HTTPException(404, f'Extraction "{extraction_id}" not found')

    is_admin = "admin" in user.roles
    if not is_admin and str(extraction["teacher_id"]) != user.id:
        raise HTTPException(403, "You can only view your own extractions")

    return {
        "success": True,
        "message": "Extraction details",
        "data": dict(extraction),
    }


# ---------------------------------------------------------------------------
# PATCH /extractions/:id
# ---------------------------------------------------------------------------


@app.patch("/extractions/{extraction_id}")
async def update_extraction(
    extraction_id: str,
    body: UpdateExtractionRequest,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.execute(
        sa_text(
            "SELECT id, extraction_status, is_applied, teacher_id "
            "FROM extracted_modules WHERE id = :id"
        ),
        {"id": extraction_id},
    )
    extraction = row.mappings().first()
    if not extraction:
        raise HTTPException(404, f'Extraction "{extraction_id}" not found')

    is_admin = "admin" in user.roles
    if not is_admin and str(extraction["teacher_id"]) != user.id:
        raise HTTPException(403, "You can only view your own extractions")

    if extraction["extraction_status"] != "completed":
        raise HTTPException(
            400,
            f'Extraction is "{extraction["extraction_status"]}" — only completed extractions can be edited',
        )
    if extraction["is_applied"]:
        raise HTTPException(400, "This extraction has already been applied and cannot be edited")

    structured_content = {
        "title": body.title or "",
        "description": body.description or "",
        "lessons": [
            {
                "title": l.title,
                "description": l.description or "",
                "blocks": [
                    {
                        "type": b.type,
                        "order": b.order,
                        "content": b.content,
                        "metadata": b.metadata or {},
                    }
                    for b in l.blocks
                ],
            }
            for l in body.lessons
        ],
    }

    await db.execute(
        sa_text(
            "UPDATE extracted_modules "
            "SET structured_content = :sc::jsonb, updated_at = NOW() "
            "WHERE id = :id"
        ),
        {"sc": json.dumps(structured_content), "id": extraction_id},
    )
    await db.commit()

    # Re-fetch
    return await get_extraction(extraction_id, user, db)


# ---------------------------------------------------------------------------
# POST /extractions/:id/apply
# ---------------------------------------------------------------------------


@app.post("/extractions/{extraction_id}/apply", status_code=201)
async def apply_extraction(
    extraction_id: str,
    body: ApplyExtractionRequest,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.execute(
        sa_text(
            "SELECT id, extraction_status, is_applied, teacher_id, "
            "class_id, structured_content "
            "FROM extracted_modules WHERE id = :id"
        ),
        {"id": extraction_id},
    )
    extraction = row.mappings().first()
    if not extraction:
        raise HTTPException(404, f'Extraction "{extraction_id}" not found')

    is_admin = "admin" in user.roles
    if not is_admin and str(extraction["teacher_id"]) != user.id:
        raise HTTPException(403, "You can only view your own extractions")

    if extraction["extraction_status"] != "completed":
        raise HTTPException(400, f'Extraction is "{extraction["extraction_status"]}" — only completed extractions can be applied')
    if extraction["is_applied"]:
        raise HTTPException(400, "This extraction has already been applied")

    content = extraction["structured_content"]
    if isinstance(content, str):
        content = json.loads(content)
    if not content or not content.get("lessons"):
        raise HTTPException(400, "No lessons found in extraction result")

    all_lessons = content["lessons"]

    if body.lesson_indices:
        invalid = [i for i in body.lesson_indices if i < 0 or i >= len(all_lessons)]
        if invalid:
            raise HTTPException(
                400,
                f"Invalid lesson indices: {invalid}. Valid range: 0–{len(all_lessons) - 1}",
            )
        lessons_to_apply = [(all_lessons[i], i) for i in body.lesson_indices]
    else:
        lessons_to_apply = [(l, i) for i, l in enumerate(all_lessons)]

    class_id = extraction["class_id"]

    # Check class exists
    cls_row = await db.execute(
        sa_text("SELECT id FROM classes WHERE id = :id"),
        {"id": class_id},
    )
    if not cls_row.first():
        raise HTTPException(404, f'Class "{class_id}" not found')

    # Get last lesson order
    order_row = await db.execute(
        sa_text(
            'SELECT "order" FROM lessons WHERE class_id = :cid ORDER BY "order" DESC LIMIT 1'
        ),
        {"cid": class_id},
    )
    last_order_val = order_row.scalar()
    lesson_order = (last_order_val or 0) + 1

    created_lessons: list[dict] = []

    for lesson_data, _ in lessons_to_apply:
        result = await db.execute(
            sa_text(
                'INSERT INTO lessons (title, description, class_id, "order", is_draft, source_extraction_id) '
                "VALUES (:title, :desc, :classId, :order, true, :extractionId) "
                "RETURNING id, title"
            ),
            {
                "title": lesson_data.get("title", f"Lesson {lesson_order}"),
                "desc": lesson_data.get("description", ""),
                "classId": class_id,
                "order": lesson_order,
                "extractionId": extraction_id,
            },
        )
        new_lesson = result.mappings().first()
        lesson_order += 1

        blocks = lesson_data.get("blocks", [])
        for idx, block in enumerate(blocks):
            valid_types = {"text", "image", "video", "question", "file", "divider"}
            block_type = block.get("type", "text")
            if block_type not in valid_types:
                block_type = "text"

            await db.execute(
                sa_text(
                    'INSERT INTO lesson_content_blocks (lesson_id, type, "order", content, metadata) '
                    "VALUES (:lessonId, :type, :order, :content::jsonb, :metadata::jsonb)"
                ),
                {
                    "lessonId": new_lesson["id"],
                    "type": block_type,
                    "order": block.get("order", idx),
                    "content": json.dumps(block.get("content", {})),
                    "metadata": json.dumps(block.get("metadata", {})),
                },
            )

        created_lessons.append({"id": new_lesson["id"], "title": new_lesson["title"]})

    # Mark extraction as applied
    await db.execute(
        sa_text(
            "UPDATE extracted_modules "
            "SET is_applied = true, extraction_status = 'applied', updated_at = NOW() "
            "WHERE id = :id"
        ),
        {"id": extraction_id},
    )
    await db.commit()

    return {
        "success": True,
        "message": f"Created {len(created_lessons)} lesson(s) from extraction",
        "data": {
            "classId": class_id,
            "extractionId": extraction_id,
            "lessonsCreated": len(created_lessons),
            "totalLessonsAvailable": len(all_lessons),
            "lessons": created_lessons,
        },
    }


# ---------------------------------------------------------------------------
# DELETE /extractions/:id
# ---------------------------------------------------------------------------


@app.delete("/extractions/{extraction_id}")
async def delete_extraction(
    extraction_id: str,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.execute(
        sa_text(
            "SELECT id, is_applied, teacher_id FROM extracted_modules WHERE id = :id"
        ),
        {"id": extraction_id},
    )
    extraction = row.mappings().first()
    if not extraction:
        raise HTTPException(404, f'Extraction "{extraction_id}" not found')

    is_admin = "admin" in user.roles
    if not is_admin and str(extraction["teacher_id"]) != user.id:
        raise HTTPException(403, "You can only delete your own extractions")

    if extraction["is_applied"]:
        raise HTTPException(400, "Cannot delete an extraction that has already been applied")

    await db.execute(
        sa_text("DELETE FROM extracted_modules WHERE id = :id"),
        {"id": extraction_id},
    )
    await db.commit()

    return {
        "success": True,
        "message": "Extraction deleted",
        "data": {"deleted": True, "id": extraction_id},
    }


# ---------------------------------------------------------------------------
# GET /history
# ---------------------------------------------------------------------------


@app.get("/history")
async def interaction_history(
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        sa_text(
            "SELECT * FROM ai_interaction_logs "
            "WHERE user_id = :uid ORDER BY created_at DESC LIMIT 20"
        ),
        {"uid": user.id},
    )
    data = [dict(r) for r in rows.mappings()]

    return {
        "success": True,
        "message": f"Found {len(data)} interaction(s)",
        "data": data,
    }
