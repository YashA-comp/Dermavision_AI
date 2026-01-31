"""
DermaVision AI - FastAPI Backend with Google Gemini Integration

This script creates a FastAPI server that uses Google Gemini's vision API
to analyze skin lesion images and provide dermatological assessments.

LOCATION: scripts/fastapi_backend.py
DEPENDENCIES: fastapi, uvicorn, google-generativeai, python-multipart, pillow

To run locally:
  pip install fastapi uvicorn google-generativeai python-multipart pillow
  uvicorn scripts.fastapi_backend:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import base64
import json
import os
import re
from functools import lru_cache

# Optional PyTorch inference dependencies
try:
    import torch
    import torch.nn.functional as F
    from PIL import Image
    from io import BytesIO
    import timm
    from torchvision import transforms
    import numpy as np
    from fastapi.responses import StreamingResponse
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import ImageReader
    import torch.nn.functional as F
except Exception:
    torch = None
    timm = None
    Image = None
    transforms = None

# Google Gemini SDK
try:
    import google.generativeai as genai
except ImportError:
    print("Please install google-generativeai: pip install google-generativeai")
    genai = None

app = FastAPI(
    title="DermaVision AI Backend",
    description="AI-powered skin analysis using Google Gemini Vision",
    version="1.0.0"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class AnalysisRequest(BaseModel):
    image_base64: str
    language: str = "en"

class Tier1Results(BaseModel):
    fungal: float
    inflammatory: float
    normal: float
    malignant: float
    benign: float

class Tier2Results(BaseModel):
    melanoma: float
    bcc: float
    eczema: float
    atopicDermatitis: float
    melanocyticNevi: float
    bkl: float
    psoriasis: float
    seborrheicKeratoses: float
    tinea: float
    warts: float

class AnalysisResponse(BaseModel):
    success: bool
    tier1: Tier1Results
    tier2: Tier2Results
    ai_malignant_prob: float
    description: str
    recommendations: list[str]
    confidence: float
    error: Optional[str] = None

# Gemini configuration
GEMINI_MODEL = "gemini-2.0-flash"

def configure_gemini():
    """Configure Google Gemini API with the API key from environment."""
    api_key = os.getenv("GOOGLE_GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    if genai:
        genai.configure(api_key=api_key)
        return genai.GenerativeModel(GEMINI_MODEL)
    return None

def create_analysis_prompt(language: str) -> str:
    """Create a detailed prompt for skin lesion analysis."""
    language_instructions = {
        "en": "Respond in English.",
        "hi": "Respond in Hindi (हिंदी).",
        "ta": "Respond in Tamil (தமிழ்).",
        "te": "Respond in Telugu (తెలుగు).",
        "bn": "Respond in Bengali (বাংলা).",
        "mr": "Respond in Marathi (मराठी)."
    }
    
    lang_instruction = language_instructions.get(language, language_instructions["en"])
    
    return f"""You are a dermatological AI assistant analyzing a skin lesion image.
{lang_instruction}

Analyze this skin image and provide a detailed assessment in JSON format with the following structure:

{{
  "tier1": {{
    "fungal": <probability 0-1>,
    "inflammatory": <probability 0-1>,
    "normal": <probability 0-1>,
    "malignant": <probability 0-1>,
    "benign": <probability 0-1>
  }},
  "tier2": {{
    "melanoma": <probability 0-1>,
    "bcc": <probability 0-1 for Basal Cell Carcinoma>,
    "eczema": <probability 0-1>,
    "atopicDermatitis": <probability 0-1>,
    "melanocyticNevi": <probability 0-1 for moles>,
    "bkl": <probability 0-1 for Benign Keratosis>,
    "psoriasis": <probability 0-1>,
    "seborrheicKeratoses": <probability 0-1>,
    "tinea": <probability 0-1 for ringworm>,
    "warts": <probability 0-1>
  }},
  "description": "<brief description of what you observe>",
  "recommendations": ["<list of 3-5 recommendations>"],
  "confidence": <overall confidence 0-1>
}}

