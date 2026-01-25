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
        // Trim key to prevent hidden newline/space issues from AWS console
        const apiKey = this.configService.get<string>('GEMINI_API_KEY')?.trim();
        if (apiKey) {
            console.log('🤖 Initializing ultra-stable Gemini AI (gemini-pro)...');
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
        } else {
            console.warn('⚠️ GEMINI_API_KEY is missing');
        }
    }

    async generateDescription(itemName: string, campaignTitle: string): Promise<string> {
        if (!this.model) {
            const apiKey = this.configService.get<string>('GEMINI_API_KEY')?.trim();
            if (apiKey) this.initModel();
            else return 'Gemini API Key not configured.';
        }

        const prompt = `Write a catchy 2-sentence marketplace description for "${itemName}" in the "${campaignTitle}" campaign.`;

        // Array of models to try in order of stability
        const modelsToTry = ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];

        for (const modelName of modelsToTry) {
            try {
                // Ensure genAI is initialized before attempting to get a model
                if (!this.genAI) {
                    throw new Error('GoogleGenerativeAI not initialized.');
                }
                const currentModel = this.genAI.getGenerativeModel({ model: modelName });
                const result = await currentModel.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                if (text) return text.trim();
            } catch (error: any) {
                console.warn(`⚠️ Model ${modelName} failed: ${error.message}`);
                // If it's a 404, continue to next model. If it's something else (like 429), throw it.
                if (!error.message.includes('404') && !error.message.includes('not found')) {
                    throw new InternalServerErrorException(`Gemini Error: ${error.message}`);
                }
            }
        }

        throw new InternalServerErrorException('All AI models returned 404. Please check project region in Google AI Console.');
    }
}
