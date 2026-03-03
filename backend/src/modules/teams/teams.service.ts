import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateAssistantDto } from './dto/create-assistant.dto';
import { UpdateAssistantDto } from './dto/update-assistant.dto';
import { CreateMissionDto } from './dto/create-mission.dto';
import { Prisma, TeamMemberRole, TeamStatus, TeamAssistantStatus } from '@prisma/client';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Teams ----

  async createTeam(userId: string, dto: CreateTeamDto) {
    const team = await this.prisma.team.create({
      data: {
        ownerUserId: userId,
        name: dto.name,
        description: dto.description,
        tags: dto.tags ?? [],
        isPublic: dto.isPublic ?? false,
        ...(dto.goal !== undefined && { goal: dto.goal }),
        members: {
          create: { userId, role: TeamMemberRole.OWNER },
        },
      },
      include: { _count: { select: { members: true, assistants: true, missions: true } } },
    });
    return team;
  }

  async listTeams(userId: string) {
    return this.prisma.team.findMany({
      where: {
        members: { some: { userId } },
      },
      include: { _count: { select: { members: true, assistants: true, missions: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTeam(userId: string, teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        assistants: { orderBy: [{ isLeader: 'desc' }, { sortOrder: 'asc' }] },
        _count: { select: { missions: true } },
      },
    });
    if (!team) throw new NotFoundException('Team not found');
    if (!team.isPublic) await this.assertMember(userId, teamId);
    return team;
  }

  async updateTeam(userId: string, teamId: string, dto: UpdateTeamDto) {
    await this.assertOwnerOrMember(userId, teamId, true);
    return this.prisma.team.update({
      where: { id: teamId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
        ...(dto.goal !== undefined && { goal: dto.goal }),
        ...(dto.status !== undefined && { status: dto.status as TeamStatus }),
        ...(dto.canvasJson !== undefined && { canvasJson: dto.canvasJson as Prisma.InputJsonValue }),
      },
    });
  }

  async deleteTeam(userId: string, teamId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId }, select: { ownerUserId: true } });
    if (!team) throw new NotFoundException('Team not found');
    if (team.ownerUserId !== userId) throw new ForbiddenException('Only the owner can delete a team');
    await this.prisma.team.delete({ where: { id: teamId } });
  }

  // ---- Members ----

  async addMember(userId: string, teamId: string, dto: AddMemberDto) {
    await this.assertOwnerOrMember(userId, teamId, true);
    const targetUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      select: { id: true },
    });
    if (!targetUser) throw new NotFoundException('User not found with that email');
    const existing = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: targetUser.id } },
    });
    if (existing) throw new BadRequestException('User is already a member');
    return this.prisma.teamMember.create({
      data: { teamId, userId: targetUser.id, role: dto.role ?? TeamMemberRole.MEMBER },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });
  }

  async removeMember(userId: string, teamId: string, targetUserId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId }, select: { ownerUserId: true } });
    if (!team) throw new NotFoundException('Team not found');
    if (team.ownerUserId !== userId && userId !== targetUserId) {
      throw new ForbiddenException('Only the owner can remove other members');
    }
    if (team.ownerUserId === targetUserId) {
      throw new BadRequestException('Cannot remove the team owner');
    }
    await this.prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });
  }

  // ---- Assistants ----

  async listAssistants(userId: string, teamId: string) {
    await this.assertMember(userId, teamId);
    return this.prisma.teamAssistant.findMany({
      where: { teamId },
      orderBy: [{ isLeader: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  async createAssistant(userId: string, teamId: string, dto: CreateAssistantDto) {
    await this.assertOwnerOrMember(userId, teamId, true);
    return this.prisma.teamAssistant.create({
      data: {
        team: { connect: { id: teamId } },
        displayName: dto.displayName,
        modelId: dto.modelId,
        provider: dto.provider,
        roleTitle: dto.roleTitle,
        roleDescription: dto.roleDescription,
        isLeader: dto.isLeader ?? false,
        sortOrder: dto.sortOrder ?? 0,
        ...(dto.catalogId !== undefined && { catalogId: dto.catalogId }),
        ...(dto.iconText !== undefined && { iconText: dto.iconText }),
        ...(dto.accent !== undefined && { accent: dto.accent }),
        ...(dto.asStatus !== undefined && { asStatus: dto.asStatus as TeamAssistantStatus }),
      },
    });
  }

  async updateAssistant(userId: string, teamId: string, assistantId: string, dto: UpdateAssistantDto) {
    await this.assertOwnerOrMember(userId, teamId, true);
    const assistant = await this.prisma.teamAssistant.findFirst({
      where: { id: assistantId, teamId },
    });
    if (!assistant) throw new NotFoundException('Assistant not found');
    return this.prisma.teamAssistant.update({
      where: { id: assistantId },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.roleTitle !== undefined && { roleTitle: dto.roleTitle }),
        ...(dto.roleDescription !== undefined && { roleDescription: dto.roleDescription }),
        ...(dto.isLeader !== undefined && { isLeader: dto.isLeader }),
        ...(dto.asStatus !== undefined && { asStatus: dto.asStatus as TeamAssistantStatus }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async deleteAssistant(userId: string, teamId: string, assistantId: string) {
    await this.assertOwnerOrMember(userId, teamId, true);
    const assistant = await this.prisma.teamAssistant.findFirst({
      where: { id: assistantId, teamId },
    });
    if (!assistant) throw new NotFoundException('Assistant not found');
    await this.prisma.teamAssistant.delete({ where: { id: assistantId } });
  }

  // ---- Missions ----

  async listMissions(userId: string, teamId: string) {
    await this.assertMember(userId, teamId);
    return this.prisma.teamMission.findMany({
      where: { teamId },
      include: {
        leaderAssistant: { select: { id: true, displayName: true, isLeader: true } },
        _count: { select: { tasks: true, activities: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMission(userId: string, teamId: string, dto: CreateMissionDto) {
    await this.assertMember(userId, teamId);
    return this.prisma.teamMission.create({
      data: {
        teamId,
        title: dto.title,
        description: dto.description,
        leaderAssistantId: dto.leaderAssistantId,
        notificationEmail: dto.notificationEmail,
      },
    });
  }

  async getMission(userId: string, teamId: string, missionId: string) {
    await this.assertMember(userId, teamId);
    const mission = await this.prisma.teamMission.findFirst({
      where: { id: missionId, teamId },
      include: {
        leaderAssistant: true,
        tasks: { orderBy: { sortOrder: 'asc' } },
        activities: { orderBy: { createdAt: 'desc' }, take: 50 },
        sources: true,
      },
    });
    if (!mission) throw new NotFoundException('Mission not found');
    return mission;
  }

  // ---- Helpers ----

  private async assertMember(userId: string, teamId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId }, select: { id: true } });
    if (!team) throw new NotFoundException('Team not found');
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!membership) throw new ForbiddenException('Not a team member');
  }

  private async assertOwnerOrMember(userId: string, teamId: string, requireOwner = false) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId }, select: { ownerUserId: true } });
    if (!team) throw new NotFoundException('Team not found');
    if (requireOwner) {
      const membership = await this.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId } },
        select: { role: true },
      });
      if (!membership) throw new ForbiddenException('Not a team member');
      if (membership.role !== TeamMemberRole.OWNER) throw new ForbiddenException('Only team owners can perform this action');
    } else {
      await this.assertMember(userId, teamId);
    }
  }
}