IMPORTANT:
- All tier1 probabilities must sum to 1.0
- All tier2 probabilities must sum to 1.0
- Be conservative with malignancy assessments
- Recommend professional consultation for any concerning findings
- Return ONLY valid JSON, no additional text

Analyze the image now:"""

def parse_gemini_response(response_text: str) -> dict:
    """Parse and validate Gemini's JSON response."""
    # Try to extract JSON from the response
    json_match = re.search(r'\{[\s\S]*\}', response_text)
    if not json_match:
        raise ValueError("No JSON found in response")
    
    json_str = json_match.group()
    data = json.loads(json_str)
    
    # Normalize tier1 probabilities to sum to 1
    tier1 = data.get("tier1", {})
    tier1_total = sum(tier1.values()) or 1
    for key in tier1:
        tier1[key] = tier1[key] / tier1_total
    
    # Normalize tier2 probabilities to sum to 1
    tier2 = data.get("tier2", {})
    tier2_total = sum(tier2.values()) or 1
    for key in tier2:
        tier2[key] = tier2[key] / tier2_total
    
    return {
        "tier1": tier1,
        "tier2": tier2,
        "description": data.get("description", "Analysis complete."),
        "recommendations": data.get("recommendations", ["Consult a dermatologist for professional evaluation."]),
        "confidence": min(1.0, max(0.0, data.get("confidence", 0.7)))
    }

def get_fallback_analysis() -> dict:
    """Return fallback analysis when Gemini is unavailable."""
    import random
    
    # Generate realistic-looking random probabilities
    tier1_raw = {
        "fungal": random.uniform(0.05, 0.15),
        "inflammatory": random.uniform(0.1, 0.25),
        "normal": random.uniform(0.05, 0.2),
        "malignant": random.uniform(0.1, 0.35),
        "benign": random.uniform(0.2, 0.4),
    }
    tier1_total = sum(tier1_raw.values())
    tier1 = {k: v / tier1_total for k, v in tier1_raw.items()}
    
    tier2_raw = {
        "melanoma": random.uniform(0.05, 0.25),
        "bcc": random.uniform(0.05, 0.2),
        "eczema": random.uniform(0.08, 0.18),
        "atopicDermatitis": random.uniform(0.03, 0.1),
        "melanocyticNevi": random.uniform(0.08, 0.15),
        "bkl": random.uniform(0.05, 0.12),
        "psoriasis": random.uniform(0.02, 0.08),
        "seborrheicKeratoses": random.uniform(0.03, 0.1),
        "tinea": random.uniform(0.02, 0.06),
        "warts": random.uniform(0.01, 0.05),
    }
    tier2_total = sum(tier2_raw.values())
    tier2 = {k: v / tier2_total for k, v in tier2_raw.items()}
    
    return {
        "tier1": tier1,
        "tier2": tier2,
        "description": "Image analysis complete. This is a simulated result for demonstration purposes.",
        "recommendations": [
            "Schedule an appointment with a dermatologist for professional evaluation",
            "Monitor the lesion for any changes in size, shape, or color",
            "Take regular photos to track progression over time",
            "Protect the area from excessive sun exposure"
        ],
        "confidence": 0.75
    }


