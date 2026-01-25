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
            console.log('🤖 Initializing Gemini AI...');
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
            });
        } else {
            console.warn('⚠️ GEMINI_API_KEY is missing in environment variables');
        }
    }

    async generateDescription(itemName: string, campaignTitle: string): Promise<string> {
        if (!this.model) {
            // Try to re-init if key was added later
            const apiKey = this.configService.get<string>('GEMINI_API_KEY');
            if (apiKey) {
                this.initModel();
            } else {
                return 'Gemini API Key not configured in AWS/Env.';
            }
        }

        try {
            const prompt = `Write a catchy product description for "${itemName}" which is part of an offer campaign titled "${campaignTitle}". 
            Context: This is for a marketplace app called OfferMarket.
            Format: High energy, professional, max 3 sentences. Highlight why the user should claim it now.`;

            if (!this.model) throw new Error('Model initialization failed');

            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            if (!text) return 'AI couldn\'t generate a description for this item.';
            return text.trim();
        } catch (error: any) {
            console.error('❌ Gemini AI Error:', error);
            // Return the actual error message to help debug during setup
            const errorMsg = error.message || 'Unknown Gemini Error';
            throw new InternalServerErrorException(`Gemini Error: ${errorMsg}`);
        }
    }
}
