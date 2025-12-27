import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import {
  CreateGroupDto,
  UpdateGroupDto,
  CreateGroupPostDto,
  UpdateGroupPostDto,
  CreateCommentDto,
} from './dto/group.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  // Group Management
  @Post()
  @Roles(UserRole.PASTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.WORKER)
  @HttpCode(HttpStatus.CREATED)
  createGroup(@Body() createDto: CreateGroupDto) {
    return this.groupsService.createGroup(createDto);
  }

  @Get()
  findAllGroups(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.groupsService.findAllGroups(page, limit);
  }

  @Get('my-groups')
  getUserGroups(
    @CurrentUser('id') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.groupsService.getUserGroups(userId, page, limit);
  }

  @Get(':id')
  findOneGroup(@Param('id') id: string) {
    return this.groupsService.findOneGroup(id);
  }

  @Patch(':id')
  @Roles(UserRole.PASTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.WORKER)
  updateGroup(@Param('id') id: string, @Body() updateDto: UpdateGroupDto) {
    return this.groupsService.updateGroup(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  removeGroup(@Param('id') id: string) {
    return this.groupsService.removeGroup(id);
  }

  // Group Membership
  @Post(':groupId/join')
  joinGroup(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.groupsService.joinGroup(userId, groupId);
  }

  @Delete(':groupId/leave')
  leaveGroup(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.groupsService.leaveGroup(userId, groupId);
  }

  @Get(':groupId/members')
  getGroupMembers(
    @Param('groupId') groupId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.groupsService.getGroupMembers(groupId, page, limit);
  }

  // Group Posts (Feed)
  @Post('posts')
  createPost(
    @CurrentUser('id') userId: string,
    @Body() createDto: CreateGroupPostDto,
  ) {
    return this.groupsService.createPost(userId, createDto);
  }

  @Get(':groupId/posts')
  getGroupPosts(
    @Param('groupId') groupId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.groupsService.getGroupPosts(groupId, page, limit);
  }

  @Patch('posts/:postId')
  updatePost(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body() updateDto: UpdateGroupPostDto,
  ) {
    return this.groupsService.updatePost(postId, userId, updateDto);
  }

  @Delete('posts/:postId')
  removePost(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.groupsService.removePost(postId, userId);
  }

  // Likes
  @Post('posts/:postId/like')
  likePost(
    @CurrentUser('id') userId: string,
    @Param('postId') postId: string,
  ) {
    return this.groupsService.likePost(userId, postId);
  }

  @Delete('posts/:postId/unlike')
  unlikePost(
    @CurrentUser('id') userId: string,
    @Param('postId') postId: string,
  ) {
    return this.groupsService.unlikePost(userId, postId);
  }

  // Comments
  @Post('posts/:postId/comments')
  createComment(
    @CurrentUser('id') userId: string,
    @Param('postId') postId: string,
    @Body() createDto: CreateCommentDto,
  ) {
    return this.groupsService.createComment(userId, postId, createDto);
  }

  @Get('posts/:postId/comments')
  getPostComments(
    @Param('postId') postId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.groupsService.getPostComments(postId, page, limit);
  }

  @Delete('comments/:commentId')
  removeComment(
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.groupsService.removeComment(commentId, userId);
  }
}
