import {Injectable, NotFoundException} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service.js';
import type {CreateIssueDto, UpdateIssueDto} from './dto.js';

const issueInclude = {createdBy: {select: {id: true, name: true}}, handledBy: {select: {id: true, name: true}}} as const;
@Injectable()
export class HomeIssuesService {
  constructor(private readonly prisma: PrismaService) {}
  list(householdId: string) { return this.prisma.homeIssue.findMany({where: {householdId}, include: issueInclude, orderBy: [{status: 'asc'}, {updatedAt: 'desc'}]}); }
  async create(householdId: string, userId: string, dto: CreateIssueDto) {
    const issue = await this.prisma.homeIssue.create({data: {householdId, createdById: userId, title: dto.title.trim(), visualKey: dto.visualKey ?? 'repair'}, include: issueInclude});
    await this.prisma.activity.create({data: {householdId, actorId: userId, type: 'ISSUE_ADDED', subjectName: issue.title}});
    return issue;
  }
  async update(householdId: string, userId: string, id: string, dto: UpdateIssueDto) {
    const existing = await this.prisma.homeIssue.findFirst({where: {id, householdId}});
    if (!existing) throw new NotFoundException('Home issue not found');
    const issue = await this.prisma.homeIssue.update({where: {id: existing.id}, data: {
      status: dto.status,
      handledById: dto.status === 'IN_PROGRESS' ? userId : dto.status === 'OPEN' ? null : existing.handledById ?? userId,
      resolvedAt: dto.status === 'RESOLVED' ? new Date() : null,
    }, include: issueInclude});
    const type = dto.status === 'RESOLVED' ? 'ISSUE_RESOLVED' : dto.status === 'IN_PROGRESS' ? 'ISSUE_CLAIMED' : 'ISSUE_REOPENED';
    await this.prisma.activity.create({data: {householdId, actorId: userId, type, subjectName: issue.title}});
    return issue;
  }
}
