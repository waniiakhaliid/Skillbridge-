"""
FILE: chatbot/services.py
PURPOSE: Chatbot reply generation logic

WHAT THIS FILE DOES:
- get_chatbot_reply: returns a response string for a user message
  Currently a fixed placeholder so the full chat UI works end-to-end
  without needing an LLM integration

CONNECTS TO:
- chatbot/views.py — called inside ChatbotMessageListCreateView.create()
"""


def get_chatbot_reply(session, user_message: str) -> str:
    """
    Generates a chatbot reply for a user message within a session.

    Placeholder — no LLM integration yet.
    In production: replace this function body with an Anthropic / OpenAI API call.
    The interface (accepts session + message string, returns reply string) stays the same
    so the swap is transparent to the view layer.

    The session object is passed so a future implementation can:
    - Load message history for multi-turn context
    - Read session.context for relevant booking or topic metadata
    - Write back updated context after each turn

    Returns:
        A plain-text reply string.
    """

    # PLACEHOLDER — replace with LLM call in production
    return (
        "Thanks for reaching out to SkillBridge support! "
        "A team member will review your query and respond shortly. "
        "You can also browse our FAQs at the Help Centre."
    )
