import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class AppValidationService {
  validateDefinition(definition: Record<string, unknown>): void {
    const requiredKeys = ['screens', 'workflows', 'rules'];
    for (const key of requiredKeys) {
      if (!(key in definition)) {
        throw new BadRequestException(`Missing required definition key: ${key}`);
      }
    }
  }
}
