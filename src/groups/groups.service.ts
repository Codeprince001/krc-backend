import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateGroupDto,
  UpdateGroupDto,
  CreateGroupPostDto,
  UpdateGroupPostDto,
  CreateCommentDto,
} from './dto/group.dto';
import { Prisma } from '@prisma/client';
import { SlugHelper } from '../common/utils/helpers';

@Injectable()
export class GroupsService {
  constructor(private database: DatabaseService) {}

  // Group Management
  async createGroup(createDto: CreateGroupDto) {
    const slug = SlugHelper.generate(createDto.name);

    const group = await this.database.group.create({
      data: {
        ...createDto,
        slug,
        coverUrl: createDto.coverImage,
      },
    });

    return group;
  }

  async findAllGroups(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [groups, total] = await Promise.all([
      this.database.group.findMany({
        where: { deletedAt: null },
        include: {
          _count: {
            select: { members: true, posts: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.database.group.count({ where: { deletedAt: null } }),
    ]);

    return {
      groups,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneGroup(id: string) {
    const group = await this.database.group.findUnique({
      where: { id },
      include: {
        _count: {
          select: { members: true, posts: true },
        },
      },
    });

    if (!group || group.deletedAt) {
      throw new NotFoundException('Group not found');
    }

    return group;
  }

  async updateGroup(id: string, updateDto: UpdateGroupDto) {
    await this.findOneGroup(id);

    const updateData: any = { ...updateDto };

    if (updateDto.name) {
      updateData.slug = SlugHelper.generate(updateDto.name);
    }

    if (updateDto.coverImage) {
      updateData.coverUrl = updateDto.coverImage;
      delete updateData.coverImage;
    }

    const group = await this.database.group.update({
      where: { id },
      data: updateData,
    });

    return group;
  }

  async removeGroup(id: string) {
    await this.findOneGroup(id);

    await this.database.group.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Group deleted successfully' };
  }

  // Group Membership
  async joinGroup(userId: string, groupId: string) {
    const group = await this.findOneGroup(groupId);

    // Check if already a member
    const existingMembership = await this.database.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (existingMembership) {
      throw new BadRequestException('You are already a member of this group');
    }

    const membership = await this.database.groupMember.create({
      data: {
        userId,
        groupId,
      },
      include: {
        group: true,
      },
    });

    return membership;
  }

  async leaveGroup(userId: string, groupId: string) {
    const membership = await this.database.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('You are not a member of this group');
    }

    await this.database.groupMember.delete({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    return { message: 'Left group successfully' };
  }

  async getGroupMembers(groupId: string, page: number = 1, limit: number = 50) {
    await this.findOneGroup(groupId);

    const skip = (page - 1) * limit;

    const [members, total] = await Promise.all([
      this.database.groupMember.findMany({
        where: { groupId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { joinedAt: 'desc' },
      }),
      this.database.groupMember.count({ where: { groupId } }),
    ]);

    return {
      members,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserGroups(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [memberships, total] = await Promise.all([
      this.database.groupMember.findMany({
        where: { userId },
        include: {
          group: {
            include: {
              _count: {
                select: { members: true, posts: true },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { joinedAt: 'desc' },
      }),
      this.database.groupMember.count({ where: { userId } }),
    ]);

    return {
      groups: memberships.map((m) => m.group),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Group Posts (Feed)
  async createPost(userId: string, createDto: CreateGroupPostDto) {
    const group = await this.findOneGroup(createDto.groupId);

    // Verify user is a member
    const membership = await this.database.groupMember.findUnique({
      where: {
        groupId_userId: {
          userId,
          groupId: createDto.groupId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You must be a member to post in this group');
    }

    const post = await this.database.groupPost.create({
      data: {
        userId,
        groupId: createDto.groupId,
        content: createDto.content,
        type: createDto.type,
        mediaUrl: createDto.mediaUrl,
        videoUrl: createDto.mediaUrl, // If it's a video, set videoUrl
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    return post;
  }

  async getGroupPosts(groupId: string, page: number = 1, limit: number = 20) {
    await this.findOneGroup(groupId);

    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.database.groupPost.findMany({
        where: {
          groupId,
          deletedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          _count: {
            select: { likes: true, comments: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.database.groupPost.count({
        where: { groupId, deletedAt: null },
      }),
    ]);

    return {
      posts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updatePost(
    postId: string,
    userId: string,
    updateDto: UpdateGroupPostDto,
  ) {
    const post = await this.database.groupPost.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    const updatedPost = await this.database.groupPost.update({
      where: { id: postId },
      data: updateDto,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    return updatedPost;
  }

  async removePost(postId: string, userId: string) {
    const post = await this.database.groupPost.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.database.groupPost.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });

    return { message: 'Post deleted successfully' };
  }

  // Likes
  async likePost(userId: string, postId: string) {
    const post = await this.database.groupPost.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    // Upsert like
    const like = await this.database.groupPostLike.upsert({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
      update: {},
      create: {
        userId,
        postId,
      },
    });

    return like;
  }

  async unlikePost(userId: string, postId: string) {
    const like = await this.database.groupPostLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (!like) {
      throw new NotFoundException('Like not found');
    }

    await this.database.groupPostLike.delete({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    return { message: 'Post unliked successfully' };
  }

  // Comments
  async createComment(
    userId: string,
    postId: string,
    createDto: CreateCommentDto,
  ) {
    const post = await this.database.groupPost.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    const comment = await this.database.groupPostComment.create({
      data: {
        userId,
        postId,
        content: createDto.content,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return comment;
  }

  async getPostComments(postId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.database.groupPostComment.findMany({
        where: {
          postId,
          deletedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.database.groupPostComment.count({
        where: { postId, deletedAt: null },
      }),
    ]);

    return {
      comments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async removeComment(commentId: string, userId: string) {
    const comment = await this.database.groupPostComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.deletedAt) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.database.groupPostComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    return { message: 'Comment deleted successfully' };
  }
}
