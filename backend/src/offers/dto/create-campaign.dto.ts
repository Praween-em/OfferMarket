import { IsString, IsNotEmpty, IsOptional, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OfferType } from './create-offer.dto';

class CampaignItemDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsString()
    type: string;

    @IsOptional()
    @IsString()
    image1?: string;

    @IsOptional()
    @IsString()
    image2?: string;

    @IsNotEmpty()
    rules: any;
}

export class CreateCampaignDto {
    @IsNotEmpty()
    @IsString()
    title: string;

    @IsNotEmpty()
    @IsDateString()
    start_date: string;

    @IsNotEmpty()
    @IsDateString()
    end_date: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CampaignItemDto)
    items: CampaignItemDto[];
}
