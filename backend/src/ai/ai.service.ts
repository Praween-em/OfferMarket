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
            console.log('🤖 Initializing Gemini 2.0 AI...');
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
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
            const prompt = `Write a catchy product description for "${itemName}" which is part of an offer campaign titled "${campaignTitle}". 
            Context: Marketplace app "OfferMarket". Format: Catchy, professional, max 3 sentences. Highlight why the user should claim it now.`;

            if (!this.model) throw new Error('Model not initialized');

            const result = await this.model.generateContent(prompt);
            return result.response.text().trim();
        } catch (error: any) {
            console.error('❌ Gemini Error:', error.message);

            // FALLBACK: Try gemini-1.5-flash if 2.0-flash is not available in the region
            if (error.message.includes('404') || error.message.includes('not found')) {
                console.log('🔄 Attempting fallback to gemini-1.5-flash...');
                try {
                    const fallbackModel = this.genAI?.getGenerativeModel({ model: 'gemini-1.5-flash' });
                    const prompt = `Write a catchy product description for "${itemName}" for our app OfferMarket. Campaign: "${campaignTitle}". Max 3 sentences.`;
                    const result = await fallbackModel?.generateContent(prompt);
                    return result?.response.text().trim() || 'AI failed to generate results.';
                } catch (fallbackError: any) {
                    throw new InternalServerErrorException(`Gemini Error (including fallback): ${fallbackError.message}`);
                }
            }

            throw new InternalServerErrorException(`Gemini Error: ${error.message}`);
        }
    }
}
