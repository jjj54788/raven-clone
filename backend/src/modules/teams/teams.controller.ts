import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateAssistantDto } from './dto/create-assistant.dto';
import { UpdateAssistantDto } from './dto/update-assistant.dto';
import { CreateMissionDto } from './dto/create-mission.dto';

@Controller('api/v1/teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  // ---- Teams ----

  @Get()
  listTeams(@CurrentUser() userId: string) {
    return this.teamsService.listTeams(userId);
  }

  @Post()
  createTeam(@CurrentUser() userId: string, @Body() body: CreateTeamDto) {
    return this.teamsService.createTeam(userId, body);
  }

  @Get(':id')
  getTeam(@CurrentUser() userId: string, @Param('id') teamId: string) {
    return this.teamsService.getTeam(userId, teamId);
  }

  @Patch(':id')
  updateTeam(@CurrentUser() userId: string, @Param('id') teamId: string, @Body() body: UpdateTeamDto) {
    return this.teamsService.updateTeam(userId, teamId, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTeam(@CurrentUser() userId: string, @Param('id') teamId: string) {
    return this.teamsService.deleteTeam(userId, teamId);
  }

  // ---- Members ----

  @Post(':id/members')
  addMember(@CurrentUser() userId: string, @Param('id') teamId: string, @Body() body: AddMemberDto) {
    return this.teamsService.addMember(userId, teamId, body);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @CurrentUser() userId: string,
    @Param('id') teamId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.teamsService.removeMember(userId, teamId, targetUserId);
  }

  // ---- Assistants ----

  @Get(':id/assistants')
  listAssistants(@CurrentUser() userId: string, @Param('id') teamId: string) {
    return this.teamsService.listAssistants(userId, teamId);
  }

  @Post(':id/assistants')
  createAssistant(@CurrentUser() userId: string, @Param('id') teamId: string, @Body() body: CreateAssistantDto) {
    return this.teamsService.createAssistant(userId, teamId, body);
  }

  @Patch(':id/assistants/:assistantId')
  updateAssistant(
    @CurrentUser() userId: string,
    @Param('id') teamId: string,
    @Param('assistantId') assistantId: string,
    @Body() body: UpdateAssistantDto,
  ) {
    return this.teamsService.updateAssistant(userId, teamId, assistantId, body);
  }

  @Delete(':id/assistants/:assistantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAssistant(
    @CurrentUser() userId: string,
    @Param('id') teamId: string,
    @Param('assistantId') assistantId: string,
  ) {
    return this.teamsService.deleteAssistant(userId, teamId, assistantId);
  }

  // ---- Missions ----

  @Get(':id/missions')
  listMissions(@CurrentUser() userId: string, @Param('id') teamId: string) {
    return this.teamsService.listMissions(userId, teamId);
  }

  @Post(':id/missions')
  createMission(@CurrentUser() userId: string, @Param('id') teamId: string, @Body() body: CreateMissionDto) {
    return this.teamsService.createMission(userId, teamId, body);
  }

  @Get(':id/missions/:missionId')
  getMission(
    @CurrentUser() userId: string,
    @Param('id') teamId: string,
    @Param('missionId') missionId: string,
  ) {
    return this.teamsService.getMission(userId, teamId, missionId);
  }
}