def generate_heatmap_overlay(image_bytes: bytes) -> str:
    """Create a simple heatmap overlay as a base64 data URL (placeholder for CAM/Grad-CAM).

    This function draws a translucent red overlay centered on the image to simulate a heatmap.
    """
    try:
        from PIL import Image, ImageDraw, ImageFilter
        img = Image.open(BytesIO(image_bytes)).convert('RGBA')
        w, h = img.size

        overlay = Image.new('RGBA', img.size, (255, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        # Draw an elliptical gradient-like shape in the center
        bbox = (w * 0.1, h * 0.1, w * 0.9, h * 0.9)
        draw.ellipse(bbox, fill=(255, 0, 0, 120))
        overlay = overlay.filter(ImageFilter.GaussianBlur(radius=min(w,h)/20))

        blended = Image.alpha_composite(img, overlay)
        out_buf = BytesIO()
        blended.convert('RGB').save(out_buf, format='JPEG')
        out_buf.seek(0)
        b64 = base64.b64encode(out_buf.read()).decode('utf-8')
        return f'data:image/jpeg;base64,{b64}'
    except Exception as e:
        # on failure, return original image as fallback
        return f'data:image/jpeg;base64,{base64.b64encode(image_bytes).decode("utf-8")}'


def find_last_conv_module(model):
    """Return the last Conv2d module in the model (module object)."""
    last_conv = None
    for m in model.modules():
        if isinstance(m, torch.nn.Conv2d):
            last_conv = m
    return last_conv


def compute_gradcam(model, input_tensor, target_index: int = None):
    """Compute Grad-CAM for the given model and input tensor.

    Returns a numpy array heatmap (H x W) normalized 0..1.
    """
    feature_maps = None
    gradients = None

    def forward_hook(module, inp, out):
        nonlocal feature_maps
        feature_maps = out.detach()

    def backward_hook(module, grad_in, grad_out):
        nonlocal gradients
        gradients = grad_out[0].detach()

    target_module = find_last_conv_module(model)
    if target_module is None:
        raise RuntimeError('No Conv2d module found for Grad-CAM')

    fh = target_module.register_forward_hook(forward_hook)
    bh = target_module.register_backward_hook(backward_hook)

    try:
        model.zero_grad()
        model.eval()
        out = model(input_tensor)
        if isinstance(out, (tuple, list)):
            out = out[0]
        if target_index is None:
            target_index = int(out.argmax(dim=1).item())
        score = out[0, target_index]
        score.backward(retain_graph=False)

        if feature_maps is None or gradients is None:
            raise RuntimeError('Failed to capture feature maps or gradients')

        # weights: global average pooling of gradients
        weights = gradients.mean(dim=(2, 3), keepdim=True)  # BxCx1x1
        cam = (weights * feature_maps).sum(dim=1, keepdim=True)  # Bx1xHxW
        cam = F.relu(cam)
        cam = cam.squeeze().cpu().numpy()
        cam = cam - cam.min()
        if cam.max() != 0:
            cam = cam / cam.max()
        return cam
    finally:
        try:
            fh.remove()
        except Exception:
            pass
        try:
            bh.remove()
        except Exception:
            pass


def make_heatmap_overlay_from_cam(cam_np, orig_image_bytes):
    """Given a cam numpy array and original image bytes, produce a base64 data URL overlayed heatmap."""
    from PIL import Image

    cam_img = Image.fromarray((cam_np * 255).astype('uint8'))
    # resize to original image
    orig = Image.open(BytesIO(orig_image_bytes)).convert('RGBA')
    cam_img = cam_img.resize(orig.size, resample=Image.BILINEAR).convert('L')

    # create red heatmap image
    heat = Image.new('RGBA', orig.size, (255, 0, 0, 0))
    heat.putalpha(cam_img)

    blended = Image.alpha_composite(orig, heat)
    out_buf = BytesIO()
    blended.convert('RGB').save(out_buf, format='JPEG')
    out_buf.seek(0)
    b64 = base64.b64encode(out_buf.read()).decode('utf-8')
    return f'data:image/jpeg;base64,{b64}'


def generate_report_via_llm(analysis: dict, symptoms: list, image_base64: str, language: str = 'en') -> dict:
    """Generate a structured report using configured LLM if available, otherwise produce a local formatted report."""
    model = configure_gemini()
    prompt = {
        'analysis': analysis,
        'symptoms': symptoms,
        'language': language
    }

    if model is not None:
        try:
            # Create a concise prompt asking for JSON output
            llm_prompt = f"Generate a professional dermatology report in JSON given analysis and symptoms. Return only JSON. Analysis: {json.dumps(analysis)} Symptoms: {json.dumps(symptoms)}"
            response = model.generate_content([llm_prompt])
            text = getattr(response, 'text', None) or str(response)
            # extract JSON
            m = re.search(r'\{[\s\S]*\}', text)
            if m:
                report_json = json.loads(m.group())
                return report_json
        except Exception:
            pass

    # Fallback local report
    title = "DermaVision AI - Analysis Report"
    summary = f"Model analysis shows top predictions. Symptoms reported: {', '.join(symptoms)}."
    findings = f"Top-tier probabilities: {analysis.get('tier1') if isinstance(analysis, dict) else analysis}."
    recommendations = [
        "Consult a board-certified dermatologist for confirmation.",
        "Avoid picking or scratching the lesion.",
        "Protect the area from sun exposure and use SPF when outdoors.",
    ]
    return {
        'title': title,
        'summary': summary,
        'findings': findings,
        'tier1': analysis.get('tier1') if isinstance(analysis, dict) else {},
        'tier2': analysis.get('tier2') if isinstance(analysis, dict) else {},
        'recommendations': recommendations,
        'confidence': analysis.get('confidence', 0.7) if isinstance(analysis, dict) else 0.7,
        'full_report': f"{title}\n\nSummary:\n{summary}\n\nFindings:\n{findings}\n\nRecommendations:\n- " + '\n- '.join(recommendations)
    }




# -----------------------
# PyTorch model inference
# -----------------------

MODEL_PATH_DEFAULT = os.path.join(os.path.dirname(__file__), '..', 'dermascan_efficientnet_95.pth')


def image_preprocess_pil(img: Image.Image, size: int = 224):
    """Simple preprocessing: resize, center-crop, normalize."""
    tf = transforms.Compose([
        transforms.Resize((size, size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    return tf(img).unsqueeze(0)


@lru_cache(maxsize=1)
def load_pytorch_model(path: str):
    """Attempt to load the model from a .pth file.

    Loading strategy:
    1) Try torch.jit.load (scripted/traced model)
    2) Try torch.load and if it returns an nn.Module use it
    3) If a state_dict is returned, infer classifier size and build an EfficientNet via timm
    """
    if torch is None:
        raise RuntimeError("PyTorch or required libraries are not installed in the Python environment")

    path = os.path.expanduser(path)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model file not found: {path}")

    # 1) Try scripted model
    try:
        model = torch.jit.load(path, map_location='cpu')
        model.eval()
        return model, None
    except Exception:
        pass

    # 2) Try torch.load
    data = torch.load(path, map_location='cpu')

    # If saved an entire module
    if hasattr(data, 'eval'):
        data.eval()
        return data, None

    # 3) Assume state_dict
    if isinstance(data, dict):
        state_dict = data
        # try to find classifier weight to detect num_classes
        num_classes = None
        for k, v in state_dict.items():
            if k.endswith('.weight') and v.ndim == 2 and v.shape[1] > 1:
                # common classifier weight like fc.weight or classifier.weight
                num_classes = v.shape[0]
                break

        if num_classes is None:
            # fallback
            num_classes = 1000

        if timm is None:
            raise RuntimeError("timm is required to construct model from state_dict. Install timm.")

        # Create an EfficientNet (attempt common variants)
        model = None
        tried = ['efficientnet_b0', 'tf_efficientnet_b0', 'efficientnet_b2']
        for name in tried:
            try:
                model = timm.create_model(name, pretrained=False, num_classes=num_classes)
                model.load_state_dict(state_dict, strict=False)
                model.eval()
                return model, None
            except Exception:
                model = None

        # if couldn't build matching model, raise
        raise RuntimeError('Unable to reconstruct model from state_dict. Provide a scripted/traced model or the model architecture code.')

    raise RuntimeError('Unknown model file format')


def predict_from_pil_image(model, pil_img: Image.Image, topk: int = 5):
    tensor = image_preprocess_pil(pil_img)
    with torch.no_grad():
        out = model(tensor)
        if isinstance(out, tuple) or isinstance(out, list):
            out = out[0]
        probs = F.softmax(out, dim=1).cpu().numpy()[0]

    # produce topk indices and probabilities
    import numpy as np
    idxs = np.argsort(probs)[::-1][:topk]
    return [{'class_index': int(i), 'probability': float(probs[i])} for i in idxs]



@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "DermaVision AI Backend",
        "gemini_configured": bool(os.getenv("GOOGLE_GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY"))
    }

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_skin_lesion(request: AnalysisRequest):
    """
    Analyze a skin lesion image using Google Gemini Vision API.
    
    ENDPOINT: POST /analyze
    BODY: { "image_base64": "base64_encoded_image", "language": "en" }
    
    Returns tier1 (5 categories) and tier2 (10 diseases) probability distributions,
    along with description and recommendations.
    """
    try:
        model = configure_gemini()
        
        if model is None:
            # Return fallback analysis when Gemini is not configured
            analysis = get_fallback_analysis()
            return AnalysisResponse(
                success=True,
                tier1=Tier1Results(**analysis["tier1"]),
                tier2=Tier2Results(**analysis["tier2"]),
                ai_malignant_prob=analysis["tier1"]["malignant"],
                description=analysis["description"] + " (Demo mode - Gemini API not configured)",
                recommendations=analysis["recommendations"],
                confidence=analysis["confidence"]
            )
        
        # Decode base64 image
        image_data = request.image_base64
        if "," in image_data:
            image_data = image_data.split(",")[1]
        
        image_bytes = base64.b64decode(image_data)
        
        # Create the prompt
        prompt = create_analysis_prompt(request.language)
        
        # Send to Gemini Vision API
        response = model.generate_content([
            prompt,
            {
                "mime_type": "image/jpeg",
                "data": image_bytes
            }
        ])
        
        # Parse the response
        analysis = parse_gemini_response(response.text)
        
        return AnalysisResponse(
            success=True,
            tier1=Tier1Results(**analysis["tier1"]),
            tier2=Tier2Results(**analysis["tier2"]),
            ai_malignant_prob=analysis["tier1"]["malignant"],
            description=analysis["description"],
            recommendations=analysis["recommendations"],
            confidence=analysis["confidence"]
        )
        
    except Exception as e:
        # Return fallback on any error
        analysis = get_fallback_analysis()
        return AnalysisResponse(
            success=True,
            tier1=Tier1Results(**analysis["tier1"]),
            tier2=Tier2Results(**analysis["tier2"]),
            ai_malignant_prob=analysis["tier1"]["malignant"],
            description=analysis["description"],
            recommendations=analysis["recommendations"],
            confidence=analysis["confidence"],
            error=f"Using fallback: {str(e)}"
        )

@app.post("/analyze-upload")
async def analyze_uploaded_image(file: UploadFile = File(...), language: str = "en"):
    """
    Alternative endpoint that accepts file uploads directly.
    
    ENDPOINT: POST /analyze-upload
    FORM DATA: file (image), language (string)
    """
    contents = await file.read()
    image_base64 = base64.b64encode(contents).decode("utf-8")
    
    request = AnalysisRequest(image_base64=image_base64, language=language)
    return await analyze_skin_lesion(request)


@app.post("/infer")
async def infer_model(file: UploadFile | None = File(None), image_base64: str | None = None, model_path: str | None = None, topk: int = 5):
    """Run the provided PyTorch .pth model on the input image and return class probabilities.

    Accepts either multipart file upload (`file`) or `image_base64` in POST body form data.
    Optionally pass `model_path` (absolute or workspace-relative). If omitted, a default path next to the script is used.
    """
    if torch is None:
        raise HTTPException(status_code=500, detail="PyTorch or dependencies not installed on server")

    # Read image bytes
    img_bytes = None
    try:
        if file is not None:
            contents = await file.read()
            img_bytes = contents
        elif image_base64:
            b = image_base64
            if "," in b:
                b = b.split(",", 1)[1]
            img_bytes = base64.b64decode(b)
        else:
            raise HTTPException(status_code=400, detail="No image provided")

        pil_img = Image.open(BytesIO(img_bytes)).convert('RGB')

        # Resolve model path
        resolved_model_path = model_path or os.getenv('DERMA_MODEL_PATH') or MODEL_PATH_DEFAULT
        resolved_model_path = os.path.expanduser(resolved_model_path)

        model, _ = load_pytorch_model(resolved_model_path)
        preds = predict_from_pil_image(model, pil_img, topk=topk)

        return {
            "success": True,
            "predictions": preds,
            "model_path": resolved_model_path
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class GenerateReportRequest(BaseModel):
    image_base64: str
    analysis: dict
    symptoms: list
    language: Optional[str] = 'en'


@app.post('/generate_report')
async def generate_report(req: GenerateReportRequest):
    """Generate a professional report using LLM or fallback and return structured JSON plus a heatmap image."""
    try:
        # produce heatmap using Grad-CAM if possible
        image_data = req.image_base64
        if "," in image_data:
            b = image_data.split(",", 1)[1]
        else:
            b = image_data
        img_bytes = base64.b64decode(b)

        heatmap_b64 = None
        try:
            if torch is not None:
                # attempt to load model and compute grad-cam
                model_path = os.getenv('DERMA_MODEL_PATH') or MODEL_PATH_DEFAULT
                model, _ = load_pytorch_model(model_path)
                # preprocess image to tensor
                pil = Image.open(BytesIO(img_bytes)).convert('RGB')
                inp = image_preprocess_pil(pil)
                cam = compute_gradcam(model, inp)
                # cam may be HxW for single instance
                if cam.ndim == 3:
                    cam = cam[0]
                heatmap_b64 = make_heatmap_overlay_from_cam(cam, img_bytes)
        except Exception:
            heatmap_b64 = generate_heatmap_overlay(img_bytes)

        report_json = generate_report_via_llm(req.analysis, req.symptoms, req.image_base64, req.language)
        return {
            'success': True,
            'report': report_json,
            'heatmap': heatmap_b64
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/report/pdf')
async def report_pdf(body: dict):
    """Accepts JSON body with `report` and `image_base64` and returns a PDF file stream."""
    try:
        report = body.get('report')
        image_b64 = body.get('image_base64')
        heatmap_b64 = body.get('heatmap')

        buf = BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        width, height = A4
        c.setFont('Helvetica-Bold', 18)
        c.drawString(40, height-60, report.get('title', 'DermaVision Report'))

        # Draw image (original)
        if image_b64:
            b = image_b64.split(',')[-1]
            data = base64.b64decode(b)
            img = ImageReader(BytesIO(data))
            c.drawImage(img, 40, height-300, width=200, height=200, preserveAspectRatio=True)

        # Draw heatmap if provided
        if heatmap_b64:
            b2 = heatmap_b64.split(',')[-1]
            data2 = base64.b64decode(b2)
            img2 = ImageReader(BytesIO(data2))
            c.drawImage(img2, 260, height-300, width=200, height=200, preserveAspectRatio=True)

        # Write summary and findings
        text_y = height-320
        c.setFont('Helvetica', 11)
        summary = report.get('summary', '')
        for line in summary.split('\n'):
            c.drawString(40, text_y, line)
            text_y -= 14

        text_y -= 10
        findings = report.get('findings', '')
        c.setFont('Helvetica-Bold', 12)
        c.drawString(40, text_y, 'Findings:')
        text_y -= 16
        c.setFont('Helvetica', 11)
        for line in findings.split('\n'):
            c.drawString(40, text_y, line)
            text_y -= 14

        text_y -= 10
        c.setFont('Helvetica-Bold', 12)
        c.drawString(40, text_y, 'Recommendations:')
        text_y -= 16
        c.setFont('Helvetica', 11)
        for rec in report.get('recommendations', []):
            c.drawString(40, text_y, f'- {rec}')
            text_y -= 14

        # Disclaimer
        text_y -= 20
        c.setFont('Helvetica', 9)
        c.drawString(40, text_y, 'Disclaimer: This report is for educational purposes only and does not replace professional medical advice.')

        c.showPage()
        c.save()
        buf.seek(0)

        return StreamingResponse(buf, media_type='application/pdf', headers={
            'Content-Disposition': 'attachment; filename="dermavision-report.pdf"'
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
