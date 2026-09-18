import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class RegisterNotificationDeviceDto {
  @ApiProperty({ enum: ['android', 'ios'] })
  @IsIn(['android', 'ios'])
  platform: 'android' | 'ios';

  @ApiProperty({ enum: ['expo'] })
  @IsIn(['expo'])
  provider: 'expo';

  @ApiProperty({ description: 'Expo push token for this installation' })
  @IsString()
  @Matches(/^Ex(?:ponent|po)PushToken\[[A-Za-z0-9._=-]{20,512}\]$/)
  pushToken: string;

  @ApiProperty()
  @IsBoolean()
  notificationsEnabled: boolean;

  @ApiProperty({ example: '0.1.45' })
  @IsString()
  @MaxLength(50)
  appVersion: string;

  @ApiProperty({ example: 46 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  buildNumber: number;
}
