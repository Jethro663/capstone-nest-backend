import { Global, Module } from '@nestjs/common';
import { STORAGE_PROVIDER_TOKEN } from './storage.provider';
import { LocalStorageProvider } from './local-storage.provider';
import { S3StorageProvider } from './s3-storage.provider';
import { StorageService } from './storage.service';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER_TOKEN,
      useFactory: () => {
        const driver = (
          process.env.STORAGE_DRIVER ||
          process.env.STORAGE_PROVIDER ||
          'local'
        ).toLowerCase();
        if (driver === 's3' || driver === 'r2') {
          return new S3StorageProvider();
        }
        return new LocalStorageProvider();
      },
    },
    StorageService,
  ],
  exports: [STORAGE_PROVIDER_TOKEN, StorageService],
})
export class StorageModule {}
