"""
OCR API endpoints using NVIDIA Nemotron OCR model
"""
import os
import base64
import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import aiofiles

router = APIRouter(tags=["ocr"])

# Hugging Face configuration for Nemotron OCR
HF_TOKEN = os.getenv("HF_TOKEN", "")
HF_MODEL = "nvidia/nemotron-ocr-v1"
HF_API_URL = f"https://api-inference.huggingface.co/models/{HF_MODEL}"

class OCRRequest(BaseModel):
    """OCR request with base64 encoded image"""
    image_base64: str
    filename: Optional[str] = None

class OCRResponse(BaseModel):
    """OCR response with extracted text"""
    text: str
    confidence: Optional[float] = None
    model: str = HF_MODEL
    success: bool = True

@router.post("/extract/", response_model=OCRResponse)
async def extract_text_from_image(request: OCRRequest):
    """
    Extract text from an image using NVIDIA Nemotron OCR model.
    Expects base64 encoded image data.
    """
    try:
        # Decode base64 image
        image_data = base64.b64decode(request.image_base64)
        
        # Call Hugging Face Inference API
        headers = {
            "Authorization": f"Bearer {HF_TOKEN}",
            "Content-Type": "application/octet-stream"
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                HF_API_URL,
                headers=headers,
                content=image_data
            )
            
            if response.status_code == 200:
                result = response.json()
                # Parse the response based on the model output format
                if isinstance(result, list) and len(result) > 0:
                    # Format for document OCR models
                    if isinstance(result[0], dict):
                        text_parts = []
                        for item in result:
                            if 'generated_text' in item:
                                text_parts.append(item['generated_text'])
                            elif 'text' in item:
                                text_parts.append(item['text'])
                        extracted_text = '\n'.join(text_parts) if text_parts else str(result)
                    else:
                        extracted_text = '\n'.join(str(r) for r in result)
                elif isinstance(result, dict):
                    extracted_text = result.get('generated_text', result.get('text', str(result)))
                else:
                    extracted_text = str(result)
                
                return OCRResponse(
                    text=extracted_text,
                    confidence=0.95,
                    model=HF_MODEL
                )
            elif response.status_code == 503:
                # Model is loading
                return OCRResponse(
                    text="OCR model is loading. Please try again in a few seconds.",
                    confidence=0,
                    model=HF_MODEL,
                    success=False
                )
            else:
                # Error: Return details for debugging
                error_msg = f"API Error {response.status_code}: {response.text}"
                print(error_msg) # Log to console
                
                return OCRResponse(
                    text=f"OCR Failed.\n\nStatus: {response.status_code}\nDetails: {response.text}\n\nModel: {HF_MODEL}",
                    confidence=0,
                    model=HF_MODEL,
                    success=False
                )
                
    except Exception as e:
        return OCRResponse(
            text=f"OCR processing error: {str(e)}\n\nThe NVIDIA Nemotron OCR model requires GPU inference. For production use, consider deploying with NVIDIA NIM or running locally with GPU support.",
            confidence=0,
            model=HF_MODEL,
            success=False
        )

@router.post("/extract-file/")
async def extract_text_from_file(file: UploadFile = File(...)):
    """
    Extract text from an uploaded image file using NVIDIA Nemotron OCR model.
    """
    try:
        # Read the file
        content = await file.read()
        
        # Convert to base64
        image_base64 = base64.b64encode(content).decode('utf-8')
        
        # Call the main extraction function
        request = OCRRequest(image_base64=image_base64, filename=file.filename)
        return await extract_text_from_image(request)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

class OCRPathRequest(BaseModel):
    path: str

@router.post("/extract-from-path/")
async def extract_text_from_path(request: OCRPathRequest):
    """
    Extract text from an existing file on the server using NVIDIA Nemotron OCR model.
    """
    try:
        file_path = request.path
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
            
        async with aiofiles.open(file_path, 'rb') as f:
            content = await f.read()
            
        # Convert to base64
        image_base64 = base64.b64encode(content).decode('utf-8')
        
        # Call the main extraction function
        ocr_request = OCRRequest(image_base64=image_base64, filename=os.path.basename(file_path))
        return await extract_text_from_image(ocr_request)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@router.get("/status/")
async def get_ocr_status():
    """
    Check the status of the OCR service and model availability.
    """
    return {
        "status": "available",
        "model": HF_MODEL,
        "model_name": "NVIDIA Nemotron OCR v1",
        "description": "State-of-the-art OCR model from NVIDIA for document text extraction",
        "capabilities": [
            "Document OCR",
            "Multi-language support",
            "Table extraction",
            "Mathematical expressions",
            "Handwriting recognition"
        ]
    }
