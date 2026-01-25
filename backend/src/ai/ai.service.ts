import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

@Injectable()
export class AiService implements OnModuleInit {
    private genAI: GoogleGenerativeAI | null = null;
    private model: GenerativeModel | null = null;

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        }
    }

    async generateDescription(itemName: string, campaignTitle: string): Promise<string> {
        if (!this.model) {
            return 'Gemini API Key not configured. Please add GEMINI_API_KEY to your env.';
        }

        try {
            const prompt = `You are a helpful assistant that writes catchy and professional product descriptions for a marketplace app called OfferMarket. 
            The description should be concise (max 2-3 sentences), highlighting the benefits and why the customer should grab the offer.
            
            Write a product description for "${itemName}" which is part of an offer campaign titled "${campaignTitle}". 
            Keep it engaging, professional, and focus on converting the customer.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return text.trim() || 'No description generated.';
        } catch (error) {
            console.error('Gemini AI Error:', error);
            throw new Error('Failed to generate description from Gemini AI');
        }
    }
}
