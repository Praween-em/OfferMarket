import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AiService implements OnModuleInit {
    private openai: OpenAI | null = null;

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
        if (apiKey) {
            this.openai = new OpenAI({
                baseURL: 'https://api.deepseek.com',
                apiKey: apiKey,
            });
        }
    }

    async generateDescription(itemName: string, campaignTitle: string): Promise<string> {
        if (!this.openai) {
            return 'DeepSeek API Key not configured. Please add DEEPSEEK_API_KEY to your env.';
        }

        try {
            const completion = await this.openai.chat.completions.create({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that writes catchy and professional product descriptions for a marketplace app called OfferMarket. The description should be concise (max 2-3 sentences), highlighting the benefits and why the customer should grab the offer.',
                    },
                    {
                        role: 'user',
                        content: `Write a product description for "${itemName}" which is part of an offer campaign titled "${campaignTitle}". Keep it engaging and professional.`,
                    },
                ],
                max_tokens: 150,
                temperature: 0.7,
            });

            return completion.choices[0].message.content?.trim() || 'No description generated.';
        } catch (error) {
            console.error('DeepSeek SDK Error:', error);
            throw new Error('Failed to generate description from AI');
        }
    }
}
