import {Module} from '@nestjs/common';
import {HomeIssuesController} from './home-issues.controller.js';
import {HomeIssuesService} from './home-issues.service.js';
@Module({controllers: [HomeIssuesController], providers: [HomeIssuesService]})
export class HomeIssuesModule {}
