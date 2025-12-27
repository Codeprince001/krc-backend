import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { UploadMediaDto } from './dto/media.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, MediaType } from '@prisma/client';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  uploadMedia(
    @CurrentUser('id') userId: string,
    @Body() uploadDto: UploadMediaDto,
    // TODO: Add @UploadedFile() decorator for actual file upload
  ) {
    // TODO: Implement file upload to S3/Cloudinary
    const fileUrl = 'https://example.com/uploaded-file.jpg';
    const fileSize = 1024;
    return this.mediaService.uploadMedia(userId, uploadDto, fileUrl, fileSize);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PASTOR)
  findAll(
    @Query('type') type?: MediaType,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.mediaService.findAll(type, page, limit);
  }

  @Get('my-media')
  findMyMedia(
    @CurrentUser('id') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.mediaService.findByUser(userId, page, limit);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getStats() {
    return this.mediaService.getStats();
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.mediaService.remove(id);
  }
}
