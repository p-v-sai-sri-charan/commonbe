import { IsIn } from 'class-validator';

export class SetOrderCategoryDto {
  @IsIn(['inhouse', 'custom', 'print_on_demand'])
  orderType: 'inhouse' | 'custom' | 'print_on_demand';
}
