import { Injectable, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

@Injectable()
export class AiService implements OnModuleInit {
    private genAI: GoogleGenerativeAI | null = null;
    private model: GenerativeModel | null = null;

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        this.initModel();
    }

    private initModel() {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (apiKey) {
            console.log('🤖 Initializing Stable Gemini AI integration...');
            this.genAI = new GoogleGenerativeAI(apiKey);

            this.model = this.genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: {
                    temperature: 0.8,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 250,
                },
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                ],
            });
        } else {
            console.warn('⚠️ GEMINI_API_KEY is missing');
        }
    }

    async generateDescription(itemName: string, campaignTitle: string): Promise<string> {
        if (!this.model) {
            const apiKey = this.configService.get<string>('GEMINI_API_KEY');
            if (apiKey) this.initModel();
            else return 'Gemini API Key not configured.';
        }

        try {
            const prompt = `Task: Write a professional, catchy, and high-energy product description.
Item: "${itemName}"
Context: This is for a marketplace app called "OfferMarket".
Campaign: "${campaignTitle}"
Requirements: 
- Max 3 sentences.
- Focus on the value and urgengy.
- Keep it professional yet engaging.`;

            if (!this.model) throw new Error('AI Model initialization failed');

            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
            });

            const response = await result.response;
            const text = response.text();

            if (!text) {
                return `Grab the amazing ${itemName} today as part of the ${campaignTitle}! Don't miss out on this exclusive deal.`;
            }

            return text.trim();
        } catch (error: any) {
            console.error('❌ Gemini Integration Error:', error.message);

            // Manual Fallback Logic for production resilience
            if (this.genAI) {
                try {
                    const fallbackModel = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
                    const result = await fallbackModel.generateContent(`Write a catchy one-sentence offer for ${itemName} in the ${campaignTitle} campaign.`);
                    const response = await result.response;
                    return response.text().trim();
                } catch (fallbackError) {
                    throw new InternalServerErrorException(`AI services currently unavailable. Please fill manually.`);
                }
            }

            throw new InternalServerErrorException(`AI Error: ${error.message}`);
        }
    }
}
