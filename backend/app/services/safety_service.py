from typing import Any, Dict, Optional
from openai import AsyncOpenAI

from app.core.config import settings


class SafetyService:
    """Content safety service using NVIDIA Nemotron Content Safety Reasoning 4B"""

    SAFETY_TAXONOMY = """S1: Violence.
S2: Sexual.
S3: Criminal Planning/Confessions.
S4: Guns and Illegal Weapons.
S5: Controlled/Regulated Substances.
S6: Suicide and Self Harm.
S7: Sexual (minor).
S8: Hate/Identity Hate.
S9: PII/Privacy.
S10: Harassment.
S11: Threat.
S12: Profanity.
S13: Needs Caution.
S14: Manipulation.
S15: Fraud/Deception.
S16: Malware.
S17: High Risk Gov Decision Making.
S18: Political/Misinformation/Conspiracy.
S19: Copyright/Trademark/Plagiarism.
S20: Unauthorized Advice.
S21: Illegal Activity.
    S22: Immoral/Unethical."""

    def __init__(self):
        self.client: Optional[AsyncOpenAI] = None
        if settings.NVIDIA_API_KEY:
            self.client = AsyncOpenAI(
                base_url=settings.NVIDIA_BASE_URL,
                api_key=settings.NVIDIA_API_KEY,
            )
        self.model = "nvidia/nemotron-content-safety-reasoning-4b"

    async def check_content_safety(
        self,
        user_prompt: str,
        ai_response: Optional[str] = None,
        use_reasoning: bool = False
    ) -> Dict[str, Any]:
        """
        Check content safety for user prompt and optional AI response.

        Returns:
            Dict with safety assessment
        """

        # Build the classification prompt
        if ai_response:
            content = f"""You are a classifier for analyzing interactions between humans and LLMs. Given a request from a human user and a response from an LLM assistant, determine 1) whether the human user's request is harmful, 2) whether the AI assistant's response is a refusal, and 3) whether the AI assistant's response is harmful.

Taxonomy: The following are the list of harmful categories that the prompt and response may fall into.

{self.SAFETY_TAXONOMY}

Human user:
{user_prompt}

AI assistant:
{ai_response}

Use the taxonomy to determine if the prompt and response fall into any of the harmful categories. Output your answer in the following format:

"Prompt harm: <harmful/unharmful>
Response harm: <harmful/unharmful>"

Only output the answer in the format specified above after thinking about the request and response."""
        else:
            content = f"""You are a classifier for analyzing user requests to LLMs. Determine whether the human user's request is harmful.

Taxonomy: The following are the list of harmful categories that the prompt may fall into.

{self.SAFETY_TAXONOMY}

Human user:
{user_prompt}

Use the taxonomy to determine if the prompt falls into any of the harmful categories. Output your answer in the following format:

"Prompt harm: <harmful/unharmful>"

Only output the answer in the format specified above after thinking about the request."""

        # Add reasoning instruction if enabled
        if use_reasoning:
            content += " /think"

        if not self.client:
            return {
                "prompt_safe": True,
                "response_safe": True if ai_response else None,
                "prompt_harm": "unknown",
                "response_harm": "unknown" if ai_response else None,
                "error": "NVIDIA_API_KEY not configured",
            }

        try:
            # Call the safety model (now properly async)
            completion = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": content}],
                temperature=1,
                top_p=1,
                max_tokens=16384,
                stream=False
            )

            result_text = completion.choices[0].message.content

            # Parse the response
            return self._parse_safety_response(result_text, ai_response is not None)

        except Exception as e:
            print(f"Safety check error: {e}")
            # Fail open - allow content if safety check fails
            return {
                "prompt_safe": True,
                "response_safe": True if ai_response else None,
                "prompt_harm": "unknown",
                "response_harm": "unknown" if ai_response else None,
                "error": str(e)
            }

    def _parse_safety_response(self, response: str, has_response: bool) -> Dict[str, Any]:
        """Parse the safety model's response"""
        result: Dict[str, Any] = {
            "prompt_safe": True,
            "response_safe": True if has_response else None,
            "prompt_harm": "unharmful",
            "response_harm": "unharmful" if has_response else None,
            "raw_response": response
        }

        # Extract reasoning if present
        if "/think" in response or "Reasoning:" in response:
            parts = response.split("Prompt harm:")
            if len(parts) > 1:
                result["reasoning"] = parts[0].strip()
                response = "Prompt harm:" + parts[1]

        # Parse prompt harm
        if "Prompt harm: harmful" in response:
            result["prompt_safe"] = False
            result["prompt_harm"] = "harmful"
        elif "Prompt harm: unharmful" in response:
            result["prompt_safe"] = True
            result["prompt_harm"] = "unharmful"

        # Parse response harm if present
        if has_response:
            if "Response harm: harmful" in response:
                result["response_safe"] = False
                result["response_harm"] = "harmful"
            elif "Response harm: unharmful" in response:
                result["response_safe"] = True
                result["response_harm"] = "unharmful"

        return result

    async def check_prompt_only(self, user_prompt: str) -> bool:
        """Quick check if a user prompt is safe. Returns True if safe."""
        result = await self.check_content_safety(user_prompt)
        return result["prompt_safe"]

    async def check_full_interaction(
        self,
        user_prompt: str,
        ai_response: str
    ) -> Dict[str, bool]:
        """Check both prompt and response safety."""
        result = await self.check_content_safety(user_prompt, ai_response)
        return {
            "prompt_safe": result["prompt_safe"],
            "response_safe": result["response_safe"]
        }


# Singleton instance
safety_service = SafetyService()
