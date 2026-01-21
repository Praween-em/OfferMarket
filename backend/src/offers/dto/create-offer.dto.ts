
import { IsEnum, IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum OfferType {
    FLAT = 'flat',
    PERCENTAGE = 'percentage',
    BUY_X_GET_Y = 'buy_x_get_y',
    BOGO = 'bogo',
    TIERED_VOLUME = 'tiered_volume',
    TIERED_SPENDING = 'tiered_spending',
    BUNDLE_FIXED_PRICE = 'bundle_fixed_price',
    FREE_GIFT = 'free_gift',
    REFERRAL = 'referral',
    FIRST_ORDER = 'first_order',
    LOYALTY_POINTS = 'loyalty_points',
    MYSTERY_REWARD = 'mystery_reward',
}

export class CreateOfferDto {
    @IsNotEmpty()
    @IsString()
    branch_id: string;

    @IsNotEmpty()
    @IsString()
    title: string;

    @IsNotEmpty()
    @IsString()
    short_description: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNotEmpty()
    @IsDateString()
    start_date: string;

    @IsNotEmpty()
    @IsDateString()
    end_date: string;

    // --- Rule Definitions ---

    @IsNotEmpty()
    @IsEnum(OfferType)
    type: OfferType;

    @IsOptional()
    @IsNumber()
    @Min(0)
    discount_value?: number;

    @IsOptional()
    @IsNumber()
    @Min(1)
    buy_quantity?: number;

    @IsOptional()
    @IsNumber()
    @Min(1)
    get_quantity?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    min_purchase_amount?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    max_discount_amount?: number;
}
