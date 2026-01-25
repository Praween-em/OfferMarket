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
        const apiKey = this.configService.get<string>('GEMINI_API_KEY')?.trim();
        if (apiKey) {
            console.log('🤖 Initializing Gemini AI with diagnostic logging...');
            this.genAI = new GoogleGenerativeAI(apiKey);
            // Defaulting to the most likely to succeed based on typical free-tier accounts
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        } else {
            console.warn('⚠️ GEMINI_API_KEY is missing');
        }
    }

    async generateDescription(itemName: string, campaignTitle: string): Promise<string> {
        if (!this.genAI) {
            const apiKey = this.configService.get<string>('GEMINI_API_KEY')?.trim();
            if (apiKey) this.initModel();
            else return 'Gemini API Key missing.';
        }

        const prompt = `Write a professional 2-sentence description for "${itemName}" in the "${campaignTitle}" campaign for the app OfferMarket.`;

        // The most comprehensive list of stable and latest identifiers
        const modelsToScan = ['gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];

        for (const modelId of modelsToScan) {
            try {
                console.log(`📡 Trying model: ${modelId}...`);
                const currentModel = this.genAI!.getGenerativeModel({ model: modelId });
                const result = await currentModel.generateContent(prompt);
                const text = result.response.text();
                if (text) {
                    console.log(`✅ Success with ${modelId}`);
                    return text.trim();
                }
            } catch (error: any) {
                console.warn(`❌ ${modelId} failed: ${error.message}`);
                // If we get a 429 quota error, we stop and tell the user
                if (error.message.includes('429')) {
                    throw new InternalServerErrorException('AI Quota Exceeded. Please check your Google AI Console billing/limits.');
                }
                // If it's anything other than a 404, we report it
                if (!error.message.includes('404') && !error.message.includes('not found')) {
                    throw new InternalServerErrorException(`AI Error: ${error.message}`);
                }
            }
        }

        // Final Fallback if ALL models 404
        console.error('🚨 All Gemini models returned 404. Key may be restricted or Generative Language API not enabled.');
        return `Don't miss out on this amazing ${itemName}! Available now as part of our ${campaignTitle}. Grab this exclusive deal before it's gone!`;
    }
}
