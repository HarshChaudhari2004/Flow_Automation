# To run this code you need to install the following dependencies:
# pip install google-genai

import base64
import os
from google import genai
from google.genai import types


def generate():
    company = input("Enter the company name: ").strip()
    client = genai.Client(
        api_key="AIzaSyD9rG5WInTjETKd2MizNl7LHB6DZAZhfLo",
    )

    model = "gemini-2.0-flash"
    prompt = f"""You are an expert business analyst. Extract key insights about [{company}]. 
Organize the information strictly under these headers, keeping each section concise and focused on latest/relevant information:

1. Overview: Brief company description and core business
2. Recent News: Latest significant developments (last 2-3 months)
3. Financial Performance: Latest financial metrics and performance trends
4. Strategic Moves: Recent or planned strategic initiatives
5. Opportunities/Risks: Current market opportunities and potential risks

Provide factual, grounded information with clear section breaks.you may also get information from official company websites, news articles, and financial reports. official social media accounts, and other reliable sources. Make sure to include the latest information available."""

    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=prompt),
            ],
        ),
    ]
    tools = [
        types.Tool(url_context=types.UrlContext()),
        types.Tool(google_search=types.GoogleSearch()),
    ]
    generate_content_config = types.GenerateContentConfig(
        tools=tools,
        response_mime_type="text/plain",
    )

    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=generate_content_config,
    ):
        print(chunk.text, end="")

if __name__ == "__main__":
    generate()
