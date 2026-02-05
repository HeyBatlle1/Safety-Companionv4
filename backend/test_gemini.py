
import os
import asyncio
from google import genai
from dotenv import load_dotenv

load_dotenv()

async def test_gemini():
    api_key = os.getenv("GOOGLE_API_KEY")
    client = genai.Client(api_key=api_key)
    model = "gemini-2.5-flash"
    
    print(f"Testing Gemini with model: {model}...")
    try:
        response = await client.aio.models.generate_content(
            model=model,
            contents="Say hello!"
        )
        print(f"✅ Success! Response: {response.text}")
    except Exception as e:
        print(f"❌ Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_gemini())
