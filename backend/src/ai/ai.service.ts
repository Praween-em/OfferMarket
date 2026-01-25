import { Injectable, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

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
            console.log('🤖 Initializing Stable Gemini AI (1.5 Flash)...');
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        } else {
            console.warn('⚠️ GEMINI_API_KEY is missing in environment variables');
        }
    }

    async generateDescription(itemName: string, campaignTitle: string): Promise<string> {
        if (!this.model) {
            const apiKey = this.configService.get<string>('GEMINI_API_KEY');
            if (apiKey) this.initModel();
            else return 'Gemini API Key not configured in AWS/Env.';
        }

        try {
            const prompt = `Write a professional and catchy product description for "${itemName}" which is part of an offer campaign titled "${campaignTitle}". 
            Context: Online marketplace "OfferMarket". Format: 2-3 engaging sentences. Focus on why the customer should grab this deal now!`;

            if (!this.model) throw new Error('Model not initialized');

            const result = await this.model.generateContent(prompt);
            return result.response.text().trim();
        } catch (error: any) {
            console.error('❌ Gemini Error:', error.message);

            // If 1.5 Flash fails for any reason, try the ultra-stable gemini-pro
            if (this.genAI) {
                console.log('🔄 Attempting fallback to gemini-pro...');
                try {
                    const fallbackModel = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
                    const result = await fallbackModel.generateContent(`Write a catchy description for "${itemName}" in the campaign "${campaignTitle}". Max 3 sentences.`);
                    return result.response.text().trim() || 'AI failed to generate results.';
                } catch (fallbackError: any) {
                    throw new InternalServerErrorException(`AI Quota reached. Please try again in a minute.`);
                }
            }

            throw new InternalServerErrorException(`Gemini Error: ${error.message}`);
        }
    }
}
