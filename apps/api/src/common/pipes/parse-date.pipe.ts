import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseDatePipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDatePattern.test(value)) {
      throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD.');
    }
    const timestamp = Date.parse(value);
    if (isNaN(timestamp)) {
      throw new BadRequestException('Invalid calendar date value.');
    }
    return value;
  }
}
