"""
FILE: chatbot/views.py
"""

import json
import time
import urllib.request
import urllib.error
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

GEMINI_KEY = 'AIzaSyB2nA-2eZ2Q6LM_OH-ebP60aTXvj8f0HrA'

# gemini-2.0-flash-lite — free tier, fastest model
GEMINI_URL = (
    'https://generativelanguage.googleapis.com/v1beta/models/'
    f'gemini-2.0-flash-lite:generateContent?key={GEMINI_KEY}'
)


@csrf_exempt
@require_http_methods(["POST"])
def gemini_proxy(request):
    try:
        body     = json.loads(request.body)
        system   = body.get('system', '')
        messages = body.get('messages', [])[-12:]

        contents = [
            {'role': 'user',  'parts': [{'text': system}]},
            {'role': 'model', 'parts': [{'text': 'Understood. I am Bridget, ready to help.'}]},
        ]
        contents += messages

        payload = json.dumps({
            'contents': contents,
            'generationConfig': {'maxOutputTokens': 600, 'temperature': 0.7}
        }).encode('utf-8')

        for attempt in range(2):
            try:
                req = urllib.request.Request(
                    GEMINI_URL, data=payload,
                    headers={'Content-Type': 'application/json'},
                    method='POST'
                )
                with urllib.request.urlopen(req, timeout=30) as resp:
                    data  = json.loads(resp.read().decode('utf-8'))
                    reply = data['candidates'][0]['content']['parts'][0]['text']
                    return JsonResponse({'reply': reply})

            except urllib.error.HTTPError as e:
                error_body = e.read().decode('utf-8')
                try:
                    code = json.loads(error_body).get('error', {}).get('code', e.code)
                except Exception:
                    code = e.code

                if code == 429 and attempt == 0:
                    time.sleep(16)
                    continue

                return JsonResponse({'error': error_body}, status=502)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)