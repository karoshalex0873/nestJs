import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from "@google/genai";;
import { systemInfo } from './config';

@Injectable()
export class AiService {

  private readonly aiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  })

  async generateText(prompt: string) {
   
    const result = await this.aiClient.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInfo,
      }

    })

    return result.text
  }
}
