import {
  Controller, Get, Post, Patch, Put, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus,
  Req, Res, Header,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { InsightsService } from './insights.service';
import { InsightsResearchService } from './insights-research.service';
import { InsightStreamService } from './insights-stream.service';
import { CreateInsightDto } from './dto/create-insight.dto';
import { UpdateInsightDto } from './dto/update-insight.dto';
import { UpsertTeamDto } from './dto/upsert-team.dto';
import { UpsertAiTeamDto } from './dto/upsert-ai-team.dto';
import { UpsertTasksDto } from './dto/upsert-tasks.dto';
import { UpsertDirectionsDto } from './dto/upsert-directions.dto';
import { UpsertReportDto } from './dto/upsert-report.dto';
import { UpsertReferencesDto } from './dto/upsert-references.dto';
import { UpsertCredibilityDto } from './dto/upsert-credibility.dto';
import { StartResearchDto } from './dto/start-research.dto';

@Controller('api/v1/insights')
@UseGuards(JwtAuthGuard)
export class InsightsController {
  constructor(
    private readonly insightsService: InsightsService,
    private readonly researchService: InsightsResearchService,
    private readonly streamService: InsightStreamService,
  ) {}

  // ─── Static routes FIRST (before any :id wildcard) ──────────────────────

  @Get()
  list(@CurrentUser() userId: string) {
    return this.insightsService.listTopics(userId);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateInsightDto) {
    return this.insightsService.createTopic(userId, dto);
  }

  // A1: Health check — must be before @Get(':id')
  @Get('health-check')
  getHealthCheck() {
    return this.insightsService.getHealthCheck();
  }

  // D1: Compare — must be before @Post(':id/*') routes
  @Post('compare')
  compare(@CurrentUser() userId: string, @Body() body: { topicIdA: string; topicIdB: string }) {
    return this.insightsService.compareTopics(userId, body.topicIdA, body.topicIdB);
  }

  // Public share — must be before @Get(':id') to avoid capture
  @Get('share/:token')
  @Public()
  getShared(@Param('token') token: string) {
    return this.insightsService.getSharedInsight(token);
  }

  // ─── Parameterized :id routes ────────────────────────────────────────────

  @Get(':id')
  getDetail(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.insightsService.getDetail(userId, id);
  }

  @Patch(':id')
  update(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: UpdateInsightDto) {
    return this.insightsService.updateTopic(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.insightsService.deleteTopic(userId, id);
  }

  // ─── Sub-table upserts ───────────────────────────────────────────────────

  @Put(':id/team')
  @HttpCode(HttpStatus.NO_CONTENT)
  upsertTeam(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: UpsertTeamDto) {
    return this.insightsService.upsertTeam(userId, id, dto);
  }

  @Put(':id/ai-team')
  @HttpCode(HttpStatus.NO_CONTENT)
  upsertAiTeam(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: UpsertAiTeamDto) {
    return this.insightsService.upsertAiTeam(userId, id, dto);
  }

  @Put(':id/tasks')
  @HttpCode(HttpStatus.NO_CONTENT)
  upsertTasks(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: UpsertTasksDto) {
    return this.insightsService.upsertTasks(userId, id, dto);
  }

  @Put(':id/directions')
  @HttpCode(HttpStatus.NO_CONTENT)
  upsertDirections(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: UpsertDirectionsDto) {
    return this.insightsService.upsertDirections(userId, id, dto);
  }

  @Put(':id/report')
  @HttpCode(HttpStatus.NO_CONTENT)
  upsertReport(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: UpsertReportDto) {
    return this.insightsService.upsertReport(userId, id, dto);
  }

  @Put(':id/references')
  @HttpCode(HttpStatus.NO_CONTENT)
  upsertReferences(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: UpsertReferencesDto) {
    return this.insightsService.upsertReferences(userId, id, dto);
  }

  @Put(':id/credibility')
  @HttpCode(HttpStatus.NO_CONTENT)
  upsertCredibility(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: UpsertCredibilityDto) {
    return this.insightsService.upsertCredibility(userId, id, dto);
  }

  // ─── AI features ─────────────────────────────────────────────────────────

  @Post(':id/plan')
  planDiscussion(@CurrentUser() userId: string, @Param('id') id: string, @Body() body: { modelIds: string[] }) {
    return this.insightsService.runPlanningDiscussion(userId, id, body.modelIds ?? []);
  }

  @Post(':id/suggest-directions')
  suggestDirections(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.insightsService.suggestDirections(userId, id);
  }

  @Post(':id/followup')
  async followup(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() body: { question: string },
    @Res() res: Response,
  ) {
    return this.insightsService.followupStream(userId, id, body.question ?? '', res);
  }

  @Post(':id/share')
  createShare(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.insightsService.getOrCreateShareToken(userId, id);
  }

  // ─── Research lifecycle ──────────────────────────────────────────────────

  @Post(':id/research/start')
  @HttpCode(HttpStatus.ACCEPTED)
  startResearch(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: StartResearchDto) {
    return this.researchService.startResearch(userId, id, dto.useWebSearch ?? false, dto.pauseAfterStages ?? [], dto.quickMode ?? false);
  }

  @Post(':id/research/resume')
  @HttpCode(HttpStatus.ACCEPTED)
  resumeResearch(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() body: { userNotes?: string; modifiedAssignments?: Array<{ directionLabel: string; agentName: string; focus: string; approach: string }> },
  ) {
    return this.researchService.resumeResearch(userId, id, body.userNotes, body.modifiedAssignments);
  }

  @Get(':id/research/status')
  getResearchStatus(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.researchService.getResearchStatus(id);
  }

  @Delete(':id/research')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelResearch(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.researchService.cancelResearch(id);
  }

  // SSE stream — auth via ?token=JWT query param (EventSource cannot send custom headers)
  @Get(':id/research/stream')
  streamResearch(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const token = (req.query.token as string) ?? '';
    const secret = process.env.JWT_SECRET ?? 'changeme';
    try {
      jwt.verify(token, secret);
    } catch {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    this.streamService.addStream(id, res);
  }

  // ─── Export ──────────────────────────────────────────────────────────────

  @Get(':id/export/markdown')
  @Header('Content-Type', 'text/markdown; charset=utf-8')
  async exportMarkdown(@CurrentUser() userId: string, @Param('id') id: string, @Res() res: Response) {
    const detail = await this.insightsService.getDetail(userId, id);
    const md = this.buildMarkdown(detail);
    res.setHeader('Content-Disposition', `attachment; filename="${id}-report.md"`);
    res.end(md);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildMarkdown(detail: any): string {
    const lines: string[] = [
      `# ${detail.title}`,
      `> ${detail.subtitle ?? ''}`,
      '',
      `## Executive Summary`,
      detail.report?.executiveSummary || '',
      '',
      `## Key Findings`,
      ...(detail.deepResearch?.outputs?.keyFindings ?? []).map((f: string) => `- ${f}`),
      '',
      ...(detail.report?.sections ?? []).flatMap((s: any) => [
        `## ${s.title}`,
        s.summary,
        ...(s.highlights ?? []).map((h: string) => `- ${h}`),
        '',
      ]),
      `## References`,
      ...(detail.references ?? []).map((r: any) => `- [${r.title}](https://${r.domain}) (Score: ${r.score}%)`),
    ];
    return lines.join('\n');
  }
}
