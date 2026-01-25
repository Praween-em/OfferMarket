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
            console.log('🤖 Initializing Gemini AI (Stable v1)...');
            this.genAI = new GoogleGenerativeAI(apiKey);

            // Explicitly use v1 (stable) to avoid v1beta 404 issues
            this.model = this.genAI.getGenerativeModel(
                { model: 'gemini-1.5-flash' },
                { apiVersion: 'v1' }
            );
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

        const prompt = `Task: Write a catchy 2-sentence description for "${itemName}" in the "${campaignTitle}" offer campaign. Keep it professional.`;

        try {
            if (!this.model) throw new Error('AI Model initialization failed');

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        } catch (error: any) {
            console.error('❌ Gemini Error:', error.message);

            // If gemini-1.5-flash (v1) fails, try the ultra-compatible 'gemini-pro'
            if (error.message.includes('404') || error.message.includes('not found')) {
                console.log('🔄 Attempting fallback to legacy gemini-pro string...');
                try {
                    const fallbackModel = this.genAI?.getGenerativeModel({ model: 'gemini-pro' });
                    const result = await fallbackModel?.generateContent(prompt);
                    const response = await result?.response;
                    return response?.text().trim() || 'Grab this offer now!';
                } catch (fallbackError) {
                    throw new InternalServerErrorException(`Model not available in your region. Check Google AI Console.`);
                }
            }

            throw new InternalServerErrorException(`AI Error: ${error.message}`);
        }
    }
}
